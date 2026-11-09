import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, Check, ChevronDown, Lock, Trash2, X } from 'lucide-react'
import { useStore, categoryOf } from '../../store/useStore'
import type { Priority, RecurrenceFreq, Status, Task } from '../../types'
import { combineDateTime, splitDateTime } from '../../lib/dates'
import { TaskCard } from './TaskCard'
import { addDays, format, nextMonday } from 'date-fns'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const REMIND = [0, 5, 15, 30, 60, 1440]
const remindLabel = (m: number) => (m === 0 ? 'At due time' : m < 60 ? `${m} min before` : m === 60 ? '1 hour before' : '1 day before')
const ordinal = (n: number) => `${n}${[1, 21, 31].includes(n) ? 'st' : [2, 22].includes(n) ? 'nd' : [3, 23].includes(n) ? 'rd' : 'th'}`

/* ---- building blocks for the property rail ---- */
const Group = ({ children }: { children: React.ReactNode }) => (
  <div className="hairline row-enter overflow-hidden rounded-2xl bg-black/[0.035] dark:bg-white/[0.05]">{children}</div>
)
const Row = ({ label, children, stack }: { label: string; children: React.ReactNode; stack?: boolean }) => (
  <div className={`flex ${stack ? 'flex-col gap-2' : 'items-center justify-between gap-3'} px-3.5 py-2.5`}>
    <span className="text-[13px] text-ink-soft dark:text-ink-darks">{label}</span>
    <div className={stack ? '' : 'flex min-w-0 justify-end'}>{children}</div>
  </div>
)
const Select = <T extends string | number>({ value, onChange, options, dot }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; dot?: string }) => (
  <label className="relative inline-flex items-center">
    {dot && <span className="pointer-events-none absolute left-3 h-2 w-2 rounded-full" style={{ background: dot }} />}
    <select value={value} onChange={(e) => onChange((typeof value === 'number' ? Number(e.target.value) : e.target.value) as T)}
      className={`appearance-none rounded-full bg-white/90 py-1.5 pr-8 text-[13px] font-medium text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)] outline-none transition focus:ring-4 focus:ring-accent/20 dark:bg-white/10 dark:text-ink-darkp ${dot ? 'pl-7' : 'pl-3'}`}>
      {options.map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
    </select>
    <ChevronDown size={13} className="pointer-events-none absolute right-3 text-ink-mute" />
  </label>
)
const Seg = <T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; dot?: string }[] }) => (
  <div className="seg">
    {options.map((o) => (
      <button type="button" key={o.value} onClick={() => onChange(o.value)} className={`seg-btn !px-3 ${value === o.value ? 'on' : ''}`}>
        {o.dot && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: o.dot }} />}{o.label}
      </button>
    ))}
  </div>
)
const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" onClick={onClick}
    className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition duration-200 ease-apple active:scale-95 ${on ? 'bg-accent text-white shadow-btn dark:bg-accent-dark dark:text-[#07111f]' : 'bg-white/90 text-ink-soft shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:bg-white dark:bg-white/10 dark:text-ink-darks dark:hover:bg-white/[0.14]'}`}>
    {children}
  </button>
)
const Switch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
    className={`relative h-[26px] w-[46px] shrink-0 rounded-full transition duration-300 ease-apple ${checked ? 'bg-[#34c759]' : 'bg-black/15 dark:bg-white/20'}`}>
    <span className={`absolute top-[2px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-all duration-300 ease-apple ${checked ? 'left-[22px]' : 'left-[2px]'}`} />
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
    setTitle(t.title ?? ''); setNotes(t.notes ?? '')
    setCategoryId(t.categoryId ?? categories[0]?.id ?? 'admin')
    setPriority(t.priority ?? 'medium'); setStatus(t.status ?? 'todo')
    const dt = splitDateTime(t.dueAt); setDate(dt.date); setTime(dt.time || settings.workEnd || '18:00')
    setTimeSpent(t.timeSpent ? String(t.timeSpent) : '')
    setReminder(t.reminderMinutes ?? settings.notifications.defaultReminderMinutes)
    setFreq(t.recurrence?.freq ?? 'none'); setWeekday(t.recurrence?.weekday ?? 1); setDom(t.recurrence?.dayOfMonth ?? 20)
    setBlocked(!!t.blocked)
  }, [open, task, defaults, categories, settings.notifications.defaultReminderMinutes, settings.workEnd])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') (document.getElementById('task-form') as HTMLFormElement | null)?.requestSubmit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const cat = categoryOf(categories, categoryId)
  const preview = useMemo<Task>(() => ({
    id: task?.id ?? 'preview', title: title || 'Untitled task', notes: notes || undefined, categoryId, priority, status,
    dueAt: combineDateTime(date, time), timeSpent: timeSpent ? Number(timeSpent) : undefined, reminderMinutes: reminder,
    recurrence: { freq, weekday, dayOfMonth: dom }, blocked, createdAt: task?.createdAt ?? new Date().toISOString(),
  }), [task, title, notes, categoryId, priority, status, date, time, timeSpent, reminder, freq, weekday, dom, blocked])

  if (!open) return null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const patch = {
      title: title.trim(), notes: notes.trim() || undefined, categoryId, priority, status, dueAt: combineDateTime(date, time),
      timeSpent: timeSpent ? Number(timeSpent) : undefined, reminderMinutes: reminder,
      recurrence: { freq, weekday: freq === 'weekly' ? weekday : undefined, dayOfMonth: freq === 'monthly' ? dom : undefined }, blocked,
    }
    if (task) updateTask(task.id, { ...patch, completedAt: status === 'done' ? task.completedAt ?? new Date().toISOString() : undefined })
    else addTask({ ...patch, completedAt: status === 'done' ? new Date().toISOString() : undefined })
    onClose()
  }
  const quick: [string, string][] = [['Today', format(new Date(), 'yyyy-MM-dd')], ['Tomorrow', format(addDays(new Date(), 1), 'yyyy-MM-dd')], ['Mon', format(nextMonday(new Date()), 'yyyy-MM-dd')]]

  return (
    <div className="backdrop-enter fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onClose}>
      <form id="task-form" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={task ? 'Edit task' : 'New task'}
        className="sheet card sheet-enter flex max-h-[94vh] w-full max-w-[920px] flex-col overflow-hidden rounded-b-none sm:rounded-xl3">
        {/* colour accent follows the category */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${cat.color}, ${cat.color}66)` }} />

        <div className="grid flex-1 overflow-y-auto md:grid-cols-[1.15fr_1fr]">
          {/* ---- left: writing area ---- */}
          <div className="flex flex-col p-6 sm:p-8">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute dark:text-ink-darkm">{task ? 'Edit task' : 'New task'}</span>
              <button type="button" className="btn-ghost -mr-2 p-1.5 md:hidden" onClick={onClose} aria-label="Close"><X size={18} /></button>
            </div>
            <input className="w-full bg-transparent text-[26px] font-bold leading-tight tracking-[-0.02em] outline-none placeholder:font-semibold placeholder:text-ink-mute/60 dark:placeholder:text-ink-darkm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" autoFocus required />
            <textarea rows={5} className="mt-3 w-full flex-1 resize-none bg-transparent text-[14.5px] leading-relaxed text-ink-soft outline-none placeholder:text-ink-mute/60 dark:text-ink-darks dark:placeholder:text-ink-darkm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes, reference numbers, what's blocking…" />
            <div className="mt-6">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute dark:text-ink-darkm">Preview</p>
              <div className="pointer-events-none"><TaskCard task={preview} onEdit={() => undefined} /></div>
            </div>
          </div>

          {/* ---- right: property rail ---- */}
          <div className="stagger space-y-3 border-t border-black/[0.06] bg-black/[0.015] p-4 dark:border-white/[0.07] dark:bg-white/[0.02] md:border-l md:border-t-0 md:p-5">
            <div className="hidden items-center justify-end md:flex"><button type="button" className="btn-ghost -mr-2 -mt-1 p-1.5" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
            <Group>
              <Row label="Category"><Select value={categoryId} onChange={setCategoryId} dot={cat.color} options={categories.map((c) => ({ value: c.id, label: c.name }))} /></Row>
              <Row label="Priority"><Seg value={priority} onChange={setPriority} options={[{ value: 'high', label: 'High', dot: '#ff3b30' }, { value: 'medium', label: 'Med', dot: '#ff9500' }, { value: 'low', label: 'Low', dot: '#34c759' }]} /></Row>
              <Row label="Status"><Seg value={status} onChange={setStatus} options={[{ value: 'todo', label: 'To do' }, { value: 'inprogress', label: 'Doing' }, { value: 'done', label: 'Done' }]} /></Row>
            </Group>

            <Group>
              <Row label="Due" stack>
                <div className="flex flex-wrap items-center gap-1.5">
                  {quick.map(([l, v]) => <Chip key={l} on={date === v} onClick={() => setDate(date === v ? '' : v)}>{l}</Chip>)}
                  <label className={`relative inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)] ${date && !quick.some(([, v]) => v === date) ? 'bg-accent text-white dark:bg-accent-dark dark:text-[#07111f]' : 'bg-white/90 text-ink-soft dark:bg-white/10 dark:text-ink-darks'}`}>
                    <CalendarDays size={13} />{date ? format(new Date(date + 'T00:00'), 'd MMM') : 'Pick date'}
                    <input type="date" className="absolute inset-0 cursor-pointer opacity-0" value={date} onChange={(e) => setDate(e.target.value)} />
                  </label>
                  {date && <button type="button" className="ml-auto text-[12px] text-ink-mute hover:text-ink dark:hover:text-ink-darkp" onClick={() => setDate('')}>Clear</button>}
                </div>
              </Row>
              <Row label="Time">
                <input type="time" className="rounded-full bg-white/90 px-3 py-1.5 text-[13px] font-medium tabular-nums text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)] outline-none focus:ring-4 focus:ring-accent/20 dark:bg-white/10 dark:text-ink-darkp" value={time} onChange={(e) => setTime(e.target.value)} disabled={!date} style={{ opacity: date ? 1 : 0.45 }} />
              </Row>
              <Row label="Remind"><Select value={reminder} onChange={setReminder} options={REMIND.map((m) => ({ value: m, label: remindLabel(m) }))} /></Row>
              <Row label="Repeats">
                <Select value={freq} onChange={setFreq} options={[{ value: 'none', label: 'Never' }, { value: 'daily', label: 'Every day' }, { value: 'weekly', label: 'Every week' }, { value: 'monthly', label: 'Every month' }]} />
              </Row>
              {freq === 'weekly' && (
                <Row label="On">
                  <div className="flex gap-1">
                    {WEEKDAYS.map((d, i) => <button type="button" key={d} onClick={() => setWeekday(i)} className={`h-7 w-7 rounded-full text-[11px] font-semibold transition ${weekday === i ? 'bg-accent text-white dark:bg-accent-dark dark:text-[#07111f]' : 'bg-white/90 text-ink-soft dark:bg-white/10 dark:text-ink-darks'}`}>{d[0]}</button>)}
                  </div>
                </Row>
              )}
              {freq === 'monthly' && (
                <Row label="On the"><Select value={dom} onChange={setDom} options={Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: ordinal(i + 1) }))} /></Row>
              )}
            </Group>

            <Group>
              <Row label="Time spent">
                <span className="flex items-center gap-1.5">
                  <input type="number" min={0} className="w-20 rounded-full bg-white/90 px-3 py-1.5 text-right text-[13px] font-medium tabular-nums text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)] outline-none focus:ring-4 focus:ring-accent/20 dark:bg-white/10 dark:text-ink-darkp" value={timeSpent} onChange={(e) => setTimeSpent(e.target.value)} placeholder="0" />
                  <span className="text-xs text-ink-mute">min</span>
                </span>
              </Row>
              <Row label="Blocked / need support"><Switch checked={blocked} onChange={setBlocked} /></Row>
            </Group>
          </div>
        </div>

        {/* ---- footer ---- */}
        <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] px-5 py-3.5 dark:border-white/[0.07]">
          <div className="flex min-w-0 items-center gap-2">
            {task && <button type="button" className="btn-danger !px-3" onClick={() => { if (confirm('Delete this task?')) { deleteTask(task.id); onClose() } }}><Trash2 size={14} /> Delete</button>}
            <span className="hidden flex-wrap items-center gap-1.5 text-[12px] text-ink-mute sm:flex dark:text-ink-darkm">
              {blocked && <span className="chip bg-orange-500/10 text-orange-600 dark:text-orange-300"><Lock size={11} />Blocked</span>}
              {priority === 'high' && <span className="chip bg-red-500/10 text-red-600 dark:text-red-300"><AlertTriangle size={11} />High priority</span>}
              <span className="kbd">⌘ ⏎ to save</span>
            </span>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary px-5"><Check size={15} strokeWidth={2.5} />{task ? 'Save' : 'Add task'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}
