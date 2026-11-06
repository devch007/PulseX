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
        className={`card w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-b-xl2`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={title}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-card px-5 py-4 dark:border-line-dark dark:bg-card-dark">
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
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-accent dark:bg-accent-dark' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  </label>
)

export const ProgressRing = ({ value, size = 120, stroke = 10, children, color = '#4f46e5', track }: {
  value: number; size?: number; stroke?: number; children?: ReactNode; color?: string; track?: string
}) => {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - (Math.max(0, Math.min(100, value)) / 100) * c
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track ?? 'currentColor'} className={track ? '' : 'text-line dark:text-line-dark'} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset .6s ease' }} />
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
  <div className="inline-flex rounded-xl bg-black/5 p-1 dark:bg-white/5">
    {options.map((o) => (
      <button key={o.value} onClick={() => onChange(o.value)}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${value === o.value ? 'bg-card text-ink shadow-sm dark:bg-card-dark dark:text-ink-darkp' : 'text-ink-soft hover:text-ink dark:text-ink-darks'}`}>
        {o.label}
      </button>
    ))}
  </div>
)
