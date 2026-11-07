import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarDays, Clock, Flag, Lock, Repeat, Tag, Timer, Trash2 } from 'lucide-react'
import { Modal, Toggle } from '../ui'
import { useStore } from '../../store/useStore'
import type { Priority, RecurrenceFreq, Status, Task } from '../../types'
import { combineDateTime, splitDateTime } from '../../lib/dates'
import { addDays, format, nextMonday } from 'date-fns'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const REMIND = [0, 5, 15, 30, 60, 1440]
const remindLabel = (m: number) => (m === 0 ? 'At time' : m < 60 ? `${m} min` : m === 60 ? '1 hour' : '1 day')

const Section = ({ icon, title, children, aside }: { icon: React.ReactNode; title: string; children: React.ReactNode; aside?: React.ReactNode }) => (
  <section className="rounded-2xl bg-black/[0.035] p-3.5 dark:bg-white/[0.05]">
    <div className="mb-2.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-mute dark:text-ink-darkm">
      {icon}{title}{aside && <span className="ml-auto normal-case tracking-normal">{aside}</span>}
    </div>
    {children}
  </section>
)

const Pill = ({ on, onClick, children, color }: { on: boolean; onClick: () => void; children: React.ReactNode; color?: string }) => (
  <button type="button" onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition duration-200 ease-apple active:scale-95 ${
      on ? 'border-transparent bg-accent text-white shadow-btn dark:bg-accent-dark dark:text-[#07111f]' : 'border-transparent bg-white/80 text-ink-soft hover:bg-white dark:bg-white/[0.07] dark:text-ink-darks dark:hover:bg-white/[0.12]'
    }`}
    style={on && color ? { background: color, boxShadow: `0 6px 16px -6px ${color}99` } : undefined}>
    {color && <span className={`h-2 w-2 rounded-full ${on ? 'bg-white/90' : ''}`} style={on ? undefined : { background: color }} />}
    {children}
  </button>
)

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
  const [reminder, setReminder] = useState(settings.notifications.defaultReminderMinutes)
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
    setDate(dt.date); setTime(dt.time || settings.workEnd || '18:00')
    setTimeSpent(t.timeSpent ? String(t.timeSpent) : '')
    setReminder(t.reminderMinutes ?? settings.notifications.defaultReminderMinutes)
    setFreq(t.recurrence?.freq ?? 'none')
    setWeekday(t.recurrence?.weekday ?? 1)
    setDom(t.recurrence?.dayOfMonth ?? 20)
    setBlocked(!!t.blocked)
  }, [open, task, defaults, categories, settings.notifications.defaultReminderMinutes, settings.workEnd])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const patch = {
      title: title.trim(), notes: notes.trim() || undefined, categoryId, priority, status,
      dueAt: combineDateTime(date, time),
      timeSpent: timeSpent ? Number(timeSpent) : undefined,
      reminderMinutes: reminder,
      recurrence: { freq, weekday: freq === 'weekly' ? weekday : undefined, dayOfMonth: freq === 'monthly' ? dom : undefined },
      blocked,
    }
    if (task) updateTask(task.id, { ...patch, completedAt: status === 'done' ? task.completedAt ?? new Date().toISOString() : undefined })
    else addTask({ ...patch, completedAt: status === 'done' ? new Date().toISOString() : undefined })
    onClose()
  }

  const quickDates: [string, Date][] = [['Today', new Date()], ['Tomorrow', addDays(new Date(), 1)], ['Next Mon', nextMonday(new Date())]]

  return (
    <Modal open={open} onClose={onClose} title={task ? 'Edit task' : 'New task'} wide>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <input className="input !bg-transparent !px-0 !py-1 !text-[22px] font-semibold tracking-tight !ring-0 placeholder:font-normal dark:!bg-transparent" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" autoFocus required />
          <textarea className="input mt-1 min-h-[56px] !bg-transparent !px-0 !py-1 text-sm !ring-0 dark:!bg-transparent" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes, reference numbers, what's blocking…" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Section icon={<Tag size={13} />} title="Category">
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => <Pill key={c.id} on={categoryId === c.id} onClick={() => setCategoryId(c.id)} color={c.color}>{c.name}</Pill>)}
            </div>
          </Section>
          <Section icon={<Flag size={13} />} title="Priority">
            <div className="seg w-full">
              {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                <button type="button" key={p} onClick={() => setPriority(p)} className={`seg-btn flex-1 capitalize ${priority === p ? 'on' : ''}`}>
                  <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${p === 'high' ? 'bg-[#ff3b30]' : p === 'medium' ? 'bg-[#ff9500]' : 'bg-[#34c759]'}`} />{p}
                </button>
              ))}
            </div>
            <div className="seg mt-2 w-full">
              {([['todo', 'To do'], ['inprogress', 'In progress'], ['done', 'Done']] as [Status, string][]).map(([s, l]) => (
                <button type="button" key={s} onClick={() => setStatus(s)} className={`seg-btn flex-1 ${status === s ? 'on' : ''}`}>{l}</button>
              ))}
            </div>
          </Section>
        </div>

        <Section icon={<CalendarDays size={13} />} title="Due" aside={date ? <button type="button" className="text-accent dark:text-accent-dark" onClick={() => setDate('')}>Clear</button> : undefined}>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <div className="flex flex-wrap gap-1.5">
              {quickDates.map(([l, d]) => <Pill key={l} on={date === format(d, 'yyyy-MM-dd')} onClick={() => setDate(format(d, 'yyyy-MM-dd'))}>{l}</Pill>)}
              <input type="date" className="input w-auto !py-1.5" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-soft dark:text-ink-darks"><Clock size={14} /><input type="time" className="input w-[140px] !py-1.5" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-ink-mute dark:text-ink-darkm">Remind</span>
            {REMIND.map((m) => <Pill key={m} on={reminder === m} onClick={() => setReminder(m)}>{remindLabel(m)}</Pill>)}
            <span className="text-xs text-ink-mute dark:text-ink-darkm">before</span>
          </div>
        </Section>

        <div className="grid gap-3 sm:grid-cols-2">
          <Section icon={<Repeat size={13} />} title="Repeats">
            <div className="flex flex-wrap gap-1.5">
              {(['none', 'daily', 'weekly', 'monthly'] as RecurrenceFreq[]).map((f) => <Pill key={f} on={freq === f} onClick={() => setFreq(f)}>{f === 'none' ? 'Never' : f[0].toUpperCase() + f.slice(1)}</Pill>)}
            </div>
            {freq === 'weekly' && (
              <div className="mt-2 flex gap-1">
                {WEEKDAYS.map((d, i) => <button type="button" key={d} onClick={() => setWeekday(i)} className={`h-8 w-8 rounded-full text-[11px] font-semibold transition ${weekday === i ? 'bg-accent text-white dark:bg-accent-dark dark:text-[#07111f]' : 'bg-white/80 text-ink-soft dark:bg-white/10 dark:text-ink-darks'}`}>{d[0]}</button>)}
              </div>
            )}
            {freq === 'monthly' && (
              <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft dark:text-ink-darks">On day <input type="number" min={1} max={31} className="input w-20 !py-1.5" value={dom} onChange={(e) => setDom(Number(e.target.value))} /> of each month</label>
            )}
          </Section>
          <Section icon={<Timer size={13} />} title="Tracking">
            <label className="flex items-center justify-between gap-3 py-1 text-sm">
              <span className="font-medium">Time spent</span>
              <span className="flex items-center gap-1.5"><input type="number" min={0} className="input w-24 !py-1.5 text-right" value={timeSpent} onChange={(e) => setTimeSpent(e.target.value)} placeholder="0" /><span className="text-xs text-ink-mute">min</span></span>
            </label>
            <Toggle checked={blocked} onChange={setBlocked} label="Blocked / need support" desc="Shows in the weekly report under support needed" />
          </Section>
        </div>

        <div className="flex items-center justify-between pt-1">
          {task ? (
            <button type="button" className="btn-danger" onClick={() => { if (confirm('Delete this task?')) { deleteTask(task.id); onClose() } }}><Trash2 size={14} /> Delete</button>
          ) : <span className="flex items-center gap-1.5 text-[11px] text-ink-mute dark:text-ink-darkm">{blocked && <><Lock size={11} /> Blocked</>}{priority === 'high' && <><AlertTriangle size={11} /> High priority</>}</span>}
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary px-5">{task ? 'Save changes' : 'Add task'}</button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
