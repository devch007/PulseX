import { format, isSameDay } from 'date-fns'
import type { Alert, Settings, Task } from '../types'
import { fromISO, isOverdue, isReportDay } from './dates'

export type Permission = 'granted' | 'denied' | 'default' | 'unsupported'

export const supportsNotifications = () => typeof window !== 'undefined' && 'Notification' in window
export const getPermission = (): Permission => (supportsNotifications() ? Notification.permission : 'unsupported')

export const requestPermission = async (): Promise<Permission> => {
  if (!supportsNotifications()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export interface NotifyPayload {
  title: string
  body: string
  url: string
  tag: string
}

/** Show via the service worker when available (survives tab focus changes), else the page API. */
export const showNotification = async (p: NotifyPayload) => {
  if (getPermission() !== 'granted') return
  const opts: NotificationOptions = {
    body: p.body,
    tag: p.tag,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: p.url },
  }
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
    if (reg) {
      await reg.showNotification(p.title, opts)
      return
    }
  } catch {
    /* fall through to page notification */
  }
  try {
    const n = new Notification(p.title, opts)
    n.onclick = () => {
      window.focus()
      window.history.pushState({}, '', p.url); window.dispatchEvent(new PopStateEvent('popstate'))
      n.close()
    }
  } catch {
    /* ignore */
  }
}

/* ---------------- scheduler ---------------- */

const todayKey = () => format(new Date(), 'yyyy-MM-dd')
const timeMatched = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  const now = new Date()
  const target = new Date(now); target.setHours(h, m, 0, 0)
  // fire once we're at/after the target but within the same day
  return now >= target
}

interface Ctx {
  tasks: Task[]
  settings: Settings
  hasFired: (k: string) => boolean
  markFired: (k: string) => void
  pushAlert: (a: Omit<Alert, 'id' | 'createdAt' | 'read'>) => void
}

/** Called every ~30s. Decides which notifications are due and emits them once. */
export const runScheduler = ({ tasks, settings, hasFired, markFired, pushAlert }: Ctx) => {
  const n = settings.notifications
  if (!n.enabled) return
  const now = new Date()
  const emit = async (key: string, kind: Alert['kind'], p: NotifyPayload, taskId?: string) => {
    if (hasFired(key)) return
    markFired(key)
    pushAlert({ kind, title: p.title, body: p.body, url: p.url, taskId })
    await showNotification(p)
  }

  for (const t of tasks) {
    if (t.status === 'done' || !t.dueAt) continue
    const due = fromISO(t.dueAt)
    const remindAt = new Date(due.getTime() - (t.reminderMinutes ?? n.defaultReminderMinutes) * 60000)
    if (n.reminders && now >= remindAt && now < due) {
      void emit(`rem:${t.id}:${t.dueAt}`, 'reminder', {
        title: `Due ${format(due, 'h:mm a')}: ${t.title}`,
        body: `${t.priority.toUpperCase()} priority · starts in ${Math.max(1, Math.round((due.getTime() - now.getTime()) / 60000))} min`,
        url: `/tasks?task=${t.id}`,
        tag: `rem-${t.id}`,
      }, t.id)
    }
    if (n.overdue && isOverdue(t.dueAt, t.status) && now.getTime() - due.getTime() < 36 * 3600000) {
      void emit(`ovd:${t.id}:${t.dueAt}`, 'overdue', {
        title: `Overdue: ${t.title}`,
        body: `Was due ${format(due, 'EEE h:mm a')}. Open to reschedule or complete.`,
        url: `/tasks?task=${t.id}`,
        tag: `ovd-${t.id}`,
      }, t.id)
    }
  }

  const isWorkDay = settings.workingDays.includes(now.getDay())
  if (n.morningSummary && isWorkDay && timeMatched(n.morningTime)) {
    const todays = tasks.filter((t) => t.status !== 'done' && t.dueAt && isSameDay(fromISO(t.dueAt), now))
    const high = todays.filter((t) => t.priority === 'high').length
    const overdue = tasks.filter((t) => isOverdue(t.dueAt, t.status) && !isSameDay(fromISO(t.dueAt!), now)).length
    void emit(`morning:${todayKey()}`, 'morning', {
      title: `Good morning${settings.userName ? `, ${settings.userName.split(' ')[0]}` : ''}`,
      body: `You have ${todays.length} task${todays.length === 1 ? '' : 's'} today, ${high} high priority${overdue ? `, ${overdue} overdue` : ''}.`,
      url: '/tasks?view=today',
      tag: 'morning',
    })
  }

  if (n.fridayReminder && isReportDay(settings.workingDays, now) && timeMatched(n.fridayTime)) {
    void emit(`friday:${todayKey()}`, 'friday', {
      title: 'Weekly report reminder',
      body: `Your weekly update${settings.managerName ? ` for ${settings.managerName}` : ''} is ready to review and send.`,
      url: '/report',
      tag: 'friday',
    })
  }
}
