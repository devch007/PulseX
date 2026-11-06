import { Route, Routes } from 'react-router-dom'
import { Shell } from './components/layout/Shell'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Report from './pages/Report'
import Settings from './pages/Settings'
import { useNotificationScheduler, useServiceWorker, useTheme } from './hooks'

export default function App() {
  useTheme()
  useNotificationScheduler()
  const { needRefresh, update } = useServiceWorker()
  return (
    <Shell needRefresh={needRefresh} onUpdate={update}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/report" element={<Report />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Shell>
  )
}
