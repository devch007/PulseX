import { addDays, format } from 'date-fns'
import type { Category, Settings, Task } from '../types'
import { fmtRange, inRange, isOverdue, nextWorkWeek, workWeek, fromISO, weekEnd } from './dates'
import { categoryOf } from '../store/useStore'

export interface ReportData {
  range: { start: Date; end: Date }
  completed: Task[]
  byCategory: { category: Category; tasks: Task[] }[]
  inProgress: Task[]
  pending: Task[]
  blocked: Task[]
  nextWeek: Task[]
  totalMinutes: number
}

export const compileWeek = (tasks: Task[], cats: Category[], ref = new Date(), workingDays?: number[]): ReportData => {
  const range = workWeek(ref, workingDays)
  const next = nextWorkWeek(ref, workingDays)
  const completed = tasks
    .filter((t) => t.status === 'done' && inRange(t.completedAt, range.start, range.end))
    .sort((a, b) => fromISO(a.completedAt!).getTime() - fromISO(b.completedAt!).getTime())
  const groups = new Map<string, Task[]>()
  for (const t of completed) groups.set(t.categoryId, [...(groups.get(t.categoryId) ?? []), t])
  const byCategory = [...groups.entries()]
    .map(([id, ts]) => ({ category: categoryOf(cats, id), tasks: ts }))
    .sort((a, b) => b.tasks.length - a.tasks.length)
  const open = tasks.filter((t) => t.status !== 'done')
  const inProgress = open.filter((t) => t.status === 'inprogress')
  const blocked = open.filter((t) => t.blocked)
  const pending = open.filter(
    (t) => !t.blocked && t.status === 'todo' && (isOverdue(t.dueAt, t.status) || inRange(t.dueAt, range.start, weekEnd(ref))),
  )
  const nextWeek = open
    .filter((t) => inRange(t.dueAt, next.start, weekEnd(next.start)))
    .sort((a, b) => fromISO(a.dueAt!).getTime() - fromISO(b.dueAt!).getTime())
  const totalMinutes = completed.reduce((s, t) => s + (t.timeSpent ?? 0), 0)
  return { range, completed, byCategory, inProgress, pending, blocked, nextWeek, totalMinutes }
}

const fmtHours = (min: number) => {
  if (!min) return ''
  const h = Math.floor(min / 60), m = min % 60
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`
}

export const reportSubject = (d: ReportData) => `Weekly Update – ${fmtRange(d.range.start, d.range.end)}`

export type ReportFormat = 'whatsapp' | 'plain'

/** Greeting that copes with titles such as "Dr. Sharma" or "Mr Rao". */
const greetingName = (full: string) => {
  const parts = full.trim().split(/\s+/)
  if (!parts[0]) return ''
  const isTitle = /^(dr|mr|mrs|ms|sir|madam|prof|ca)\.?$/i.test(parts[0])
  return isTitle ? parts.slice(0, 2).join(' ') : parts[0]
}

const shortRange = (a: Date, b: Date) =>
  a.getMonth() === b.getMonth() ? `${format(a, 'd')}–${format(b, 'd MMM yyyy')}` : fmtRange(a, b)

export const generateReportText = (d: ReportData, settings: Settings, cats: Category[], fmt: ReportFormat = 'whatsapp'): string => {
  const wa = fmt === 'whatsapp'
  const B = (t: string) => (wa ? `*${t}*` : t.toUpperCase())
  const H = (emoji: string, t: string) => (wa ? `${emoji} *${t}*` : t.toUpperCase())
  const L: string[] = []
  const who = greetingName(settings.managerName)
  const areas = d.byCategory.length
  const highDone = d.completed.filter((t) => t.priority === 'high')
  const nw = { start: addDays(d.range.start, 7), end: addDays(d.range.end, 7) }

  L.push(`Hi ${who || 'there'}${wa ? ' 👋' : ','}`, '')
  L.push(B(`Weekly update · ${shortRange(d.range.start, d.range.end)}`), '')

  L.push(H('📊', 'At a glance'))
  L.push(`${wa ? '✅' : '-'} Completed: ${d.completed.length} task${d.completed.length === 1 ? '' : 's'} across ${areas} area${areas === 1 ? '' : 's'}`)
  L.push(`${wa ? '🔄' : '-'} In progress: ${d.inProgress.length}`)
  L.push(`${wa ? '⚠️' : '-'} Pending / blocked: ${d.pending.length + d.blocked.length}`)
  if (d.totalMinutes) L.push(`${wa ? '⏱' : '-'} Time logged: ${fmtHours(d.totalMinutes)}`)
  if (highDone.length) L.push(`${wa ? '⭐' : '-'} Big wins: ${highDone.map((t) => t.title).slice(0, 3).join(', ')}${highDone.length > 3 ? '…' : ''}`)
  L.push('')

  L.push(H('🏆', 'What I completed'))
  if (d.byCategory.length === 0) L.push('• Nothing closed this week.')
  for (const g of d.byCategory) {
    L.push(`${B(g.category.name)} (${g.tasks.length})`)
    for (const t of g.tasks) L.push(`• ${t.title}${t.completedAt ? ` – ${format(fromISO(t.completedAt), 'EEE d')}` : ''}`)
  }
  L.push('')

  L.push(H('🔄', 'In progress'))
  if (d.inProgress.length === 0) L.push('• Nothing in progress right now.')
  for (const t of d.inProgress)
    L.push(`• ${t.title} – ${categoryOf(cats, t.categoryId).name}, expected ${t.dueAt ? format(fromISO(t.dueAt), 'EEE d MMM') : 'TBC'}`)
  L.push('')

  L.push(H('⚠️', 'Pending & need your input'))
  if (d.blocked.length === 0 && d.pending.length === 0) L.push('• No blockers. All good.')
  for (const t of d.blocked) L.push(`• ${wa ? '🔒 ' : '[BLOCKED] '}${t.title}${t.notes ? ` – ${t.notes}` : ''}`)
  for (const t of d.pending)
    L.push(`• ${t.title}${isOverdue(t.dueAt, t.status) ? ` – overdue since ${format(fromISO(t.dueAt!), 'd MMM')}` : t.dueAt ? ` – due ${format(fromISO(t.dueAt), 'd MMM')}` : ''}`)
  L.push('')

  L.push(H('📅', `Plan for next week (${shortRange(nw.start, nw.end)})`))
  if (d.nextWeek.length === 0) L.push('• Will plan on Monday.')
  for (const t of d.nextWeek)
    L.push(`• ${format(fromISO(t.dueAt!), 'EEE d')} – ${t.title}${t.priority === 'high' ? (wa ? ' ⭐' : ' (high)') : ''}`)
  L.push('')

  L.push('Happy to go through any of these in detail.', '')
  L.push(`${wa ? '— ' : 'Regards,\n'}${settings.userName || '[Your name]'}`)
  return L.join('\n')
}
