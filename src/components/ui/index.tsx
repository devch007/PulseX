import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

export const Card = ({ children, className = '', title, sub, action }: {
  children: ReactNode; className?: string; title?: string; sub?: string; action?: ReactNode
}) => (
  <section className={`card card-pad fade-up ${className}`}>
    {(title || action) && (
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          {title && <h3 className="h-title">{title}</h3>}
          {sub && <p className="h-sub mt-0.5">{sub}</p>}
        </div>
        {action}
      </header>
    )}
    {children}
  </section>
)

export const Modal = ({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean
}) => {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        className={`card glass-strong !bg-[rgba(255,255,255,0.94)] dark:!bg-[rgba(24,26,36,0.94)] w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-b-xl3 sm:rounded-xl3 fade-up`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={title}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line px-5 py-4 backdrop-blur-xl dark:border-line-dark">
          <h2 className="text-base font-semibold">{title}</h2>
          <button className="btn-ghost -mr-2 p-2" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export const Toggle = ({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) => (
  <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
    <span>
      <span className="block text-sm font-medium">{label}</span>
      {desc && <span className="block text-xs text-ink-mute dark:text-ink-darkm">{desc}</span>}
    </span>
    <button
      type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`relative h-[26px] w-[46px] shrink-0 rounded-full transition duration-300 ease-apple ${checked ? 'bg-[#34c759]' : 'bg-black/15 dark:bg-white/20'}`}
    >
      <span className={`absolute top-[2px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-all duration-300 ease-apple ${checked ? 'left-[22px]' : 'left-[2px]'}`} />
    </button>
  </label>
)

export const ProgressRing = ({ value, size = 120, stroke = 10, children, color = '#0a7aff', color2, track }: {
  value: number; size?: number; stroke?: number; children?: ReactNode; color?: string; color2?: string; track?: string
}) => {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - (Math.max(0, Math.min(100, value)) / 100) * c
  const id = `ring-${color.replace('#', '')}-${(color2 ?? '').replace('#', '')}`
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color2 ?? color} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track ?? color} strokeOpacity={track ? 1 : 0.14} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset .9s cubic-bezier(0.32,0.72,0,1)', filter: `drop-shadow(0 0 6px ${color}55)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

export const Empty = ({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent dark:bg-accent-darksoft dark:text-accent-dark">{icon}</div>
    <p className="text-sm font-medium">{title}</p>
    {hint && <p className="mt-1 text-xs text-ink-mute dark:text-ink-darkm">{hint}</p>}
  </div>
)

export const Segmented = <T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]
}) => (
  <div className="seg">
    {options.map((o) => (
      <button key={o.value} onClick={() => onChange(o.value)} className={`seg-btn ${value === o.value ? 'on' : ''}`}>
        {o.label}
      </button>
    ))}
  </div>
)
