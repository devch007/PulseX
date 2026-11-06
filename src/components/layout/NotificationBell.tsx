import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, Bell, CheckCheck, Clock, FileText, Sunrise, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useStore } from '../../store/useStore'
import { fromISO } from '../../lib/dates'
import type { Alert } from '../../types'

const ICONS: Record<Alert['kind'], React.ReactNode> = {
  reminder: <Clock size={14} />, overdue: <AlertTriangle size={14} />, morning: <Sunrise size={14} />, friday: <FileText size={14} />, info: <Bell size={14} />,
}
const TONES: Record<Alert['kind'], string> = {
  reminder: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
  overdue: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300',
  morning: 'bg-amber-50 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300',
  friday: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
  info: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
}

export const NotificationBell = () => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { alerts, markAlertsRead, clearAlerts } = useStore()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  useEffect(() => setOpen(false), [pathname, search])
  const unread = alerts.filter((a) => !a.read).length

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button className="btn-ghost relative p-2" onClick={() => { setOpen((o) => !o); if (!open) markAlertsRead() }} aria-label="Notifications">
        <Bell size={20} />
        {unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="card absolute right-0 mt-2 w-80 overflow-hidden p-0 shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3 dark:border-line-dark">
            <p className="text-sm font-semibold">Recent alerts</p>
            {alerts.length > 0 && <button className="btn-ghost p-1 text-xs" onClick={clearAlerts}><Trash2 size={13} /> Clear</button>}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {alerts.length === 0 && (
              <li className="px-4 py-8 text-center text-xs text-ink-mute dark:text-ink-darkm"><CheckCheck className="mx-auto mb-2" size={20} />No alerts yet. Reminders appear here as they fire.</li>
            )}
            {alerts.map((a) => (
              <li key={a.id}>
                <button
                  className="flex w-full gap-3 px-4 py-3 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
                  onClick={() => { setOpen(false); navigate(a.url.replace(/^\/#/, '')) }}
                >
                  <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${TONES[a.kind]}`}>{ICONS[a.kind]}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{a.title}</span>
                    <span className="block text-xs text-ink-soft dark:text-ink-darks">{a.body}</span>
                    <span className="block text-[11px] text-ink-mute dark:text-ink-darkm">{formatDistanceToNow(fromISO(a.createdAt), { addSuffix: true })}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
