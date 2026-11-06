import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { useStore } from './store/useStore'
import { runScheduler } from './lib/notifications'

/** Applies the theme to <html> and follows the OS when set to "system". */
export const useTheme = () => {
  const theme = useStore((s) => s.settings.theme)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#181b25' : '#4f46e5')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

/** Registers the service worker and listens for "navigate" messages from notification clicks. */
export const useServiceWorker = () => {
  const navigate = useNavigate()
  const [needRefresh, setNeedRefresh] = useState(false)
  const updateRef = useRef<((reload?: boolean) => Promise<void>) | null>(null)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    updateRef.current = registerSW({
      immediate: true,
      onNeedRefresh: () => setNeedRefresh(true),
    })
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'NAVIGATE' && typeof e.data.url === 'string') {
        const hash = e.data.url.split('#')[1] ?? '/'
        navigate(hash)
      }
    }
    navigator.serviceWorker.addEventListener('message', onMsg)
    return () => navigator.serviceWorker.removeEventListener('message', onMsg)
  }, [navigate])
  return { needRefresh, update: () => updateRef.current?.(true) }
}

/** Runs the notification scheduler every 30 s while the app is open. */
export const useNotificationScheduler = () => {
  useEffect(() => {
    const tick = () => {
      const s = useStore.getState()
      runScheduler({ tasks: s.tasks, settings: s.settings, hasFired: s.hasFired, markFired: s.markFired, pushAlert: s.pushAlert })
    }
    const t = window.setTimeout(tick, 1500)
    const i = window.setInterval(tick, 30000)
    const onVis = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVis)
    return () => { clearTimeout(t); clearInterval(i); document.removeEventListener('visibilitychange', onVis) }
  }, [])
}

/** Returns a URLSearchParams for the hash route query (?task=…, ?view=…) */
export const useQuery = () => {
  const { search } = useLocation()
  return new URLSearchParams(search)
}

/** Re-render every minute so "overdue" states and relative labels stay fresh */
export const useMinuteTick = () => {
  const [, set] = useState(0)
  useEffect(() => {
    const i = setInterval(() => set((x) => x + 1), 60000)
    return () => clearInterval(i)
  }, [])
}

export const useIsFriday = () => new Date().getDay() === 5
