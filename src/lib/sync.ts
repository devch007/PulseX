/**
 * Offline-first sync between the local zustand store and Supabase.
 *  - pull(): fetch everything for the signed-in user and merge into local state
 *  - a store subscriber diffs each change and queues upserts/deletes (debounced)
 *  - realtime channel applies changes made on other devices
 */
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { useStore } from '../store/useStore'
import type { Category, Settings, Task, WeeklyReport } from '../types'
import { DEFAULT_CATEGORIES } from './categories'

type Row = Record<string, unknown>
let uid: string | null = null
let channel: RealtimeChannel | null = null
let unsubscribe: (() => void) | null = null
let applyingRemote = false
let timer: number | null = null
const queue = new Map<string, { table: string; op: 'upsert' | 'delete'; row: Row }>()

/* ---------- row mappers ---------- */
const taskToRow = (t: Task): Row => ({
  user_id: uid, id: t.id, title: t.title, notes: t.notes ?? null, category_id: t.categoryId, priority: t.priority, status: t.status,
  due_at: t.dueAt ?? null, time_spent: t.timeSpent ?? null, reminder_minutes: t.reminderMinutes ?? 15, recurrence: t.recurrence ?? { freq: 'none' },
  blocked: !!t.blocked, series_id: t.seriesId ?? null, sample: !!t.sample, created_at: t.createdAt, completed_at: t.completedAt ?? null,
})
const rowToTask = (r: Row): Task => ({
  id: r.id as string, title: r.title as string, notes: (r.notes as string) ?? undefined, categoryId: r.category_id as string,
  priority: r.priority as Task['priority'], status: r.status as Task['status'], dueAt: (r.due_at as string) ?? undefined,
  timeSpent: (r.time_spent as number) ?? undefined, reminderMinutes: (r.reminder_minutes as number) ?? 15,
  recurrence: (r.recurrence as Task['recurrence']) ?? { freq: 'none' }, blocked: !!r.blocked, seriesId: (r.series_id as string) ?? undefined,
  sample: !!r.sample, createdAt: r.created_at as string, completedAt: (r.completed_at as string) ?? undefined, updatedAt: r.updated_at as string,
})
const catToRow = (c: Category, i: number): Row => ({ user_id: uid, id: c.id, name: c.name, color: c.color, built_in: !!c.builtIn, position: i })
const rowToCat = (r: Row): Category => ({ id: r.id as string, name: r.name as string, color: r.color as string, builtIn: !!r.built_in })
const reportToRow = (r: WeeklyReport): Row => ({
  user_id: uid, id: r.id, week_start: r.weekStart, week_end: r.weekEnd, subject: r.subject, text: r.text, stats: r.stats, created_at: r.createdAt,
})
const rowToReport = (r: Row): WeeklyReport => ({
  id: r.id as string, weekStart: r.week_start as string, weekEnd: r.week_end as string, subject: r.subject as string, text: r.text as string,
  stats: r.stats as WeeklyReport['stats'], createdAt: r.created_at as string,
})

/* ---------- queue / flush ---------- */
const enqueue = (table: string, op: 'upsert' | 'delete', row: Row) => {
  queue.set(`${table}:${row.id}`, { table, op, row })
  if (timer) window.clearTimeout(timer)
  timer = window.setTimeout(flush, 500)
}

export const flush = async () => {
  if (!supabase || !uid || queue.size === 0) return
  const batch = [...queue.values()]
  queue.clear()
  useStore.getState().setSync({ status: 'syncing' })
  try {
    const byTable = new Map<string, { upserts: Row[]; deletes: string[] }>()
    for (const b of batch) {
      const e = byTable.get(b.table) ?? { upserts: [], deletes: [] }
      b.op === 'upsert' ? e.upserts.push(b.row) : e.deletes.push(b.row.id as string)
      byTable.set(b.table, e)
    }
    for (const [table, e] of byTable) {
      if (e.upserts.length) {
        const { error } = await supabase.from(table).upsert(e.upserts, { onConflict: table === 'profiles' ? 'id' : 'user_id,id' })
        if (error) throw error
      }
      if (e.deletes.length) {
        const { error } = await supabase.from(table).delete().eq('user_id', uid).in('id', e.deletes)
        if (error) throw error
      }
    }
    useStore.getState().setSync({ status: 'synced', lastAt: new Date().toISOString(), message: undefined })
  } catch (err) {
    // put the batch back and retry later
    for (const b of batch) queue.set(`${b.table}:${b.row.id}`, b)
    useStore.getState().setSync({ status: navigator.onLine ? 'error' : 'offline', message: (err as Error).message })
    timer = window.setTimeout(flush, 8000)
  }
}

/* ---------- local → cloud diffing ---------- */
type Snap = { tasks: Map<string, Task>; cats: Map<string, Category>; reports: Map<string, WeeklyReport>; settings: Settings; catList: Category[] }
const snapshot = (): Snap => {
  const s = useStore.getState()
  return {
    tasks: new Map(s.tasks.map((t) => [t.id, t])), cats: new Map(s.categories.map((c) => [c.id, c])),
    reports: new Map(s.reports.map((r) => [r.id, r])), settings: s.settings, catList: s.categories,
  }
}
let prev: Snap | null = null

const watchStore = () => {
  prev = snapshot()
  return useStore.subscribe((s) => {
    if (!uid || !prev) return
    const next = snapshot()
    if (applyingRemote) { prev = next; return }
    for (const t of s.tasks) if (prev.tasks.get(t.id) !== t) enqueue('tasks', 'upsert', taskToRow(t))
    for (const id of prev.tasks.keys()) if (!next.tasks.has(id)) enqueue('tasks', 'delete', { id })
    if (s.categories !== prev.catList) {
      s.categories.forEach((c, i) => { if (prev!.cats.get(c.id) !== c || prev!.catList[i]?.id !== c.id) enqueue('categories', 'upsert', catToRow(c, i)) })
      for (const id of prev.cats.keys()) if (!next.cats.has(id)) enqueue('categories', 'delete', { id })
    }
    for (const r of s.reports) if (prev.reports.get(r.id) !== r) enqueue('reports', 'upsert', reportToRow(r))
    for (const id of prev.reports.keys()) if (!next.reports.has(id)) enqueue('reports', 'delete', { id })
    if (s.settings !== prev.settings) enqueue('profiles', 'upsert', { id: uid, email: s.user?.email ?? null, settings: s.settings })
    prev = next
  })
}

/* ---------- cloud → local ---------- */
const applyRemote = (fn: () => void) => {
  applyingRemote = true
  try { fn() } finally { applyingRemote = false; prev = snapshot() }
}

/** Fetch the user's data and merge. Local-only tasks that the cloud does not know about are uploaded. */
export const pull = async () => {
  if (!supabase || !uid) return
  useStore.getState().setSync({ status: 'syncing' })
  const [tasks, cats, reports, profile] = await Promise.all([
    supabase.from('tasks').select('*').eq('user_id', uid),
    supabase.from('categories').select('*').eq('user_id', uid).order('position'),
    supabase.from('reports').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
  ])
  const err = tasks.error ?? cats.error ?? reports.error ?? profile.error
  if (err) { useStore.getState().setSync({ status: 'error', message: err.message }); throw err }

  const local = useStore.getState()
  const remoteTasks = (tasks.data ?? []).map(rowToTask)
  const remoteCats = (cats.data ?? []).map(rowToCat)
  const remoteReports = (reports.data ?? []).map(rowToReport)
  const remoteSettings = (profile.data?.settings ?? null) as Partial<Settings> | null
  const cloudIsEmpty = remoteTasks.length === 0 && remoteCats.length === 0

  const remoteIds = new Set(remoteTasks.map((t) => t.id))
  // keep local tasks the cloud has never seen (first sign-in migration). Samples only migrate into an empty account.
  const localExtras = local.tasks.filter((t) => !remoteIds.has(t.id) && (cloudIsEmpty || !t.sample))
  const mergedTasks = [...localExtras, ...remoteTasks]
  const mergedCats = cloudIsEmpty ? (local.categories.length ? local.categories : DEFAULT_CATEGORIES) : remoteCats
  const localCatIds = new Set(mergedCats.map((c) => c.id))
  for (const c of local.categories) if (!localCatIds.has(c.id) && mergedTasks.some((t) => t.categoryId === c.id)) mergedCats.push(c)
  const mergedReports = [...local.reports.filter((r) => !remoteReports.some((x) => x.id === r.id)), ...remoteReports]
  const hasRemoteSettings = remoteSettings && Object.keys(remoteSettings).length > 0
  const mergedSettings: Settings = hasRemoteSettings
    ? { ...local.settings, ...remoteSettings, notifications: { ...local.settings.notifications, ...(remoteSettings!.notifications ?? {}) } }
    : local.settings

  applyRemote(() => local.replaceData({ tasks: mergedTasks, categories: mergedCats, reports: mergedReports, settings: mergedSettings }))

  // upload whatever the cloud is missing
  for (const t of localExtras) enqueue('tasks', 'upsert', taskToRow(t))
  if (cloudIsEmpty) mergedCats.forEach((c, i) => enqueue('categories', 'upsert', catToRow(c, i)))
  for (const r of mergedReports) if (!remoteReports.some((x) => x.id === r.id)) enqueue('reports', 'upsert', reportToRow(r))
  if (!hasRemoteSettings) enqueue('profiles', 'upsert', { id: uid, email: local.user?.email ?? null, settings: mergedSettings })
  await flush()
  useStore.getState().setSync({ status: 'synced', lastAt: new Date().toISOString(), message: undefined })
}

const subscribeRealtime = () => {
  if (!supabase || !uid) return
  channel = supabase
    .channel(`pulsex:${uid}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${uid}` }, (p) => {
      const s = useStore.getState()
      applyRemote(() => {
        if (p.eventType === 'DELETE') s.replaceData({ tasks: s.tasks.filter((t) => t.id !== (p.old as Row).id) })
        else {
          const t = rowToTask(p.new as Row)
          const cur = s.tasks.find((x) => x.id === t.id)
          if (cur && cur.updatedAt && t.updatedAt && cur.updatedAt > t.updatedAt) return
          s.replaceData({ tasks: cur ? s.tasks.map((x) => (x.id === t.id ? t : x)) : [t, ...s.tasks] })
        }
      })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${uid}` }, (p) => {
      const s = useStore.getState()
      applyRemote(() => {
        if (p.eventType === 'DELETE') s.replaceData({ categories: s.categories.filter((c) => c.id !== (p.old as Row).id) })
        else {
          const c = rowToCat(p.new as Row)
          s.replaceData({ categories: s.categories.some((x) => x.id === c.id) ? s.categories.map((x) => (x.id === c.id ? c : x)) : [...s.categories, c] })
        }
      })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reports', filter: `user_id=eq.${uid}` }, (p) => {
      const s = useStore.getState()
      applyRemote(() => {
        if (p.eventType === 'DELETE') s.replaceData({ reports: s.reports.filter((r) => r.id !== (p.old as Row).id) })
        else {
          const r = rowToReport(p.new as Row)
          s.replaceData({ reports: s.reports.some((x) => x.id === r.id) ? s.reports.map((x) => (x.id === r.id ? r : x)) : [r, ...s.reports] })
        }
      })
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` }, (p) => {
      const s = useStore.getState()
      const remote = (p.new as Row).settings as Partial<Settings> | null
      if (!remote) return
      applyRemote(() => s.replaceData({ settings: { ...s.settings, ...remote, notifications: { ...s.settings.notifications, ...(remote.notifications ?? {}) } } }))
    })
    .subscribe()
}

/* ---------- lifecycle ---------- */
export const startSync = async (userId: string) => {
  if (!supabase) return
  if (uid === userId && unsubscribe) return
  stopSync()
  uid = userId
  try {
    await pull()
  } catch {
    /* status already set */
  }
  unsubscribe = watchStore()
  subscribeRealtime()
  window.addEventListener('online', flush)
}

export const stopSync = () => {
  unsubscribe?.(); unsubscribe = null
  if (channel) { supabase?.removeChannel(channel); channel = null }
  window.removeEventListener('online', flush)
  queue.clear()
  uid = null
  prev = null
}

export const isSyncing = () => !!uid
