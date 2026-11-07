import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Modal } from '../ui'
import { useStore } from '../../store/useStore'
import type { Priority, RecurrenceFreq, Status, Task } from '../../types'
import { combineDateTime, splitDateTime } from '../../lib/dates'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const TaskModal = ({ task, open, onClose, defaults }: {
  task: Task | null; open: boolean; onClose: () => void; defaults?: Partial<Task>
}) => {
  const { categories, addTask, updateTask, deleteTask, settings } = useStore()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? 'admin')
  const [priority, setPriority] = useState<Priority>('medium')
  const [status, setStatus] = useState<Status>('todo')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('18:00')
  const [timeSpent, setTimeSpent] = useState('')
  const [reminder, setReminder] = useState(String(settings.notifications.defaultReminderMinutes))
  const [freq, setFreq] = useState<RecurrenceFreq>('none')
  const [weekday, setWeekday] = useState(1)
  const [dom, setDom] = useState(20)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    if (!open) return
    const t = task ?? ({ ...defaults } as Partial<Task>)
    setTitle(t.title ?? '')
    setNotes(t.notes ?? '')
    setCategoryId(t.categoryId ?? categories[0]?.id ?? 'admin')
    setPriority(t.priority ?? 'medium')
    setStatus(t.status ?? 'todo')
    const dt = splitDateTime(t.dueAt)
    setDate(dt.date); setTime(dt.time || '18:00')
    setTimeSpent(t.timeSpent ? String(t.timeSpent) : '')
    setReminder(String(t.reminderMinutes ?? settings.notifications.defaultReminderMinutes))
    setFreq(t.recurrence?.freq ?? 'none')
    setWeekday(t.recurrence?.weekday ?? 1)
    setDom(t.recurrence?.dayOfMonth ?? 20)
    setBlocked(!!t.blocked)
  }, [open, task, defaults, categories, settings.notifications.defaultReminderMinutes])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const patch = {
      title: title.trim(), notes: notes.trim() || undefined, categoryId, priority, status,
      dueAt: combineDateTime(date, time),
      timeSpent: timeSpent ? Number(timeSpent) : undefined,
      reminderMinutes: Number(reminder) || 0,
      recurrence: { freq, weekday: freq === 'weekly' ? weekday : undefined, dayOfMonth: freq === 'monthly' ? dom : undefined },
      blocked,
    }
    if (task) {
      updateTask(task.id, {
        ...patch,
        completedAt: status === 'done' ? task.completedAt ?? new Date().toISOString() : undefined,
      })
    } else {
      addTask({ ...patch, completedAt: status === 'done' ? new Date().toISOString() : undefined })
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={task ? 'Edit task' : 'New task'}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bank reconciliation – HDFC (October)" autoFocus required />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input min-h-[72px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Context, reference numbers, what's blocking…" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Category</label>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              <option value="todo">To Do</option><option value="inprogress">In Progress</option><option value="done">Done</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-1 sm:col-span-2">
            <label className="label">Due date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Time</label>
            <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <label className="label">Remind (min before)</label>
            <input type="number" min={0} className="input" value={reminder} onChange={(e) => setReminder(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="label">Repeats</label>
            <select className="input" value={freq} onChange={(e) => setFreq(e.target.value as RecurrenceFreq)}>
              <option value="none">Never</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            </select>
          </div>
          {freq === 'weekly' && (
            <div>
              <label className="label">On</label>
              <select className="input" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
                {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </div>
          )}
          {freq === 'monthly' && (
            <div>
              <label className="label">Day of month</label>
              <input type="number" min={1} max={31} className="input" value={dom} onChange={(e) => setDom(Number(e.target.value))} />
            </div>
          )}
          <div>
            <label className="label">Time spent (min)</label>
            <input type="number" min={0} className="input" value={timeSpent} onChange={(e) => setTimeSpent(e.target.value)} placeholder="0" />
          </div>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 py-2 text-sm">
              <input type="checkbox" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} className="h-4 w-4 accent-[#0a7aff]" />
              Blocked / need support
            </label>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          {task ? (
            <button type="button" className="btn-danger" onClick={() => { if (confirm('Delete this task?')) { deleteTask(task.id); onClose() } }}>
              <Trash2 size={14} /> Delete
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">{task ? 'Save changes' : 'Add task'}</button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
