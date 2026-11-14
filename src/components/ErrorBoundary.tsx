import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw, TriangleAlert } from 'lucide-react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('PulseX crashed', error, info) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="card sheet w-full max-w-md p-6 text-center">
          <span className="tile-red mx-auto mb-3 h-12 w-12 rounded-2xl"><TriangleAlert size={22} /></span>
          <h2 className="text-lg font-bold tracking-tight">Something went wrong</h2>
          <p className="mt-1 text-sm text-ink-soft dark:text-ink-darks">Your data is safe. Reload to continue.</p>
          <pre className="mt-3 max-h-24 overflow-auto rounded-xl bg-black/[0.04] p-2 text-left text-[11px] text-ink-mute dark:bg-white/[0.06]">{this.state.error.message}</pre>
          <button className="btn-primary mt-4" onClick={() => window.location.reload()}><RefreshCw size={15} /> Reload</button>
        </div>
      </div>
    )
  }
}
