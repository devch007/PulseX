import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Alert, Category, Settings, Status, Task, WeeklyReport } from '../types'
import { DEFAULT_CATEGORIES } from '../lib/categories'
import { uid } from '../lib/ids'
import { buildSampleTasks } from '../lib/sampleData'
import { nextOccurrence, fromISO } from '../lib/dates'

export const DEFAULT_SETTINGS: Settings = {
  userName: '',
  managerName: '',
  managerEmail: '',
  workingDays: [1, 2, 3, 4, 5, 6],
  workStart: '09:00',
  workEnd: '18:00',
  theme: 'system',
  notifications: {
    enabled: false,
    reminders: true,
    overdue: true,
    morningSummary: true,
    morningTime: '09:30',
    fridayReminder: true,
    fridayTime: '16:00',
    defaultReminderMinutes: 15,
  },
}

export interface BackupFile {
  app: 'pulsex'
  version: 1
  exportedAt: string
  tasks: Task[]
  categories: Category[]
  settings: Settings
  reports: WeeklyReport[]
  alerts: Alert[]
}

interface State {
  tasks: Task[]
  categories: Category[]
  settings: Settings
  reports: WeeklyReport[]
  alerts: Alert[]
  /** notification keys that already fired → timestamp */
  fired: Record<string, number>
  hydrated: boolean
  onboarded: boolean
  user: { id: string; email: string } | null
  sync: { status: 'local' | 'syncing' | 'synced' | 'offline' | 'error'; lastAt?: string; message?: string }
  setOnboarded: (v: boolean) => void
  setUser: (u: { id: string; email: string } | null) => void
  setSync: (s: Partial<State['sync']>) => void
  /** Replace data wholesale (used by cloud sync when pulling) */
  replaceData: (d: Partial<Pick<State, 'tasks' | 'categories' | 'reports' | 'settings'>>) => void

  addTask: (t: Omit<Task, 'id' | 'createdAt'> & Partial<Pick<Task, 'id' | 'createdAt'>>) => Task
  updateTask: (id: string, patch: Partial<Task>) => void
  deleteTask: (id: string) => void
  setStatus: (id: string, status: Status) => void
  toggleDone: (id: string) => void
  clearSamples: () => void
  loadSamples: () => void

  addCategory: (name: string, color: string) => Category
  updateCategory: (id: string, patch: Partial<Category>) => void
  deleteCategory: (id: string) => void

  updateSettings: (patch: Partial<Settings>) => void
  updateNotificationSettings: (patch: Partial<Settings['notifications']>) => void

  saveReport: (r: Omit<WeeklyReport, 'id' | 'createdAt'>) => WeeklyReport
  deleteReport: (id: string) => void

  pushAlert: (a: Omit<Alert, 'id' | 'createdAt' | 'read'>) => Alert
  markAlertsRead: () => void
  clearAlerts: () => void
  markFired: (key: string) => void
  hasFired: (key: string) => boolean

  exportData: () => BackupFile
  importData: (b: BackupFile, mode: 'replace' | 'merge') => void
  resetAll: () => void
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      tasks: buildSampleTasks(),
      categories: DEFAULT_CATEGORIES,
      settings: DEFAULT_SETTINGS,
      reports: [],
      alerts: [],
      fired: {},
      hydrated: false,
      onboarded: false,
      user: null,
      sync: { status: 'local' },
      setOnboarded: (onboarded) => set({ onboarded }),
      setUser: (user) => set({ user }),
      setSync: (patch) => set((st) => ({ sync: { ...st.sync, ...patch } })),
      replaceData: (d) => set((st) => ({ ...st, ...d })),

      addTask: (t) => {
        const task: Task = { id: uid(), createdAt: new Date().toISOString(), ...t, updatedAt: new Date().toISOString() }
        set((s) => ({ tasks: [task, ...s.tasks] }))
        return task
      },
      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t)) })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      setStatus: (id, status) => {
        const s = get()
        const task = s.tasks.find((t) => t.id === id)
        if (!task) return
        if (status === 'done' && task.status !== 'done') {
          const completedAt = new Date().toISOString()
          const spawned: Task[] = []
          if (task.recurrence.freq !== 'none' && task.dueAt) {
            const next = nextOccurrence(fromISO(task.dueAt), task.recurrence)
            if (next) {
              spawned.push({
                ...task,
                id: uid(),
                status: 'todo',
                dueAt: next.toISOString(),
                completedAt: undefined,
                timeSpent: undefined,
                blocked: false,
                createdAt: completedAt,
                seriesId: task.seriesId ?? task.id,
                sample: task.sample,
              })
            }
          }
          set((st) => ({
            tasks: [
              ...spawned,
              ...st.tasks.map((t) => (t.id === id ? { ...t, status: 'done' as Status, completedAt, updatedAt: completedAt } : t)),
            ],
          }))
        } else {
          set((st) => ({
            tasks: st.tasks.map((t) =>
              t.id === id ? { ...t, status, completedAt: status === 'done' ? t.completedAt : undefined, updatedAt: new Date().toISOString() } : t,
            ),
          }))
        }
      },
      toggleDone: (id) => {
        const t = get().tasks.find((x) => x.id === id)
        if (!t) return
        get().setStatus(id, t.status === 'done' ? 'todo' : 'done')
      },
      clearSamples: () => set((s) => ({ tasks: s.tasks.filter((t) => !t.sample) })),
      loadSamples: () => set((s) => ({ tasks: [...buildSampleTasks(), ...s.tasks.filter((t) => !t.sample)] })),

      addCategory: (name, color) => {
        const c: Category = { id: uid(), name, color }
        set((s) => ({ categories: [...s.categories, c] }))
        return c
      },
      updateCategory: (id, patch) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCategory: (id) =>
        set((s) => {
          const fallback = s.categories.find((c) => c.id !== id)?.id ?? 'admin'
          return {
            categories: s.categories.filter((c) => c.id !== id),
            tasks: s.tasks.map((t) => (t.categoryId === id ? { ...t, categoryId: fallback } : t)),
          }
        }),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      updateNotificationSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, notifications: { ...s.settings.notifications, ...patch } } })),

      saveReport: (r) => {
        const report: WeeklyReport = { id: uid(), createdAt: new Date().toISOString(), ...r }
        set((s) => ({ reports: [report, ...s.reports].slice(0, 60) }))
        return report
      },
      deleteReport: (id) => set((s) => ({ reports: s.reports.filter((r) => r.id !== id) })),

      pushAlert: (a) => {
        const alert: Alert = { id: uid(), createdAt: new Date().toISOString(), read: false, ...a }
        set((s) => ({ alerts: [alert, ...s.alerts].slice(0, 50) }))
        return alert
      },
      markAlertsRead: () => set((s) => ({ alerts: s.alerts.map((a) => ({ ...a, read: true })) })),
      clearAlerts: () => set({ alerts: [] }),
      markFired: (key) =>
        set((s) => {
          const cutoff = Date.now() - 14 * 86400000
          const fired: Record<string, number> = {}
          for (const [k, v] of Object.entries(s.fired)) if (v > cutoff) fired[k] = v
          fired[key] = Date.now()
          return { fired }
        }),
      hasFired: (key) => key in get().fired,

      exportData: () => {
        const s = get()
        return {
          app: 'pulsex',
          version: 1,
          exportedAt: new Date().toISOString(),
          tasks: s.tasks,
          categories: s.categories,
          settings: s.settings,
          reports: s.reports,
          alerts: s.alerts,
        }
      },
      importData: (b, mode) => {
        if (mode === 'replace') {
          set({
            tasks: b.tasks ?? [],
            categories: b.categories?.length ? b.categories : DEFAULT_CATEGORIES,
            settings: { ...DEFAULT_SETTINGS, ...(b.settings ?? {}), notifications: { ...DEFAULT_SETTINGS.notifications, ...(b.settings?.notifications ?? {}) } },
            reports: b.reports ?? [],
            alerts: b.alerts ?? [],
          })
        } else {
          set((s) => {
            const ids = new Set(s.tasks.map((t) => t.id))
            const cids = new Set(s.categories.map((c) => c.id))
            const rids = new Set(s.reports.map((r) => r.id))
            return {
              tasks: [...(b.tasks ?? []).filter((t) => !ids.has(t.id)), ...s.tasks],
              categories: [...s.categories, ...(b.categories ?? []).filter((c) => !cids.has(c.id))],
              reports: [...(b.reports ?? []).filter((r) => !rids.has(r.id)), ...s.reports],
            }
          })
        }
      },
      resetAll: () =>
        set((st) => ({ tasks: [], categories: DEFAULT_CATEGORIES, settings: { ...DEFAULT_SETTINGS, theme: st.settings.theme }, reports: [], alerts: [], fired: {} })),
    }),
    {
      name: 'pulsex-store',
      version: 1,
      partialize: (s) => ({
        tasks: s.tasks, categories: s.categories, settings: s.settings, reports: s.reports, alerts: s.alerts, fired: s.fired,
        onboarded: s.onboarded, user: s.user,
      }),
      onRehydrateStorage: () => (state) => {
        state && useStore.setState({ hydrated: true })
      },
    },
  ),
)

/* ---------- selectors / derived helpers ---------- */
export const useCategory = (id: string) => useStore((s) => s.categories.find((c) => c.id === id))
export const categoryOf = (cats: Category[], id: string): Category =>
  cats.find((c) => c.id === id) ?? { id, name: 'Uncategorised', color: '#9095a8' }
