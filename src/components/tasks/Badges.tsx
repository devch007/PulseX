import { AlertTriangle, Flag, Repeat } from 'lucide-react'
import { PRIORITY_META } from '../../lib/categories'
import type { Category, Priority, Task } from '../../types'

export const CategoryTag = ({ category, small }: { category: Category; small?: boolean }) => (
  <span className={`chip ${small ? 'px-1.5' : ''}`} style={{ background: `${category.color}1f`, color: category.color }}>
    <span className="h-1.5 w-1.5 rounded-full" style={{ background: category.color }} />
    <span className="text-ink dark:text-ink-darkp">{category.name}</span>
  </span>
)

export const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const m = PRIORITY_META[priority]
  return <span className={`chip ${m.bg}`}><Flag size={10} />{m.label}</span>
}

export const OverdueBadge = () => (
  <span className="chip bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"><AlertTriangle size={10} />Overdue</span>
)

export const RecurBadge = ({ task }: { task: Task }) =>
  task.recurrence.freq === 'none' ? null : (
    <span className="chip bg-black/5 text-ink-soft dark:bg-white/10 dark:text-ink-darks" title={`Repeats ${task.recurrence.freq}`}>
      <Repeat size={10} />{task.recurrence.freq}
    </span>
  )
