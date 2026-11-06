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

export const generateReportText = (d: ReportData, settings: Settings, cats: Category[]): string => {
  const L: string[] = []
  const greet = settings.managerName ? `Hi ${settings.managerName.split(' ')[0]},` : 'Hi,'
  const areas = d.byCategory.length
  L.push(greet, '')
  L.push(
    `Here is my weekly update for ${fmtRange(d.range.start, d.range.end)}. ` +
      (d.completed.length
        ? `Completed ${d.completed.length} task${d.completed.length === 1 ? '' : 's'} this week across ${areas} area${areas === 1 ? '' : 's'}` +
          (d.totalMinutes ? ` (${fmtHours(d.totalMinutes)} logged)` : '') + '.'
        : 'No tasks were closed this week; details below.'),
    '',
  )

  L.push('KEY ACCOMPLISHMENTS')
  if (d.byCategory.length === 0) L.push('• None recorded this week.')
  for (const g of d.byCategory) {
    L.push(`${g.category.name}:`)
    for (const t of g.tasks) L.push(`  • ${t.title}${t.completedAt ? ` (${format(fromISO(t.completedAt), 'EEE d MMM')})` : ''}`)
  }
  L.push('')

  L.push('IN PROGRESS')
  if (d.inProgress.length === 0) L.push('• Nothing currently in progress.')
  for (const t of d.inProgress)
    L.push(`• ${t.title} – ${categoryOf(cats, t.categoryId).name}; expected completion ${t.dueAt ? format(fromISO(t.dueAt), 'EEE d MMM') : 'TBC'}`)
  L.push('')

  L.push('PENDING / BLOCKED – SUPPORT NEEDED')
  if (d.blocked.length === 0 && d.pending.length === 0) L.push('• No blockers at the moment.')
  for (const t of d.blocked) L.push(`• [Blocked] ${t.title}${t.notes ? ` – ${t.notes}` : ''}`)
  for (const t of d.pending)
    L.push(`• ${t.title}${isOverdue(t.dueAt, t.status) ? ` (overdue since ${format(fromISO(t.dueAt!), 'd MMM')})` : t.dueAt ? ` (due ${format(fromISO(t.dueAt), 'd MMM')})` : ''}`)
  L.push('')

  L.push(`PLAN FOR NEXT WEEK (${fmtRange(nextWorkWeek(d.range.start).start, nextWorkWeek(d.range.start).end)})`)
  if (d.nextWeek.length === 0) L.push('• To be planned.')
  for (const t of d.nextWeek)
    L.push(`• ${t.title} – ${categoryOf(cats, t.categoryId).name}, ${format(fromISO(t.dueAt!), 'EEE d MMM')}${t.priority === 'high' ? ' (high priority)' : ''}`)
  L.push('')

  L.push('Please let me know if you would like more detail on any of the above.', '')
  L.push('Best regards,', settings.userName || '[Your name]')
  return L.join('\n')
}
