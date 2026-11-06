import {
  addDays, addMonths, addWeeks, endOfDay, endOfWeek, format, isBefore, isSameDay,
  parseISO, setDate, setHours, setMinutes, startOfDay, startOfWeek, differenceInCalendarDays,
  lastDayOfMonth, getDay,
} from 'date-fns'

export const WEEK_OPTS = { weekStartsOn: 1 as const }

export const toISO = (d: Date) => d.toISOString()
export const fromISO = (s: string) => parseISO(s)

export const startOfToday = () => startOfDay(new Date())
export const endOfToday = () => endOfDay(new Date())

export const weekStart = (d = new Date()) => startOfWeek(d, WEEK_OPTS)
export const weekEnd = (d = new Date()) => endOfWeek(d, WEEK_OPTS)
/** Monday → Friday of the week containing d */
export const workWeek = (d = new Date()) => {
  const mon = weekStart(d)
  return { start: mon, end: endOfDay(addDays(mon, 4)) }
}
export const nextWorkWeek = (d = new Date()) => workWeek(addWeeks(d, 1))

export const isOverdue = (dueAt?: string, status?: string) =>
  !!dueAt && status !== 'done' && isBefore(fromISO(dueAt), new Date())

export const isDueToday = (dueAt?: string) => !!dueAt && isSameDay(fromISO(dueAt), new Date())

export const inRange = (iso: string | undefined, start: Date, end: Date) => {
  if (!iso) return false
  const d = fromISO(iso)
  return d >= start && d <= end
}

export const fmtDate = (iso?: string, f = 'd MMM') => (iso ? format(fromISO(iso), f) : '')
export const fmtTime = (iso?: string) => (iso ? format(fromISO(iso), 'h:mm a') : '')
export const fmtDateTime = (iso?: string) => (iso ? format(fromISO(iso), 'EEE d MMM, h:mm a') : '')
export const fmtRange = (a: Date, b: Date) => `${format(a, 'd MMM')} – ${format(b, 'd MMM yyyy')}`

/** Human relative label used on cards */
export const relativeDue = (iso?: string): string => {
  if (!iso) return 'No due date'
  const d = fromISO(iso)
  const now = new Date()
  const days = differenceInCalendarDays(d, now)
  const t = format(d, 'h:mm a')
  if (days === 0) return isBefore(d, now) ? `Overdue · ${t}` : `Today · ${t}`
  if (days === 1) return `Tomorrow · ${t}`
  if (days === -1) return `Yesterday · ${t}`
  if (days < 0) return `${-days} days overdue`
  if (days < 7) return `${format(d, 'EEEE')} · ${t}`
  return format(d, 'd MMM · h:mm a')
}

/** Build a local date-time ISO from date "yyyy-MM-dd" and time "HH:mm" inputs */
export const combineDateTime = (date: string, time: string): string | undefined => {
  if (!date) return undefined
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = (time || '18:00').split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString()
}
export const splitDateTime = (iso?: string) => {
  if (!iso) return { date: '', time: '' }
  const d = fromISO(iso)
  return { date: format(d, 'yyyy-MM-dd'), time: format(d, 'HH:mm') }
}

/** Keep hour/minute from `from`, apply to `date` */
export const atSameTime = (date: Date, from: Date) => setMinutes(setHours(date, from.getHours()), from.getMinutes())

/** Next occurrence date after `after` for the recurrence, keeping time of day from `prev` */
export const nextOccurrence = (
  prev: Date,
  rec: { freq: string; weekday?: number; dayOfMonth?: number },
  after: Date = new Date(),
): Date | null => {
  const base = isBefore(prev, after) ? after : prev
  if (rec.freq === 'daily') return atSameTime(addDays(startOfDay(base), 1), prev)
  if (rec.freq === 'weekly') {
    const wd = rec.weekday ?? getDay(prev)
    let d = addDays(startOfDay(base), 1)
    while (getDay(d) !== wd) d = addDays(d, 1)
    return atSameTime(d, prev)
  }
  if (rec.freq === 'monthly') {
    const dom = rec.dayOfMonth ?? prev.getDate()
    let m = startOfDay(base)
    // try this month first (if day still ahead), else next months
    for (let i = 0; i < 3; i++) {
      const candidateMonth = addMonths(m, i)
      const last = lastDayOfMonth(candidateMonth).getDate()
      const candidate = setDate(candidateMonth, Math.min(dom, last))
      if (isBefore(startOfDay(base), startOfDay(candidate))) return atSameTime(candidate, prev)
    }
    return null
  }
  return null
}

export { addDays, addWeeks, format, isSameDay, startOfDay, endOfDay, differenceInCalendarDays, parseISO }
