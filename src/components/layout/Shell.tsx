import { useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Bell, CalendarCheck, FileText, LayoutDashboard, ListTodo, Menu, Moon, Settings, Sun, X, Zap } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { NotificationBell } from './NotificationBell'
import { NotificationPrompt } from './NotificationPrompt'
import { format } from 'date-fns'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/report', label: 'Weekly report', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const TITLES: Record<string, string> = { '/': 'Dashboard', '/tasks': 'Tasks', '/report': 'Weekly report', '/settings': 'Settings' }

export const Shell = ({ children, needRefresh, onUpdate }: { children: ReactNode; needRefresh: boolean; onUpdate: () => void }) => {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const { settings, updateSettings, tasks } = useStore()
  const isDark = document.documentElement.classList.contains('dark')
  const openCount = tasks.filter((t) => t.status !== 'done').length

  const toggleTheme = () => updateSettings({ theme: isDark ? 'light' : 'dark' })

  const Sidebar = (
    <aside className="flex h-full w-64 flex-col border-r border-line bg-card p-4 dark:border-line-dark dark:bg-card-dark">
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white shadow-md shadow-indigo-500/30 dark:bg-accent-dark dark:text-[#0f1117]"><Zap size={18} /></div>
        <div>
          <p className="text-[15px] font-bold leading-none">PulseX</p>
          <p className="mt-0.5 text-[11px] text-ink-mute dark:text-ink-darkm">Accounting workflow</p>
        </div>
        <button className="btn-ghost ml-auto p-1.5 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>
      </div>
      <nav className="space-y-1">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <n.icon size={18} />
            <span>{n.label}</span>
            {n.to === '/tasks' && openCount > 0 && (
              <span className="ml-auto rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-ink-soft dark:bg-white/10 dark:text-ink-darks">{openCount}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-3">
        <div className="rounded-xl2 bg-gradient-to-br from-accent to-violet-600 p-4 text-white shadow-md shadow-indigo-500/20">
          <div className="flex items-center gap-2 text-xs font-medium opacity-90"><CalendarCheck size={14} /> {format(new Date(), 'EEEE')}</div>
          <p className="mt-1 text-lg font-bold">{format(new Date(), 'd MMMM')}</p>
          <p className="text-[11px] opacity-80">{settings.userName ? `Keep going, ${settings.userName.split(' ')[0]}.` : 'Set your name in Settings.'}</p>
        </div>
        <button className="nav-item w-full" onClick={toggleTheme}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}<span>{isDark ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-full">
      <div className="hidden lg:block">{Sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-10 h-full">{Sidebar}</div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-canvas/80 px-4 py-3 backdrop-blur dark:border-line-dark dark:bg-canvas-dark/80 sm:px-6">
          <button className="btn-ghost p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <h1 className="text-lg font-semibold">{TITLES[pathname] ?? 'PulseX'}</h1>
          <div className="ml-auto flex items-center gap-1">
            {needRefresh && <button className="btn-soft hidden sm:inline-flex" onClick={onUpdate}>Update available · reload</button>}
            <NotificationBell />
          </div>
        </header>
        {!settings.notifications.enabled && <NotificationPrompt />}
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">{children}</main>
      </div>
    </div>
  )
}

export const BellIcon = Bell
