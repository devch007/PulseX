import { useState } from 'react'
import { Loader2, Mail, MailCheck } from 'lucide-react'
import { sendMagicLink, signInWithGoogle, signInWithPassword, signUp } from '../lib/auth'
import { useStore } from '../store/useStore'

type Mode = 'signin' | 'signup' | 'magic'

export const AuthForm = ({ onDone, compact }: { onDone?: () => void; compact?: boolean }) => {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState(useStore.getState().settings.userName)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [sent, setSent] = useState<'magic' | 'confirm' | null>(null)
  const updateSettings = useStore((s) => s.updateSettings)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr('')
    try { await fn() } catch (e) { setErr((e as Error).message || 'Something went wrong') } finally { setBusy(false) }
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'magic') return run(async () => { await sendMagicLink(email); setSent('magic') })
    if (mode === 'signup') return run(async () => {
      if (name.trim()) updateSettings({ userName: name.trim() })
      const ok = await signUp(email, password, name.trim())
      if (ok) onDone?.(); else setSent('confirm')
    })
    return run(async () => { await signInWithPassword(email, password); onDone?.() })
  }

  if (sent) {
    return (
      <div className="fade-up py-6 text-center">
        <div className="tile-green mx-auto mb-4 h-14 w-14 rounded-[18px]"><MailCheck size={26} /></div>
        <h3 className="text-lg font-semibold tracking-tight">Check your inbox</h3>
        <p className="mx-auto mt-1 max-w-xs text-sm text-ink-soft dark:text-ink-darks">
          {sent === 'magic' ? 'We sent a sign-in link to ' : 'We sent a confirmation link to '}<span className="font-medium text-ink dark:text-ink-darkp">{email}</span>. Open it on this device to continue.
        </p>
        <button className="btn-ghost mt-4 text-xs" onClick={() => setSent(null)}>Use a different email</button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="seg w-full">
        {([['signin', 'Sign in'], ['signup', 'Create account'], ['magic', 'Email link']] as [Mode, string][]).map(([m, l]) => (
          <button type="button" key={m} onClick={() => { setMode(m); setErr('') }} className={`seg-btn flex-1 ${mode === m ? 'on' : ''}`}>{l}</button>
        ))}
      </div>
      {mode === 'signup' && (
        <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      )}
      <input className="input" type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      {mode !== 'magic' && (
        <input className="input" type="password" required minLength={6} placeholder={mode === 'signup' ? 'Choose a password (6+ characters)' : 'Password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
      )}
      {err && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300">{err}</p>}
      <button className="btn-primary w-full py-2.5" disabled={busy}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : mode === 'magic' ? <Mail size={16} /> : null}
        {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send me a link'}
      </button>
      {!compact && (
        <>
          <div className="flex items-center gap-3 py-1 text-[11px] text-ink-mute"><span className="h-px flex-1 bg-black/10 dark:bg-white/10" />or<span className="h-px flex-1 bg-black/10 dark:bg-white/10" /></div>
          <button type="button" className="btn-outline w-full py-2.5" disabled={busy} onClick={() => run(signInWithGoogle)}>
            <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.2 5.2C40.8 35.6 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
            Continue with Google
          </button>
          <p className="text-center text-[11px] text-ink-mute dark:text-ink-darkm">Google works once it is enabled in your Supabase project.</p>
        </>
      )}
    </form>
  )
}
