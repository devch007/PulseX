import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Columns3, ListChecks, Plus, Search, Sun } from 'lucide-react'
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { addDays, addMonths, endOfMonth, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, endOfWeek, isToday } from 'date-fns'
import { Card, Empty, Segmented } from '../components/ui'
import { QuickAdd } from '../components/tasks/QuickAdd'
import { TaskCard } from '../components/tasks/TaskCard'
import { TaskModal } from '../components/tasks/TaskModal'
import { useStore, categoryOf } from '../store/useStore'
import { fromISO, isOverdue, weekEnd, weekStart, fmtTime, combineDateTime } from '../lib/dates'
import { useMinuteTick, useQuery } from '../hooks'
import type { Status, Task } from '../types'
import { STATUS_META, PRIORITY_META } from '../lib/categories'

type View = 'today' | 'week' | 'kanban' | 'calendar'
const PRIO = { high: 0, medium: 1, low: 2 }
const sortTasks = (a: Task[]) =>
  [...a].sort((x, y) => {
    if ((x.status === 'done') !== (y.status === 'done')) return x.status === 'done' ? 1 : -1
    const dx = x.dueAt ? fromISO(x.dueAt).getTime() : Infinity, dy = y.dueAt ? fromISO(y.dueAt).getTime() : Infinity
    if (dx !== dy) return dx - dy
    return PRIO[x.priority] - PRIO[y.priority]
  })

export default function Tasks() {
  useMinuteTick()
  const q = useQuery()
  const navigate = useNavigate()
  const view = (q.get('view') as View) || 'today'
  const focusId = q.get('task')
  const { tasks, categories } = useStore()
  const [editing, setEditing] = useState<Task | null>(null)
  const [defaults, setDefaults] = useState<Partial<Task>>()
  const [modal, setModal] = useState(false)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [showDone, setShowDone] = useState(true)

  const setView = (v: View) => navigate(`/tasks?view=${v}`)
  const openEdit = (t: Task) => { setEditing(t); setDefaults(undefined); setModal(true) }
  const openNew = (d: Partial<Task>) => { setEditing(null); setDefaults(d); setModal(true) }

  useEffect(() => {
    if (!focusId) return
    const t = tasks.find((x) => x.id === focusId)
    if (t) {
      setTimeout(() => document.getElementById(`task-${t.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
    }
  }, [focusId, tasks])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return tasks.filter((t) =>
      (catFilter === 'all' || t.categoryId === catFilter) &&
      (showDone || t.status !== 'done') &&
      (!s || t.title.toLowerCase().includes(s) || (t.notes ?? '').toLowerCase().includes(s)),
    )
  }, [tasks, search, catFilter, showDone])

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <QuickAdd onAdvanced={(title) => openNew({ title })} />

      <div className="flex flex-wrap items-center gap-3">
        <Segmented value={view} onChange={setView} options={[
          { value: 'today', label: <span className="flex items-center gap-1.5"><Sun size={13} />Today</span> },
          { value: 'week', label: <span className="flex items-center gap-1.5"><ListChecks size={13} />This week</span> },
          { value: 'kanban', label: <span className="flex items-center gap-1.5"><Columns3 size={13} />Kanban</span> },
          { value: 'calendar', label: <span className="flex items-center gap-1.5"><CalendarDays size={13} />Calendar</span> },
        ]} />
        <div className="relative ml-auto">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
          <input className="input w-48 pl-8" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-ink-soft dark:text-ink-darks">
          <input type="checkbox" className="accent-[#0a7aff]" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Show done
        </label>
        <button className="btn-primary" onClick={() => openNew({})}><Plus size={16} /> New</button>
      </div>

      {view === 'today' && <TodayView tasks={filtered} onEdit={openEdit} focusId={focusId} />}
      {view === 'week' && <WeekView tasks={filtered} onEdit={openEdit} focusId={focusId} />}
      {view === 'kanban' && <KanbanView tasks={filtered} onEdit={openEdit} focusId={focusId} />}
      {view === 'calendar' && <CalendarView tasks={filtered} onEdit={openEdit} onNew={openNew} />}

      <TaskModal open={modal} task={editing} defaults={defaults} onClose={() => setModal(false)} />
    </div>
  )
}

/* ---------------- Today ---------------- */
const TodayView = ({ tasks, onEdit, focusId }: { tasks: Task[]; onEdit: (t: Task) => void; focusId: string | null }) => {
  const overdue = sortTasks(tasks.filter((t) => isOverdue(t.dueAt, t.status) && !isSameDay(fromISO(t.dueAt!), new Date())))
  const today = sortTasks(tasks.filter((t) => t.dueAt && isSameDay(fromISO(t.dueAt), new Date())))
  const noDate = sortTasks(tasks.filter((t) => !t.dueAt && t.status !== 'done'))
  const Section = ({ title, items, tone }: { title: string; items: Task[]; tone?: string }) =>
    items.length ? (
      <Card title={title} sub={`${items.length} task${items.length === 1 ? '' : 's'}`} className={tone}>
        <div className="grid gap-3 md:grid-cols-2">{items.map((t) => <TaskCard key={t.id} task={t} onEdit={onEdit} highlight={t.id === focusId} />)}</div>
      </Card>
    ) : null
  if (!overdue.length && !today.length && !noDate.length)
    return <Card><Empty icon={<CheckCircle2 size={22} />} title="Nothing due today" hint="Enjoy the calm, or pull something forward from this week." /></Card>
  return (
    <div className="space-y-4">
      <Section title="Overdue" items={overdue} tone="border-red-200 dark:border-red-500/30" />
      <Section title="Today" items={today} />
      <Section title="No due date" items={noDate} />
    </div>
  )
}

/* ---------------- Week ---------------- */
const WeekView = ({ tasks, onEdit, focusId }: { tasks: Task[]; onEdit: (t: Task) => void; focusId: string | null }) => {
  const mon = weekStart(), sun = weekEnd()
  const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i))
  const inWeek = tasks.filter((t) => t.dueAt && fromISO(t.dueAt) >= mon && fromISO(t.dueAt) <= sun)
  const settingsDays = useStore((s) => s.settings.workingDays)
  return (
    <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {days.filter((d) => settingsDays.includes(d.getDay()) || inWeek.some((t) => isSameDay(fromISO(t.dueAt!), d))).map((d) => {
        const items = sortTasks(inWeek.filter((t) => isSameDay(fromISO(t.dueAt!), d)))
        const done = items.filter((t) => t.status === 'done').length
        return (
          <Card key={d.toISOString()} className={isToday(d) ? 'ring-1 ring-accent/40' : ''}
            title={format(d, 'EEEE')} sub={format(d, 'd MMM')}
            action={items.length ? <span className="chip bg-black/5 dark:bg-white/10">{done}/{items.length} done</span> : undefined}>
            <div className="space-y-2.5">
              {items.length ? items.map((t) => <TaskCard key={t.id} task={t} onEdit={onEdit} compact highlight={t.id === focusId} />)
                : <p className="py-4 text-center text-xs text-ink-mute dark:text-ink-darkm">Nothing scheduled</p>}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

/* ---------------- Kanban ---------------- */
const COLS: Status[] = ['todo', 'inprogress', 'done']
const KanbanView = ({ tasks, onEdit, focusId }: { tasks: Task[]; onEdit: (t: Task) => void; focusId: string | null }) => {
  const setStatus = useStore((s) => s.setStatus)
  const [active, setActive] = useState<Task | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const onEnd = (e: DragEndEvent) => {
    setActive(null)
    const over = e.over?.id as Status | undefined
    const id = e.active.id as string
    const t = tasks.find((x) => x.id === id)
    if (over && t && t.status !== over) setStatus(id, over)
  }
  return (
    <DndContext sensors={sensors} onDragStart={(e) => setActive(tasks.find((t) => t.id === e.active.id) ?? null)} onDragEnd={onEnd} onDragCancel={() => setActive(null)}>
      <div className="stagger grid gap-4 md:grid-cols-3">
        {COLS.map((col) => <Column key={col} status={col} tasks={sortTasks(tasks.filter((t) => t.status === col))} onEdit={onEdit} focusId={focusId} />)}
      </div>
      <DragOverlay>{active ? <div className="rotate-1 opacity-90"><TaskCard task={active} onEdit={() => undefined} compact /></div> : null}</DragOverlay>
    </DndContext>
  )
}
const Column = ({ status, tasks, onEdit, focusId }: { status: Status; tasks: Task[]; onEdit: (t: Task) => void; focusId: string | null }) => {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const tone = { todo: 'bg-[#8e8e93]', inprogress: 'bg-[#0a7aff]', done: 'bg-[#34c759]' }[status]
  return (
    <div ref={setNodeRef} className={`glass rounded-xl3 p-3 transition duration-300 ease-apple ${isOver ? 'ring-4 ring-accent/25' : ''}`}>
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className={`h-2.5 w-2.5 rounded-full ${tone} shadow-[0_0_0_3px_rgba(0,0,0,0.04)]`} />
        <p className="text-sm font-semibold tracking-tight">{STATUS_META[status].label}</p>
        <span className={`ml-auto chip tabular-nums text-white ${tone}`}>{tasks.length}</span>
      </div>
      <div className="min-h-[120px] space-y-2.5">
        {tasks.map((t) => <Draggable key={t.id} task={t} onEdit={onEdit} highlight={t.id === focusId} />)}
        {!tasks.length && <p className="py-8 text-center text-xs text-ink-mute dark:text-ink-darkm">Drop tasks here</p>}
      </div>
    </div>
  )
}
const Draggable = ({ task, onEdit, highlight }: { task: Task; onEdit: (t: Task) => void; highlight: boolean }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={`cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}>
      <TaskCard task={task} onEdit={onEdit} compact highlight={highlight} />
    </div>
  )
}

/* ---------------- Calendar ---------------- */
const CalendarView = ({ tasks, onEdit, onNew }: { tasks: Task[]; onEdit: (t: Task) => void; onNew: (d: Partial<Task>) => void }) => {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState<Date>(new Date())
  const cats = useStore((s) => s.categories)
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const days: Date[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)
  const forDay = (d: Date) => sortTasks(tasks.filter((t) => t.dueAt && isSameDay(fromISO(t.dueAt), d)))
  const selectedTasks = forDay(selected)
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card title={format(month, 'MMMM yyyy')} action={
        <div className="flex gap-1">
          <button className="btn-ghost p-1.5" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month"><ChevronLeft size={16} /></button>
          <button className="btn-ghost text-xs" onClick={() => { setMonth(startOfMonth(new Date())); setSelected(new Date()) }}>Today</button>
          <button className="btn-ghost p-1.5" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month"><ChevronRight size={16} /></button>
        </div>}>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-ink-mute dark:text-ink-darkm">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const items = forDay(d)
            const sel = isSameDay(d, selected)
            const hasOverdue = items.some((t) => isOverdue(t.dueAt, t.status))
            return (
              <button key={d.toISOString()} onClick={() => setSelected(d)} onDoubleClick={() => onNew({ dueAt: combineDateTime(format(d, 'yyyy-MM-dd'), '18:00') })}
                className={`flex min-h-[76px] flex-col rounded-xl border p-1.5 text-left transition ${sel ? 'border-accent bg-accent-soft/60 dark:border-accent-dark dark:bg-accent-darksoft/60' : 'border-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'} ${!isSameMonth(d, month) ? 'opacity-40' : ''}`}>
                <span className={`mb-1 grid h-6 w-6 place-items-center rounded-full text-xs font-medium ${isToday(d) ? 'bg-accent text-white dark:bg-accent-dark dark:text-[#0f1117]' : ''}`}>{format(d, 'd')}</span>
                <div className="flex flex-wrap gap-1">
                  {items.slice(0, 4).map((t) => (
                    <span key={t.id} className={`h-1.5 w-1.5 rounded-full ${t.status === 'done' ? 'opacity-40' : ''}`} style={{ background: categoryOf(cats, t.categoryId).color }} title={t.title} />
                  ))}
                  {items.length > 4 && <span className="text-[10px] text-ink-mute">+{items.length - 4}</span>}
                </div>
                {hasOverdue && <span className="mt-auto text-[10px] font-medium text-red-600 dark:text-red-400">overdue</span>}
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-[11px] text-ink-mute dark:text-ink-darkm">Double-click a day to add a task on that date.</p>
      </Card>
      <Card title={format(selected, 'EEEE, d MMM')} sub={`${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'}`}
        action={<button className="btn-soft text-xs" onClick={() => onNew({ dueAt: combineDateTime(format(selected, 'yyyy-MM-dd'), '18:00') })}><Plus size={14} /> Add</button>}>
        <div className="space-y-2.5">
          {selectedTasks.length ? selectedTasks.map((t) => (
            <button key={t.id} onClick={() => onEdit(t)} className="flex w-full items-start gap-2.5 rounded-xl p-2 text-left transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PRIORITY_META[t.priority].color }} />
              <span className="min-w-0">
                <span className={`block truncate text-sm font-medium ${t.status === 'done' ? 'line-through opacity-60' : ''}`}>{t.title}</span>
                <span className="block text-[11px] text-ink-mute dark:text-ink-darkm">{fmtTime(t.dueAt)} · {categoryOf(cats, t.categoryId).name}</span>
              </span>
            </button>
          )) : <p className="py-6 text-center text-xs text-ink-mute dark:text-ink-darkm">No tasks on this day.</p>}
        </div>
      </Card>
    </div>
  )
}
