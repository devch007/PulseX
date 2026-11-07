import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Shell } from './components/layout/Shell'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Report from './pages/Report'
import Settings from './pages/Settings'
import Welcome from './pages/Welcome'
import { useNotificationScheduler, useServiceWorker, useTheme } from './hooks'
import { useStore } from './store/useStore'
import { bindAuth } from './lib/auth'

export default function App() {
  useTheme()
  useNotificationScheduler()
  const { needRefresh, update } = useServiceWorker()
  const onboarded = useStore((s) => s.onboarded)
  const { pathname } = useLocation()

  useEffect(() => bindAuth(), [])

  if (pathname === '/welcome') return <Welcome />
  if (!onboarded) return <Navigate to="/welcome" replace />

  return (
    <Shell needRefresh={needRefresh} onUpdate={update}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/report" element={<Report />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}
