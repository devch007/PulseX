import { Check, Clock, Lock, Pencil, Trash2 } from 'lucide-react'
import { categoryOf, useStore } from '../../store/useStore'
import type { Task } from '../../types'
import { fmtDate, isOverdue, relativeDue } from '../../lib/dates'
import { CategoryTag, OverdueBadge, PriorityBadge, RecurBadge } from './Badges'
import { PRIORITY_META } from '../../lib/categories'

export const TaskCard = ({ task, onEdit, compact, highlight }: {
  task: Task; onEdit: (t: Task) => void; compact?: boolean; highlight?: boolean
}) => {
  const cats = useStore((s) => s.categories)
  const toggleDone = useStore((s) => s.toggleDone)
  const deleteTask = useStore((s) => s.deleteTask)
  const cat = categoryOf(cats, task.categoryId)
  const overdue = isOverdue(task.dueAt, task.status)
  const done = task.status === 'done'

  return (
    <article
      id={`task-${task.id}`}
      className={`group card relative flex gap-3 p-3.5 transition hover:shadow-md ${done ? 'opacity-70' : ''} ${
        overdue ? 'border-red-200 dark:border-red-500/40' : ''
      } ${highlight ? 'ring-2 ring-accent/50' : ''}`}
    >
      <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r" style={{ background: PRIORITY_META[task.priority].color }} />
      <button
        onClick={() => toggleDone(task.id)}
        aria-label={done ? 'Mark as not done' : 'Mark as done'}
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition ${
          done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 hover:border-accent dark:border-gray-600'
        }`}
      >
        {done && <Check size={12} strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium leading-snug ${done ? 'line-through text-ink-mute dark:text-ink-darkm' : ''}`}>{task.title}</p>
          <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            <button className="btn-ghost p-1.5" onClick={() => onEdit(task)} aria-label="Edit"><Pencil size={14} /></button>
            <button className="btn-ghost p-1.5 hover:text-red-600" onClick={() => confirm('Delete this task?') && deleteTask(task.id)} aria-label="Delete"><Trash2 size={14} /></button>
          </div>
        </div>
        {!compact && task.notes && <p className="mt-1 line-clamp-2 text-xs text-ink-soft dark:text-ink-darks">{task.notes}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <CategoryTag category={cat} small />
          <PriorityBadge priority={task.priority} />
          {overdue && <OverdueBadge />}
          <RecurBadge task={task} />
          {task.blocked && !done && <span className="chip bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"><Lock size={10} />Blocked</span>}
          {task.dueAt && (
            <span className={`ml-auto inline-flex items-center gap-1 text-[11px] ${overdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-ink-mute dark:text-ink-darkm'}`}>
              <Clock size={11} />{done ? `Done · ${fmtDate(task.completedAt ?? task.dueAt, 'd MMM')}` : relativeDue(task.dueAt)}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
