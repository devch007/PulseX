export type Priority = 'high' | 'medium' | 'low'
export type Status = 'todo' | 'inprogress' | 'done'
export type RecurrenceFreq = 'none' | 'daily' | 'weekly' | 'monthly'

export interface Recurrence {
  freq: RecurrenceFreq
  /** 0 = Sunday … 6 = Saturday (weekly) */
  weekday?: number
  /** 1–31 (monthly) */
  dayOfMonth?: number
}

export interface Task {
  id: string
  title: string
  notes?: string
  categoryId: string
  priority: Priority
  status: Status
  /** ISO string, local date-time of the deadline */
  dueAt?: string
  /** minutes */
  timeSpent?: number
  /** minutes before due to remind */
  reminderMinutes: number
  recurrence: Recurrence
  blocked?: boolean
  createdAt: string
  completedAt?: string
  /** id of the recurring parent (for spawned occurrences) */
  seriesId?: string
  sample?: boolean
  updatedAt?: string
}

export interface Category {
  id: string
  name: string
  color: string
  builtIn?: boolean
}

export interface Settings {
  userName: string
  managerName: string
  managerEmail: string
  /** 0 = Sunday … 6 = Saturday */
  workingDays: number[]
  workStart: string // "09:00"
  workEnd: string // "18:00"
  theme: 'light' | 'dark' | 'system'
  notifications: {
    enabled: boolean
    reminders: boolean
    overdue: boolean
    morningSummary: boolean
    morningTime: string // "09:30"
    fridayReminder: boolean
    fridayTime: string // "16:00"
    defaultReminderMinutes: number
  }
}

export interface Alert {
  id: string
  kind: 'reminder' | 'overdue' | 'morning' | 'friday' | 'info'
  title: string
  body: string
  url: string
  createdAt: string
  read: boolean
  taskId?: string
}

export interface WeeklyReport {
  id: string
  weekStart: string // ISO date (Monday)
  weekEnd: string // ISO date (Friday)
  subject: string
  text: string
  createdAt: string
  stats: { completed: number; inProgress: number; pending: number; areas: number }
}
