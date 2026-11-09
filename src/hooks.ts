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
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#0b0c12' : '#f2f3f8')
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
        navigate(e.data.url as string)
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

/** Eases a number from its previous value to the new one (for stat tiles). */
export const useCountUp = (value: number, ms = 700) => {
  const [shown, setShown] = useState(0)
  const fromRef = useRef(0)
  useEffect(() => {
    const from = fromRef.current, to = value
    if (from === to) return
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms)
      const e = 1 - Math.pow(1 - p, 3)
      const v = from + (to - from) * e
      setShown(Number.isInteger(to) && Number.isInteger(from) ? Math.round(v) : Math.round(v * 10) / 10)
      if (p < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return shown
}

/* ---------- PWA install ---------- */
interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e as BeforeInstallPromptEvent; listeners.forEach((l) => l()) })
  window.addEventListener('appinstalled', () => { deferredPrompt = null; listeners.forEach((l) => l()) })
}
export const useInstallPrompt = () => {
  const [, force] = useState(0)
  useEffect(() => { const l = () => force((x) => x + 1); listeners.add(l); return () => { listeners.delete(l) } }, [])
  const installed = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true)
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isIOS = /iPhone|iPad|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|CriOS/.test(ua)
  const install = async () => {
    if (!deferredPrompt) return 'unavailable' as const
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') deferredPrompt = null
    listeners.forEach((l) => l())
    return outcome
  }
  return { canPrompt: !!deferredPrompt, installed, isIOS, isSafari, install }
}
