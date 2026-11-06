import { addDays, setHours, setMinutes, startOfDay, subDays, startOfWeek } from 'date-fns'
import type { Task } from '../types'
import { uid } from './ids'

const at = (d: Date, h: number, m = 0) => setMinutes(setHours(startOfDay(d), h), m).toISOString()
/** a time later today, so the demo always has something "up next" */
const soon = (minutes: number) => new Date(Date.now() + minutes * 60000).toISOString()

/** Realistic accounting tasks spread across the current week so every view has content. */
export function buildSampleTasks(): Task[] {
  const now = new Date()
  const mon = startOfWeek(now, { weekStartsOn: 1 })
  const today = startOfDay(now)
  const base = (t: Partial<Task> & Pick<Task, 'title' | 'categoryId' | 'priority'>): Task => ({
    id: uid(),
    status: 'todo',
    reminderMinutes: 15,
    recurrence: { freq: 'none' },
    createdAt: subDays(now, 7).toISOString(),
    sample: true,
    ...t,
  })

  return [
    // Completed earlier this week
    base({ title: 'Bank reconciliation – HDFC current account (October)', categoryId: 'reconciliation', priority: 'high',
      status: 'done', dueAt: at(mon, 11), completedAt: at(mon, 10, 40), timeSpent: 95,
      recurrence: { freq: 'weekly', weekday: 1 }, notes: 'Matched 212 entries, 3 unreconciled cheques carried forward.' }),
    base({ title: 'Process vendor invoices batch #44 (38 invoices)', categoryId: 'admin', priority: 'medium',
      status: 'done', dueAt: at(mon, 17), completedAt: at(mon, 16, 15), timeSpent: 120 }),
    base({ title: 'TDS payment for October – challan 281', categoryId: 'compliance', priority: 'high',
      status: 'done', dueAt: at(addDays(mon, 1), 12), completedAt: at(addDays(mon, 1), 11, 20), timeSpent: 45,
      notes: 'Paid ₹3,42,600. Challan saved in /Compliance/TDS/Oct.' }),
    base({ title: 'Credit card statement reconciliation – corporate cards', categoryId: 'reconciliation', priority: 'medium',
      status: 'done', dueAt: at(addDays(mon, 1), 16), completedAt: at(addDays(mon, 1), 15, 30), timeSpent: 60 }),
    base({ title: 'Send October MIS pack to leadership', categoryId: 'reporting', priority: 'high',
      status: 'done', dueAt: at(addDays(mon, 2), 10), completedAt: at(addDays(mon, 2), 9, 50), timeSpent: 180 }),
    base({ title: 'Follow up with Meridian Textiles on overdue receivable (₹4.8L)', categoryId: 'client', priority: 'high',
      status: 'done', dueAt: at(addDays(mon, 2), 15), completedAt: at(addDays(mon, 2), 14, 10), timeSpent: 20,
      notes: 'Client committed to pay by 15th.' }),
    base({ title: 'Fixed asset register update – Q2 additions', categoryId: 'reporting', priority: 'low',
      status: 'done', dueAt: at(addDays(mon, 3), 13), completedAt: at(addDays(mon, 3), 12, 45), timeSpent: 75 }),
    base({ title: 'Audit support: share sample invoices for revenue testing', categoryId: 'compliance', priority: 'medium',
      status: 'done', dueAt: at(addDays(mon, 3), 17), completedAt: at(addDays(mon, 3), 16, 40), timeSpent: 50 }),

    // Today
    base({ title: 'GSTR-3B working – October (due 20th)', categoryId: 'compliance', priority: 'high',
      status: 'inprogress', dueAt: soon(170), timeSpent: 90, recurrence: { freq: 'monthly', dayOfMonth: 20 },
      notes: 'ITC reconciliation with GSTR-2B pending for 4 vendors.' }),
    base({ title: 'Intercompany balance confirmation – Pune branch', categoryId: 'reconciliation', priority: 'medium',
      status: 'todo', dueAt: soon(95) }),
    base({ title: 'Call Arjun (Nexus Pharma) re: TDS certificate query', categoryId: 'client', priority: 'medium',
      status: 'todo', dueAt: soon(40), reminderMinutes: 30 }),
    base({ title: 'Approve expense claims in Zoho (14 pending)', categoryId: 'admin', priority: 'low',
      status: 'todo', dueAt: at(today, 11) }),
    base({ title: 'Reply to auditor query list #3 (inventory valuation)', categoryId: 'compliance', priority: 'high',
      status: 'todo', dueAt: at(subDays(today, 1), 16), blocked: true,
      notes: 'Need stock count sheets from the warehouse team.' }),

    // Later this week / next week
    base({ title: 'Month-end close checklist – accruals and provisions', categoryId: 'reporting', priority: 'high',
      status: 'inprogress', dueAt: at(addDays(today, 1), 17), timeSpent: 40 }),
    base({ title: 'Prepare cash flow forecast for next 8 weeks', categoryId: 'reporting', priority: 'medium',
      status: 'todo', dueAt: at(addDays(today, 2), 12) }),
    base({ title: 'Vendor ageing review and payment run proposal', categoryId: 'admin', priority: 'medium',
      status: 'todo', dueAt: at(addDays(today, 2), 16) }),
    base({ title: 'Bank reconciliation – ICICI payroll account', categoryId: 'reconciliation', priority: 'medium',
      status: 'todo', dueAt: at(addDays(mon, 7), 11), recurrence: { freq: 'weekly', weekday: 1 } }),
    base({ title: 'Client onboarding: Sunrise Logistics – chart of accounts setup', categoryId: 'client', priority: 'medium',
      status: 'todo', dueAt: at(addDays(mon, 8), 15) }),
    base({ title: 'GSTR-1 filing – October', categoryId: 'compliance', priority: 'high',
      status: 'todo', dueAt: at(addDays(mon, 9), 14), recurrence: { freq: 'monthly', dayOfMonth: 11 } }),
    base({ title: 'Quarterly advance tax computation', categoryId: 'compliance', priority: 'medium',
      status: 'todo', dueAt: at(addDays(mon, 10), 17) }),
    base({ title: 'Renew Tally license and update backups', categoryId: 'admin', priority: 'low',
      status: 'todo', dueAt: at(addDays(mon, 11), 12) }),
  ]
}
