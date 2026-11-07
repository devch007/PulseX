import { format } from 'date-fns'
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

export const compileWeek = (tasks: Task[], cats: Category[], ref = new Date()): ReportData => {
  const range = workWeek(ref)
  const next = nextWorkWeek(ref)
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

const line = (ch = '─', n = 34) => ch.repeat(n)
const H = (t: string) => [t.toUpperCase(), line()]

export const generateReportText = (d: ReportData, settings: Settings, cats: Category[]): string => {
  const L: string[] = []
  const first = settings.managerName ? settings.managerName.split(' ')[0] : ''
  const areas = d.byCategory.length
  const highDone = d.completed.filter((t) => t.priority === 'high')

  L.push(`Hi ${first || 'there'},`, '')
  L.push(`Sharing my weekly update for ${fmtRange(d.range.start, d.range.end)}.`, '')

  // At-a-glance block
  L.push(...H('At a glance'))
  L.push(`✔  Completed: ${d.completed.length} task${d.completed.length === 1 ? '' : 's'} across ${areas} area${areas === 1 ? '' : 's'}`)
  L.push(`◐  In progress: ${d.inProgress.length}`)
  L.push(`!  Pending / blocked: ${d.pending.length + d.blocked.length}`)
  if (d.totalMinutes) L.push(`⏱  Time logged: ${fmtHours(d.totalMinutes)}`)
  if (highDone.length) L.push(`★  High-priority items closed: ${highDone.map((t) => t.title).slice(0, 3).join('; ')}${highDone.length > 3 ? '…' : ''}`)
  L.push('')

  L.push(...H('Key accomplishments'))
  if (d.byCategory.length === 0) L.push('• None recorded this week.')
  d.byCategory.forEach((g, gi) => {
    L.push(`${gi + 1}. ${g.category.name} (${g.tasks.length})`)
    for (const t of g.tasks) L.push(`   • ${t.title}${t.completedAt ? ` — ${format(fromISO(t.completedAt), 'EEE d MMM')}` : ''}`)
  })
  L.push('')

  L.push(...H('In progress'))
  if (d.inProgress.length === 0) L.push('• Nothing currently in progress.')
  for (const t of d.inProgress)
    L.push(`• ${t.title}`, `   ${categoryOf(cats, t.categoryId).name} · expected ${t.dueAt ? format(fromISO(t.dueAt), 'EEE d MMM') : 'TBC'}${t.timeSpent ? ` · ${fmtHours(t.timeSpent)} so far` : ''}`)
  L.push('')

  L.push(...H('Pending & support needed'))
  if (d.blocked.length === 0 && d.pending.length === 0) L.push('• No blockers at the moment.')
  for (const t of d.blocked) L.push(`• [BLOCKED] ${t.title}`, `   Need: ${t.notes ?? 'your input to proceed'}`)
  for (const t of d.pending)
    L.push(`• ${t.title}${isOverdue(t.dueAt, t.status) ? ` — overdue since ${format(fromISO(t.dueAt!), 'd MMM')}` : t.dueAt ? ` — due ${format(fromISO(t.dueAt), 'd MMM')}` : ''}`)
  L.push('')

  const nw = nextWorkWeek(d.range.start)
  L.push(...H(`Plan for next week · ${fmtRange(nw.start, nw.end)}`))
  if (d.nextWeek.length === 0) L.push('• To be planned.')
  for (const t of d.nextWeek)
    L.push(`• ${format(fromISO(t.dueAt!), 'EEE d')} — ${t.title} (${categoryOf(cats, t.categoryId).name})${t.priority === 'high' ? ' ★' : ''}`)
  L.push('')

  L.push('Happy to walk through any of these in more detail.', '')
  L.push('Best regards,', settings.userName || '[Your name]')
  return L.join('\n')
}
