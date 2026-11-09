import { addDays, setHours, setMinutes, startOfDay, subDays, startOfWeek } from 'date-fns'
import type { Task } from '../types'
import { uid } from './ids'

const at = (d: Date, h: number, m = 0) => setMinutes(setHours(startOfDay(d), h), m).toISOString()
/** a time later today, so the demo always has something "up next" */
const soon = (minutes: number) => new Date(Date.now() + minutes * 60000).toISOString()

/** Everyday work and life tasks spread across the current week so every view has content. */
export function buildSampleTasks(): Task[] {
  const now = new Date()
  const mon = startOfWeek(now, { weekStartsOn: 1 })
  const today = startOfDay(now)
  const base = (t: Partial<Task> & Pick<Task, 'title' | 'categoryId' | 'priority'>): Task => ({
    id: uid(), status: 'todo', reminderMinutes: 15, recurrence: { freq: 'none' }, createdAt: subDays(now, 7).toISOString(), sample: true, ...t,
  })

  return [
    // Completed earlier this week
    base({ title: 'Weekly planning – review goals and set top 3 priorities', categoryId: 'work', priority: 'high',
      status: 'done', dueAt: at(mon, 10), completedAt: at(mon, 9, 45), timeSpent: 40, recurrence: { freq: 'weekly', weekday: 1 } }),
    base({ title: 'Clear inbox to zero and reply to pending emails', categoryId: 'admin', priority: 'medium',
      status: 'done', dueAt: at(mon, 17), completedAt: at(mon, 16, 20), timeSpent: 50 }),
    base({ title: 'Send project proposal to Meridian Studios', categoryId: 'clients', priority: 'high',
      status: 'done', dueAt: at(addDays(mon, 1), 12), completedAt: at(addDays(mon, 1), 11, 30), timeSpent: 120,
      notes: 'Sent v2 with revised timeline. Awaiting feedback by Friday.' }),
    base({ title: 'Pay credit card bill and update budget sheet', categoryId: 'finance', priority: 'medium',
      status: 'done', dueAt: at(addDays(mon, 1), 20), completedAt: at(addDays(mon, 1), 19, 10), timeSpent: 25 }),
    base({ title: 'Prepare slides for Wednesday team review', categoryId: 'work', priority: 'high',
      status: 'done', dueAt: at(addDays(mon, 2), 10), completedAt: at(addDays(mon, 2), 9, 50), timeSpent: 150 }),
    base({ title: 'Call Arjun about the website redesign scope', categoryId: 'clients', priority: 'medium',
      status: 'done', dueAt: at(addDays(mon, 2), 15), completedAt: at(addDays(mon, 2), 14, 15), timeSpent: 30 }),
    base({ title: 'Book dentist appointment', categoryId: 'personal', priority: 'low',
      status: 'done', dueAt: at(addDays(mon, 3), 13), completedAt: at(addDays(mon, 3), 12, 40), timeSpent: 10 }),
    base({ title: 'Raise invoices for October retainers', categoryId: 'finance', priority: 'medium',
      status: 'done', dueAt: at(addDays(mon, 3), 17), completedAt: at(addDays(mon, 3), 16, 30), timeSpent: 45 }),

    // Today
    base({ title: 'Write the monthly progress report', categoryId: 'work', priority: 'high',
      status: 'inprogress', dueAt: soon(170), timeSpent: 60, recurrence: { freq: 'monthly', dayOfMonth: 20 },
      notes: 'Waiting on final numbers from the analytics dashboard.' }),
    base({ title: 'Review and approve design mockups', categoryId: 'work', priority: 'medium', status: 'todo', dueAt: soon(95) }),
    base({ title: 'Follow up with Nexus on the signed contract', categoryId: 'clients', priority: 'medium', status: 'todo', dueAt: soon(40), reminderMinutes: 30 }),
    base({ title: 'Submit expense claims for last month', categoryId: 'admin', priority: 'low', status: 'todo', dueAt: at(today, 11) }),
    base({ title: 'Reply to vendor query about delivery dates', categoryId: 'admin', priority: 'high',
      status: 'todo', dueAt: at(subDays(today, 1), 16), blocked: true, notes: 'Need confirmed dates from the warehouse team.' }),

    // Later this week / next week
    base({ title: 'Finish onboarding checklist for the new hire', categoryId: 'work', priority: 'high',
      status: 'inprogress', dueAt: at(addDays(today, 1), 17), timeSpent: 40 }),
    base({ title: 'Plan next quarter budget', categoryId: 'finance', priority: 'medium', status: 'todo', dueAt: at(addDays(today, 2), 12) }),
    base({ title: 'Renew car insurance', categoryId: 'personal', priority: 'medium', status: 'todo', dueAt: at(addDays(today, 2), 16) }),
    base({ title: 'Weekly planning – review goals and set top 3 priorities', categoryId: 'work', priority: 'high',
      status: 'todo', dueAt: at(addDays(mon, 7), 10), recurrence: { freq: 'weekly', weekday: 1 } }),
    base({ title: 'Kick-off meeting with Sunrise Logistics', categoryId: 'clients', priority: 'medium', status: 'todo', dueAt: at(addDays(mon, 8), 15) }),
    base({ title: 'File quarterly tax return', categoryId: 'finance', priority: 'high',
      status: 'todo', dueAt: at(addDays(mon, 9), 14), recurrence: { freq: 'monthly', dayOfMonth: 11 } }),
    base({ title: 'Gym – 3 sessions this week', categoryId: 'personal', priority: 'low', status: 'todo', dueAt: at(addDays(mon, 10), 7) }),
    base({ title: 'Back up laptop and update software', categoryId: 'admin', priority: 'low', status: 'todo', dueAt: at(addDays(mon, 11), 12) }),
  ]
}
