import { useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Bell, ChevronRight, FileText, LayoutDashboard, ListTodo, Menu, Moon, Settings, Sun, X, Zap } from 'lucide-react'
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
  const { settings, updateSettings, tasks, user, sync } = useStore()
  const isDark = document.documentElement.classList.contains('dark')
  const openCount = tasks.filter((t) => t.status !== 'done').length

  const toggleTheme = () => updateSettings({ theme: isDark ? 'light' : 'dark' })
  const initials = (settings.userName || 'You').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  const Sidebar = (
    <aside className="glass flex h-full w-[248px] flex-col rounded-none border-y-0 border-l-0 p-4 lg:m-3 lg:h-[calc(100%-1.5rem)] lg:rounded-xl3 lg:border">
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <div className="tile-blue h-10 w-10 rounded-[13px]"><Zap size={19} strokeWidth={2.4} fill="currentColor" /></div>
        <div>
          <p className="text-[15px] font-bold leading-none tracking-tight">PulseX</p>
          <p className="mt-0.5 text-[11px] text-ink-mute dark:text-ink-darkm">Your week, organised</p>
        </div>
        <button className="btn-ghost ml-auto p-1.5 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>
      </div>
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-mute dark:text-ink-darkm">Menu</p>
      <nav className="space-y-1">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <n.icon size={18} />
            <span>{n.label}</span>
            {n.to === '/tasks' && openCount > 0 && (
              <span className="ml-auto rounded-full bg-black/[0.06] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ink-soft dark:bg-white/10 dark:text-ink-darks">{openCount}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-1">
        <button className="nav-item w-full" onClick={toggleTheme}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}<span>{isDark ? 'Light mode' : 'Dark mode'}</span>
        </button>
        <NavLink to="/settings" onClick={() => setOpen(false)} className="glass-strong glass mt-2 flex items-center gap-3 rounded-2xl p-2.5 transition duration-200 ease-apple hover:-translate-y-0.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#5ac8fa] to-[#0a7aff] text-[13px] font-bold text-white shadow-btn">{initials}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold">{settings.userName || 'Set your name'}</span>
            <span className="flex items-center gap-1.5 text-[11px] text-ink-mute dark:text-ink-darkm">
              {user && <span className={`h-1.5 w-1.5 rounded-full ${sync.status === 'synced' ? 'bg-[#34c759]' : sync.status === 'syncing' ? 'animate-pulse bg-[#0a7aff]' : sync.status === 'error' ? 'bg-[#ff3b30]' : 'bg-[#ff9500]'}`} />}
              {user ? (sync.status === 'synced' ? 'Synced' : sync.status === 'syncing' ? 'Syncing…' : sync.status === 'offline' ? 'Offline' : sync.status === 'error' ? 'Sync issue' : 'Connecting') : format(new Date(), 'EEEE, d MMM')}
            </span>
          </span>
          <ChevronRight size={14} className="text-ink-mute" />
        </NavLink>
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
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 sm:px-8 lg:pt-5">
          <button className="btn-ghost p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <h1 className="text-[17px] font-semibold tracking-tight">{TITLES[pathname] ?? 'PulseX'}</h1>
          <div className="relative z-40 ml-auto flex items-center gap-1 rounded-full glass px-1 py-0.5">
            {needRefresh && <button className="btn-soft hidden sm:inline-flex" onClick={onUpdate}>Update available · reload</button>}
            <NotificationBell />
          </div>
        </header>
        {!settings.notifications.enabled && <NotificationPrompt />}
        <main className="flex-1 overflow-y-auto px-4 pb-8 pt-3 sm:px-8"><div key={pathname} className="page-enter">{children}</div></main>
      </div>
    </div>
  )
}

export const BellIcon = Bell
