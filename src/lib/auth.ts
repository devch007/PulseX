import { supabase, redirectTo } from './supabase'
import { useStore } from '../store/useStore'
import { startSync, stopSync } from './sync'

export const signInWithPassword = async (email: string, password: string) => {
  if (!supabase) throw new Error('Cloud sync is not configured')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

/** Returns true when a session exists immediately, false when email confirmation is required. */
export const signUp = async (email: string, password: string, name: string) => {
  if (!supabase) throw new Error('Cloud sync is not configured')
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: redirectTo() } })
  if (error) throw error
  return !!data.session
}

export const sendMagicLink = async (email: string) => {
  if (!supabase) throw new Error('Cloud sync is not configured')
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } })
  if (error) throw error
}

export const signInWithGoogle = async () => {
  if (!supabase) throw new Error('Cloud sync is not configured')
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } })
  if (error) throw error
}

export const signOut = async () => {
  stopSync()
  await supabase?.auth.signOut()
  const s = useStore.getState()
  s.setUser(null)
  s.resetAll()
  s.setSync({ status: 'local', lastAt: undefined, message: undefined })
}

/** Wire Supabase auth state into the store and start/stop sync. Returns an unsubscribe. */
export const bindAuth = () => {
  if (!supabase) return () => undefined
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const s = useStore.getState()
    if (session?.user) {
      const u = { id: session.user.id, email: session.user.email ?? '' }
      if (s.user?.id !== u.id) s.setUser(u)
      void startSync(u.id)
    } else if (s.user) {
      // session expired or signed out elsewhere
      stopSync()
      s.setUser(null)
      s.setSync({ status: 'local' })
    }
  })
  return () => data.subscription.unsubscribe()
}
