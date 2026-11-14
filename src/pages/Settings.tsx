import { useRef, useState } from 'react'
import { BellOff, BellRing, Check, Download, Info, Monitor, Moon, Palette, Plus, RotateCcw, Sun, Trash2, Upload, Database, UserRound, Bell, Sparkles } from 'lucide-react'
import { Card, Segmented, Toggle } from '../components/ui'
import { AuthForm } from '../components/AuthForm'
import { InstallButton } from '../components/InstallButton'
import { cloudEnabled } from '../lib/supabase'
import { signOut } from '../lib/auth'
import { pull } from '../lib/sync'
import { Cloud, CloudOff, LogOut, RefreshCw } from 'lucide-react'
import { useStore, type BackupFile } from '../store/useStore'
import { getPermission, requestPermission, showNotification } from '../lib/notifications'
import { CATEGORY_PALETTE } from '../lib/categories'
import { format } from 'date-fns'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Settings() {
  const s = useStore()
  const { settings, updateSettings, updateNotificationSettings, categories, addCategory, updateCategory, deleteCategory } = s
  const n = settings.notifications
  const [newCat, setNewCat] = useState('')
  const [newColor, setNewColor] = useState(CATEGORY_PALETTE[5])
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const perm = getPermission()

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  const enableNotifs = async () => {
    const p = await requestPermission()
    if (p === 'granted') { updateNotificationSettings({ enabled: true }); flash('Notifications enabled') }
    else flash(p === 'denied' ? 'Blocked by the browser – allow notifications for this site in the address-bar site settings.' : 'Permission not granted')
  }
  const testNotif = () => showNotification({ title: 'PulseX test notification', body: 'This is how reminders will look.', url: '/settings', tag: 'test' })

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(s.exportData(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `pulsex-backup-${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const importJson = async (file: File, mode: 'replace' | 'merge') => {
    try {
      const b = JSON.parse(await file.text()) as BackupFile
      if (b.app !== 'pulsex' || !Array.isArray(b.tasks)) throw new Error('Not a PulseX backup')
      if (mode === 'replace' && !confirm('Replace ALL current data with this backup?')) return
      s.importData(b, mode)
      flash(`Imported ${b.tasks.length} tasks (${mode})`)
    } catch (e) {
      flash(`Import failed: ${(e as Error).message}`)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {msg && <div className="fade-up rounded-xl bg-accent-soft px-4 py-2 text-sm text-accent dark:bg-accent-darksoft dark:text-accent-dark">{msg}</div>}

      <Card title="Account & sync" sub={cloudEnabled ? 'Your data lives in your own Supabase database and syncs across devices' : 'Cloud sync is not configured for this build'}>
        {s.user ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="tile-blue h-11 w-11 rounded-2xl"><Cloud size={20} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{s.user.email}</span>
              <span className="block text-xs text-ink-mute dark:text-ink-darkm">
                {s.sync.status === 'synced' && `Synced${s.sync.lastAt ? ` · ${format(new Date(s.sync.lastAt), 'h:mm a')}` : ''}`}
                {s.sync.status === 'syncing' && 'Syncing…'}
                {s.sync.status === 'offline' && 'Offline – changes will sync when you reconnect'}
                {s.sync.status === 'error' && `Sync problem: ${s.sync.message ?? 'unknown'}`}
                {s.sync.status === 'local' && 'Connecting…'}
              </span>
            </span>
            <button className="btn-outline text-xs" onClick={() => pull().then(() => flash('Synced')).catch((e) => flash(`Sync failed: ${e.message}`))}><RefreshCw size={14} /> Sync now</button>
            <button className="btn-danger text-xs" onClick={() => confirm('Sign out? Local data on this device will be cleared. Your data stays safe in the cloud.') && signOut().then(() => flash('Signed out'))}><LogOut size={14} /> Sign out</button>
          </div>
        ) : cloudEnabled ? (
          <div className="grid gap-5 sm:grid-cols-[1fr_1.2fr]">
            <div>
              <span className="tile-blue mb-3 h-11 w-11 rounded-2xl"><Cloud size={20} /></span>
              <p className="text-sm font-semibold">Sign in to sync</p>
              <p className="mt-1 text-xs text-ink-soft dark:text-ink-darks">Your current tasks on this device are uploaded to your account the first time you sign in, so nothing is lost.</p>
            </div>
            <AuthForm compact onDone={() => flash('Signed in')} />
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <span className="tile-gray h-11 w-11 rounded-2xl"><CloudOff size={20} /></span>
            <p className="text-sm text-ink-soft dark:text-ink-darks">Add <code className="rounded bg-black/5 px-1 dark:bg-white/10">VITE_SUPABASE_URL</code> and <code className="rounded bg-black/5 px-1 dark:bg-white/10">VITE_SUPABASE_ANON_KEY</code> to the build environment and run the SQL in <code className="rounded bg-black/5 px-1 dark:bg-white/10">supabase/schema.sql</code> to enable accounts and multi-device sync. Until then everything is stored on this device.</p>
          </div>
        )}
      </Card>

      <Card title="Profile" sub="Used in greetings and in the weekly report sign-off">
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="label">Your name</label><input className="input" value={settings.userName} onChange={(e) => updateSettings({ userName: e.target.value })} placeholder="e.g. Priya Sharma" /></div>
          <div><label className="label">Manager's name</label><input className="input" value={settings.managerName} onChange={(e) => updateSettings({ managerName: e.target.value })} placeholder="e.g. Rahul Mehta" /></div>
          <div><label className="label">Manager's email</label><input type="email" className="input" value={settings.managerEmail} onChange={(e) => updateSettings({ managerEmail: e.target.value })} placeholder="manager@company.com" /></div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_auto]">
          <div>
            <label className="label">Working days</label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => {
                const on = settings.workingDays.includes(i)
                return (
                  <button key={d} onClick={() => updateSettings({ workingDays: on ? settings.workingDays.filter((x) => x !== i) : [...settings.workingDays, i].sort() })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${on ? 'bg-accent text-white dark:bg-accent-dark dark:text-[#0f1117]' : 'bg-black/5 text-ink-soft dark:bg-white/10 dark:text-ink-darks'}`}>{d}</button>
                )
              })}
            </div>
          </div>
          <div><label className="label">Work starts</label><input type="time" className="input" value={settings.workStart} onChange={(e) => updateSettings({ workStart: e.target.value })} /></div>
          <div><label className="label">Work ends</label><input type="time" className="input" value={settings.workEnd} onChange={(e) => updateSettings({ workEnd: e.target.value })} /></div>
        </div>
      </Card>

      <Card title="Notifications" sub="Reminders are scheduled inside the app and delivered through the browser">
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
          {perm === 'granted' ? <BellRing className="text-emerald-500" size={18} /> : <BellOff className="text-ink-mute" size={18} />}
          <span className="text-sm">
            Browser permission: <span className="font-semibold">{perm}</span>
            {perm === 'denied' && <span className="block text-xs text-ink-mute dark:text-ink-darkm">Blocked. Click the lock icon in the address bar → Notifications → Allow, then reload.</span>}
            {perm === 'unsupported' && <span className="block text-xs text-ink-mute dark:text-ink-darkm">This browser does not support the Notification API.</span>}
          </span>
          <div className="ml-auto flex gap-2">
            {perm !== 'granted' && perm !== 'unsupported' && <button className="btn-primary" onClick={enableNotifs}><Bell size={14} /> Enable notifications</button>}
            {perm === 'granted' && <button className="btn-outline text-xs" onClick={testNotif}>Send test</button>}
          </div>
        </div>
        <div className="hairline">
          <Toggle checked={n.enabled} onChange={(v) => updateNotificationSettings({ enabled: v })} label="Notifications on" desc="Master switch for all alerts below" />
          <Toggle checked={n.reminders} onChange={(v) => updateNotificationSettings({ reminders: v })} label="Due-soon reminders" desc="Before each task is due (set per task; default below)" />
          <div className="flex items-center justify-between gap-4 py-2">
            <span className="text-sm font-medium">Default reminder lead time</span>
            <div className="flex items-center gap-2"><input type="number" min={0} className="input w-24" value={n.defaultReminderMinutes} onChange={(e) => updateNotificationSettings({ defaultReminderMinutes: Number(e.target.value) || 0 })} /><span className="text-xs text-ink-mute">min</span></div>
          </div>
          <Toggle checked={n.overdue} onChange={(v) => updateNotificationSettings({ overdue: v })} label="Overdue alerts" desc="When a task passes its due time" />
          <div className="flex items-center justify-between gap-4 py-2">
            <Toggle checked={n.morningSummary} onChange={(v) => updateNotificationSettings({ morningSummary: v })} label="Morning summary" desc="Count of today's tasks and high-priority items, on working days" />
            <input type="time" className="input w-32" value={n.morningTime} onChange={(e) => updateNotificationSettings({ morningTime: e.target.value })} />
          </div>
          <div className="flex items-center justify-between gap-4 py-2">
            <Toggle checked={n.fridayReminder} onChange={(v) => updateNotificationSettings({ fridayReminder: v })} label="Weekly report reminder" desc="On your last working day, a nudge to review and send the update" />
            <input type="time" className="input w-32" value={n.fridayTime} onChange={(e) => updateNotificationSettings({ fridayTime: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-400/10 dark:text-amber-200">
          <Info size={16} className="mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">How reliable are these reminders?</p>
            <p>PulseX has no server. A timer inside the app checks every 30 seconds and hands notifications to the service worker. That means:</p>
            <ul className="list-disc space-y-0.5 pl-4">
              <li>Reminders fire while PulseX is open in a tab or pinned as an installed app, even if the window is minimised or behind other windows.</li>
              <li>If the browser is fully closed, or the tab is discarded to save memory, nothing fires. Anything missed is shown as soon as you reopen the app (up to 36 hours for overdue items).</li>
              <li>The morning and Friday alerts fire at the set time, or the first time you open the app after it on that day.</li>
              <li>Tip: install PulseX as an app and leave it running in the background for the best results.</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card title="Install as an app" sub="Runs in its own window, pins to your dock or taskbar, and keeps reminders running in the background">
        <InstallButton variant="card" />
      </Card>

      <Card title="Appearance" sub="Theme and categories">
        <label className="label">Theme</label>
        <Segmented value={settings.theme} onChange={(theme) => updateSettings({ theme })} options={[
          { value: 'light', label: <span className="flex items-center gap-1.5"><Sun size={13} />Light</span> },
          { value: 'dark', label: <span className="flex items-center gap-1.5"><Moon size={13} />Dark</span> },
          { value: 'system', label: <span className="flex items-center gap-1.5"><Monitor size={13} />System</span> },
        ]} />
        <div className="mt-5">
          <label className="label"><Palette size={12} className="mr-1 inline -mt-0.5" />Categories</label>
          <ul className="space-y-2">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <input type="color" value={c.color} onChange={(e) => updateCategory(c.id, { color: e.target.value })} className="h-8 w-10 cursor-pointer rounded-lg border border-line bg-transparent p-0.5 dark:border-line-dark" aria-label="Colour" />
                <input className="input flex-1" value={c.name} onChange={(e) => updateCategory(c.id, { name: e.target.value })} />
                <button className="btn-ghost p-2 hover:text-red-600" disabled={categories.length <= 1} onClick={() => confirm(`Delete "${c.name}"? Its tasks move to another category.`) && deleteCategory(c.id)} aria-label="Delete category"><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
          <form className="mt-3 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (newCat.trim()) { addCategory(newCat.trim(), newColor); setNewCat(''); setNewColor(CATEGORY_PALETTE[(categories.length + 1) % CATEGORY_PALETTE.length]) } }}>
            <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-8 w-10 cursor-pointer rounded-lg border border-line bg-transparent p-0.5 dark:border-line-dark" aria-label="New colour" />
            <input className="input flex-1" placeholder="New category, e.g. Payroll" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
            <button className="btn-soft" type="submit"><Plus size={14} /> Add</button>
          </form>
        </div>
      </Card>

      <Card title="Data & backup" sub="Everything lives in this browser's localStorage. Export regularly so you never lose data.">
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={exportJson}><Download size={15} /> Export backup (JSON)</button>
          <button className="btn-outline" onClick={() => { fileRef.current!.dataset.mode = 'merge'; fileRef.current!.click() }}><Upload size={15} /> Import & merge</button>
          <button className="btn-outline" onClick={() => { fileRef.current!.dataset.mode = 'replace'; fileRef.current!.click() }}><Database size={15} /> Import & replace</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f, (e.target.dataset.mode as 'merge' | 'replace') || 'merge'); e.target.value = '' }} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4 dark:border-line-dark">
          <button className="btn-outline text-xs" onClick={() => { s.loadSamples(); flash('Sample tasks loaded') }}><Sparkles size={14} /> Load sample tasks</button>
          <button className="btn-outline text-xs" onClick={() => { s.clearSamples(); flash('Sample tasks removed') }}><Trash2 size={14} /> Clear sample tasks</button>
          <button className="btn-danger text-xs" onClick={() => confirm('Delete ALL tasks, reports and settings? Export a backup first.') && s.resetAll()}><RotateCcw size={14} /> Reset everything</button>
          <button className="btn-outline text-xs" onClick={() => { s.setOnboarded(false); window.location.assign('/welcome') }}>Show welcome again</button>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-mute dark:text-ink-darkm"><UserRound size={12} /> No account, no server. Data stays on this device.<Check size={12} className="text-emerald-500" /></p>
      </Card>
    </div>
  )
}
