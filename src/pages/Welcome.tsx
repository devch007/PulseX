import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BarChart3, BellRing, Check, ChevronLeft, Cloud, CloudOff, FileText, ListChecks, Moon, Sparkles, Sun, Zap } from 'lucide-react'
import { AuthForm } from '../components/AuthForm'
import { Toggle } from '../components/ui'
import { useStore } from '../store/useStore'
import { cloudEnabled } from '../lib/supabase'
import { getPermission, requestPermission } from '../lib/notifications'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
type Step = 'welcome' | 'account' | 'profile' | 'notify' | 'ready'
const ORDER: Step[] = ['welcome', 'account', 'profile', 'notify', 'ready']

export default function Welcome() {
  const navigate = useNavigate()
  const { settings, updateSettings, updateNotificationSettings, user, setOnboarded, clearSamples, tasks, sync } = useStore()
  const [step, setStep] = useState<Step>('welcome')
  const [keepSamples, setKeepSamples] = useState(true)
  const idx = ORDER.indexOf(step)
  const isDark = document.documentElement.classList.contains('dark')

  // returning from a magic link / OAuth: skip ahead once the account is in
  useEffect(() => {
    if (user && step === 'account') setStep(settings.userName ? 'notify' : 'profile')
  }, [user, step, settings.userName])

  const next = () => setStep(ORDER[Math.min(idx + 1, ORDER.length - 1)])
  const back = () => setStep(ORDER[Math.max(idx - 1, 0)])
  const finish = () => {
    if (!keepSamples) clearSamples()
    setOnboarded(true)
    navigate('/', { replace: true })
  }
  const perm = getPermission()
  const enable = async () => {
    const p = await requestPermission()
    if (p === 'granted') updateNotificationSettings({ enabled: true })
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4 sm:p-8">
      <button className="btn-ghost absolute right-4 top-4 p-2" onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })} aria-label="Toggle theme">
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="glass glass-strong fade-up w-full max-w-[560px] overflow-hidden rounded-xl3">
        {step === 'welcome' ? (
          <div className="hero rounded-none p-8 pb-10 text-center sm:p-10">
            <div className="relative mx-auto mb-5 grid h-20 w-20 place-items-center rounded-[24px] bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur">
              <Zap size={38} fill="currentColor" />
            </div>
            <p className="relative text-[12px] font-semibold uppercase tracking-[0.18em] text-white/80">Welcome to</p>
            <h1 className="relative mt-1 text-[40px] font-bold leading-none tracking-[-0.035em]">PulseX</h1>
            <p className="relative mx-auto mt-3 max-w-sm text-[15px] text-white/85">Your week, beautifully organised. Built for accountants who close the books and still leave on time.</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-6 pt-5">
            <button className="btn-ghost -ml-2 p-2" onClick={back} aria-label="Back"><ChevronLeft size={18} /></button>
            <div className="flex flex-1 items-center justify-center gap-1.5">
              {ORDER.slice(1).map((s, i) => (
                <span key={s} className={`h-1.5 rounded-full transition-all duration-500 ease-apple ${i + 1 <= idx ? 'w-6 bg-accent dark:bg-accent-dark' : 'w-1.5 bg-black/15 dark:bg-white/20'}`} />
              ))}
            </div>
            <span className="w-8" />
          </div>
        )}

        <div className="p-6 sm:p-8">
          {step === 'welcome' && (
            <div className="fade-up">
              <div className="stagger grid gap-3 sm:grid-cols-3">
                {[
                  { t: 'See your day', d: 'Progress ring, streaks and what is due next.', tile: 'tile-blue', icon: <BarChart3 size={18} /> },
                  { t: 'Friday in one click', d: 'A polished weekly update for your manager.', tile: 'tile-purple', icon: <FileText size={18} /> },
                  { t: 'Never miss a filing', d: 'Reminders for GST, TDS and month-end.', tile: 'tile-orange', icon: <BellRing size={18} /> },
                ].map((f) => (
                  <div key={f.t} className="card fade-up p-4">
                    <span className={`${f.tile} mb-3 h-9 w-9`}>{f.icon}</span>
                    <p className="text-[13.5px] font-semibold tracking-tight">{f.t}</p>
                    <p className="mt-0.5 text-xs text-ink-soft dark:text-ink-darks">{f.d}</p>
                  </div>
                ))}
              </div>
              <button className="btn-primary mt-6 w-full py-3 text-[15px]" onClick={next}>Get started <ArrowRight size={16} /></button>
              <p className="mt-3 text-center text-[11px] text-ink-mute dark:text-ink-darkm">Takes about a minute. No credit card, no tracking.</p>
            </div>
          )}

          {step === 'account' && (
            <div className="fade-up">
              <div className="mb-5 text-center">
                <span className={`${cloudEnabled ? 'tile-blue' : 'tile-gray'} mx-auto mb-3 h-12 w-12 rounded-2xl`}>{cloudEnabled ? <Cloud size={22} /> : <CloudOff size={22} />}</span>
                <h2 className="text-[22px] font-bold tracking-tight">Your account</h2>
                <p className="mt-1 text-sm text-ink-soft dark:text-ink-darks">
                  {cloudEnabled ? 'Sign in to sync your tasks across devices and keep them safe in your own Supabase database.' : 'Cloud sync is not configured yet, so PulseX will keep everything on this device.'}
                </p>
              </div>
              {cloudEnabled ? <AuthForm onDone={() => setStep(settings.userName ? 'notify' : 'profile')} /> : null}
              <button className={`${cloudEnabled ? 'btn-ghost' : 'btn-primary'} mt-3 w-full py-2.5`} onClick={next}>
                {cloudEnabled ? 'Continue without an account' : 'Continue on this device'} <ArrowRight size={15} />
              </button>
            </div>
          )}

          {step === 'profile' && (
            <div className="fade-up space-y-4">
              <div className="text-center">
                <span className="tile-teal mx-auto mb-3 h-12 w-12 rounded-2xl"><Sparkles size={22} /></span>
                <h2 className="text-[22px] font-bold tracking-tight">A little about you</h2>
                <p className="mt-1 text-sm text-ink-soft dark:text-ink-darks">Used for greetings and to sign your weekly report.</p>
              </div>
              <div>
                <label className="label">Your name</label>
                <input className="input" value={settings.userName} onChange={(e) => updateSettings({ userName: e.target.value })} placeholder="e.g. Priya Sharma" autoFocus />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label">Manager's name</label><input className="input" value={settings.managerName} onChange={(e) => updateSettings({ managerName: e.target.value })} placeholder="e.g. Rahul Mehta" /></div>
                <div><label className="label">Manager's email</label><input className="input" type="email" value={settings.managerEmail} onChange={(e) => updateSettings({ managerEmail: e.target.value })} placeholder="manager@company.com" /></div>
              </div>
              <div>
                <label className="label">Working days</label>
                <div className="flex gap-1.5">
                  {DAYS.map((d, i) => {
                    const on = settings.workingDays.includes(i)
                    return (
                      <button key={i} onClick={() => updateSettings({ workingDays: on ? settings.workingDays.filter((x) => x !== i) : [...settings.workingDays, i].sort() })}
                        className={`h-9 w-9 rounded-full text-xs font-semibold transition duration-200 ease-apple ${on ? 'bg-accent text-white shadow-btn dark:bg-accent-dark dark:text-[#07111f]' : 'bg-black/[0.06] text-ink-soft dark:bg-white/10 dark:text-ink-darks'}`}>{d}</button>
                    )
                  })}
                </div>
              </div>
              <button className="btn-primary mt-2 w-full py-2.5" onClick={next} disabled={!settings.userName.trim()}>Continue <ArrowRight size={15} /></button>
            </div>
          )}

          {step === 'notify' && (
            <div className="fade-up">
              <div className="text-center">
                <span className="tile-red mx-auto mb-3 h-12 w-12 rounded-2xl"><BellRing size={22} /></span>
                <h2 className="text-[22px] font-bold tracking-tight">Gentle reminders</h2>
                <p className="mt-1 text-sm text-ink-soft dark:text-ink-darks">A nudge before a deadline, a morning summary, and a Friday reminder to send your report. Nothing leaves your browser.</p>
              </div>
              <div className="card mt-5 divide-y-0 p-2 hairline">
                {[
                  ['Before a task is due', `${settings.notifications.defaultReminderMinutes} minutes ahead by default`],
                  ['Morning summary', `${settings.notifications.morningTime} on working days`],
                  ['Friday report nudge', `${settings.notifications.fridayTime} every Friday`],
                ].map(([t, d]) => (
                  <div key={t} className="flex items-center gap-3 px-3 py-2.5">
                    <Check size={16} className="text-[#34c759]" />
                    <span><span className="block text-sm font-medium">{t}</span><span className="block text-xs text-ink-mute dark:text-ink-darkm">{d}</span></span>
                  </div>
                ))}
              </div>
              {perm === 'granted' && settings.notifications.enabled ? (
                <button className="btn-primary mt-5 w-full py-2.5" onClick={next}>Reminders are on <ArrowRight size={15} /></button>
              ) : (
                <>
                  <button className="btn-primary mt-5 w-full py-2.5" onClick={enable} disabled={perm === 'denied' || perm === 'unsupported'}>Turn on reminders</button>
                  <button className="btn-ghost mt-2 w-full" onClick={next}>Maybe later</button>
                  {perm === 'denied' && <p className="mt-2 text-center text-[11px] text-ink-mute">Notifications are blocked for this site in your browser. You can allow them later from the address bar.</p>}
                </>
              )}
            </div>
          )}

          {step === 'ready' && (
            <div className="fade-up text-center">
              <span className="tile-green mx-auto mb-3 h-14 w-14 rounded-[18px]"><Check size={28} strokeWidth={3} /></span>
              <h2 className="text-[22px] font-bold tracking-tight">You're all set{settings.userName ? `, ${settings.userName.split(' ')[0]}` : ''}</h2>
              <p className="mt-1 text-sm text-ink-soft dark:text-ink-darks">
                {user ? <>Signed in as <span className="font-medium text-ink dark:text-ink-darkp">{user.email}</span>. {sync.status === 'synced' ? 'Your data is synced.' : 'Syncing your data…'}</> : 'Everything stays on this device. You can sign in any time from Settings.'}
              </p>
              <div className="card mt-5 p-2 text-left">
                <Toggle checked={keepSamples} onChange={setKeepSamples} label="Start with sample tasks" desc={`${tasks.filter((t) => t.sample).length} realistic accounting tasks so you can explore. Clear them any time.`} />
              </div>
              <button className="btn-primary mt-5 w-full py-3 text-[15px]" onClick={finish}><ListChecks size={16} /> Open my dashboard</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
