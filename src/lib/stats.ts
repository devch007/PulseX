import { addDays, differenceInCalendarDays, format, isSameDay, startOfDay, subDays } from 'date-fns'
import type { Category, Task } from '../types'
import { fromISO, inRange, isOverdue, weekStart, weekEnd, isDueToday } from './dates'
import { categoryOf } from '../store/useStore'

export const todayStats = (tasks: Task[]) => {
  const due = tasks.filter((t) => isDueToday(t.dueAt) || (t.completedAt && isSameDay(fromISO(t.completedAt), new Date())))
  const done = due.filter((t) => t.status === 'done').length
  return { total: due.length, done, pct: due.length ? Math.round((done / due.length) * 100) : 0 }
}

/** Mon..Sun series of completed vs pending (due) tasks for the current week */
export const weekSeries = (tasks: Task[]) => {
  const mon = weekStart()
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(mon, i)
    const completed = tasks.filter((t) => t.completedAt && isSameDay(fromISO(t.completedAt), day)).length
    const pending = tasks.filter((t) => t.status !== 'done' && t.dueAt && isSameDay(fromISO(t.dueAt), day)).length
    return { day: format(day, 'EEE'), date: format(day, 'd MMM'), completed, pending, isToday: isSameDay(day, new Date()) }
  })
}

export const categoryBreakdown = (tasks: Task[], cats: Category[]) => {
  const open = tasks.filter((t) => t.status !== 'done')
  const counts = new Map<string, number>()
  for (const t of open) counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1)
  return cats
    .map((c) => ({ id: c.id, name: c.name, color: c.color, value: counts.get(c.id) ?? 0 }))
    .concat(
      [...counts.keys()].filter((id) => !cats.some((c) => c.id === id)).map((id) => ({ ...categoryOf(cats, id), value: counts.get(id)! })),
    )
    .filter((d) => d.value > 0)
}

export const weekCounts = (tasks: Task[]) => {
  const s = weekStart(), e = weekEnd()
  return {
    completedThisWeek: tasks.filter((t) => t.status === 'done' && inRange(t.completedAt, s, e)).length,
    overdue: tasks.filter((t) => isOverdue(t.dueAt, t.status)).length,
    highPending: tasks.filter((t) => t.status !== 'done' && t.priority === 'high').length,
    inProgress: tasks.filter((t) => t.status === 'inprogress').length,
  }
}

export const upNext = (tasks: Task[], n = 3) =>
  tasks
    .filter((t) => t.status !== 'done' && t.dueAt)
    .sort((a, b) => fromISO(a.dueAt!).getTime() - fromISO(b.dueAt!).getTime())
    .slice(0, n)

/** Consecutive working days (ending today or yesterday) with at least one completion */
export const streak = (tasks: Task[], workingDays: number[]) => {
  const doneDays = new Set(tasks.filter((t) => t.completedAt).map((t) => format(fromISO(t.completedAt!), 'yyyy-MM-dd')))
  let count = 0
  let d = startOfDay(new Date())
  // today counts only if something is done; otherwise start from yesterday
  if (!doneDays.has(format(d, 'yyyy-MM-dd'))) d = subDays(d, 1)
  for (let i = 0; i < 365; i++) {
    const isWorking = workingDays.includes(d.getDay())
    if (isWorking) {
      if (doneDays.has(format(d, 'yyyy-MM-dd'))) count++
      else break
    }
    d = subDays(d, 1)
  }
  return count
}

/** 0–100 blend: completion rate (last 7 days) · on-time rate · streak */
export const productivityScore = (tasks: Task[], workingDays: number[]) => {
  const since = subDays(new Date(), 7)
  const recent = tasks.filter((t) => t.dueAt && fromISO(t.dueAt) >= since && fromISO(t.dueAt) <= new Date())
  const done = recent.filter((t) => t.status === 'done')
  const completion = recent.length ? done.length / recent.length : 1
  const onTime = done.length
    ? done.filter((t) => t.completedAt && fromISO(t.completedAt) <= fromISO(t.dueAt!)).length / done.length
    : 1
  const st = Math.min(streak(tasks, workingDays), 10) / 10
  const score = Math.round(completion * 50 + onTime * 30 + st * 20)
  return { score, completion: Math.round(completion * 100), onTime: Math.round(onTime * 100) }
}

export const daysUntil = (iso: string) => differenceInCalendarDays(fromISO(iso), new Date())
