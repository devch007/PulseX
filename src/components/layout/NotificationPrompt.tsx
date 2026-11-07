import { useState } from 'react'
import { BellRing, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { getPermission, requestPermission, showNotification } from '../../lib/notifications'

/** Polite in-app banner – only asks the browser after the user clicks. */
export const NotificationPrompt = () => {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('pulsex-notif-dismissed') === '1')
  const { updateNotificationSettings, pushAlert } = useStore()
  const perm = getPermission()
  if (dismissed || perm === 'unsupported' || perm === 'denied') return null

  const enable = async () => {
    const p = await requestPermission()
    if (p === 'granted') {
      updateNotificationSettings({ enabled: true })
      pushAlert({ kind: 'info', title: 'Notifications enabled', body: 'You will get reminders while PulseX is open.', url: '/#/settings' })
      void showNotification({ title: 'PulseX reminders are on', body: 'You will be reminded before tasks are due.', url: '/#/', tag: 'welcome' })
    }
  }
  const dismiss = () => { sessionStorage.setItem('pulsex-notif-dismissed', '1'); setDismissed(true) }

  return (
    <div className="glass mx-4 mt-2 flex items-center gap-3 rounded-xl2 px-4 py-3 text-sm sm:mx-8">
      <BellRing size={18} className="shrink-0 text-accent dark:text-accent-dark" />
      <p className="flex-1">
        <span className="font-medium">Want reminders before deadlines?</span>{' '}
        <span className="text-ink-soft dark:text-ink-darks">PulseX can notify you about due tasks, overdue items, a morning summary and the Friday report. Nothing leaves your browser.</span>
      </p>
      <button className="btn-primary whitespace-nowrap" onClick={enable}>Enable</button>
      <button className="btn-ghost p-1.5" onClick={dismiss} aria-label="Dismiss"><X size={16} /></button>
    </div>
  )
}
