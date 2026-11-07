import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, Flame, FileText, Flag, Loader, Sparkles, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { Card, Empty, ProgressRing } from '../components/ui'
import { QuickAdd } from '../components/tasks/QuickAdd'
import { TaskCard } from '../components/tasks/TaskCard'
import { TaskModal } from '../components/tasks/TaskModal'
import { CategoryDonut, Legend, WeekBarChart } from '../components/charts'
import { useStore } from '../store/useStore'
import { categoryBreakdown, productivityScore, streak, todayStats, upNext, weekCounts, weekSeries } from '../lib/stats'
import { useIsFriday, useMinuteTick } from '../hooks'
import type { Task } from '../types'

const StatCard = ({ icon, label, value, tone, to }: { icon: React.ReactNode; label: string; value: number; tone: string; to: string }) => (
  <Link to={to} className="card card-hover card-pad fade-up flex items-center gap-4">
    <span className={`${tone} h-11 w-11`}>{icon}</span>
    <span>
      <span className="num block text-[28px] leading-none">{value}</span>
      <span className="mt-1 block text-xs text-ink-mute dark:text-ink-darkm">{label}</span>
    </span>
  </Link>
)

export default function Dashboard() {
  useMinuteTick()
  const { tasks, categories, settings, clearSamples } = useStore()
  const [editing, setEditing] = useState<Task | null>(null)
  const [modal, setModal] = useState(false)
  const [defaults, setDefaults] = useState<Partial<Task>>()
  const isFriday = useIsFriday()
  const hasSamples = tasks.some((t) => t.sample)

  const today = useMemo(() => todayStats(tasks), [tasks])
  const series = useMemo(() => weekSeries(tasks), [tasks])
  const cats = useMemo(() => categoryBreakdown(tasks, categories), [tasks, categories])
  const counts = useMemo(() => weekCounts(tasks), [tasks])
  const next = useMemo(() => upNext(tasks, 3), [tasks])
  const st = useMemo(() => streak(tasks, settings.workingDays), [tasks, settings.workingDays])
  const score = useMemo(() => productivityScore(tasks, settings.workingDays), [tasks, settings.workingDays])
  const openTotal = cats.reduce((s, c) => s + c.value, 0)
  const weekDone = series.reduce((s, d) => s + d.completed, 0)
  const weekPending = series.reduce((s, d) => s + d.pending, 0)
  const firstName = settings.userName.split(' ')[0]

  const openEdit = (t: Task) => { setEditing(t); setDefaults(undefined); setModal(true) }
  const openNew = (title: string) => { setEditing(null); setDefaults({ title }); setModal(true) }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-accent dark:text-accent-dark">{format(new Date(), 'EEEE, d MMMM')}</p>
          <h2 className="large-title">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}{firstName ? `, ${firstName}` : ''} 👋</h2>
        </div>
        {hasSamples && (
          <button className="btn-outline text-xs" onClick={() => confirm('Remove all sample tasks? Your own tasks are kept.') && clearSamples()}>
            <Trash2 size={14} /> Clear sample tasks
          </button>
        )}
      </div>

      {isFriday && (
        <Link to="/report" className="card card-hover fade-up flex items-center gap-4 px-4 py-3.5">
          <span className="tile-purple h-11 w-11"><FileText size={20} /></span>
          <span className="flex-1">
            <span className="block text-[15px] font-semibold tracking-tight">Your weekly report is ready, review and send</span>
            <span className="block text-[13px] text-ink-soft dark:text-ink-darks">{counts.completedThisWeek} task{counts.completedThisWeek === 1 ? '' : 's'} completed this week{settings.managerName ? ` · for ${settings.managerName}` : ''}</span>
          </span>
          <span className="btn-primary">Review <ArrowRight size={15} /></span>
        </Link>
      )}

      <QuickAdd onAdvanced={openNew} />

      <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={<CheckCircle2 size={20} />} label="Completed this week" value={counts.completedThisWeek} tone="tile-green" to="/tasks?view=week" />
        <StatCard icon={<AlertTriangle size={20} />} label="Overdue" value={counts.overdue} tone="tile-red" to="/tasks?view=today" />
        <StatCard icon={<Flag size={20} />} label="High-priority pending" value={counts.highPending} tone="tile-orange" to="/tasks?view=kanban" />
        <StatCard icon={<Loader size={20} />} label="In progress" value={counts.inProgress} tone="tile-blue" to="/tasks?view=kanban" />
      </div>

      <div className="stagger grid gap-4 lg:grid-cols-3">
        <section className="hero fade-up flex flex-col p-5">
          <header className="relative mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-[15px] font-semibold tracking-tight">Today</h3>
              <p className="text-xs text-white/75">{today.done} of {today.total} tasks done</p>
            </div>
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">{format(new Date(), 'EEE d')}</span>
          </header>
          <div className="relative flex items-center gap-5">
            <ProgressRing value={today.pct} size={132} stroke={13} color="#ffffff" color2="#dff1ff" track="rgba(255,255,255,0.22)">
              <span className="num text-[32px] text-white">{today.pct}%</span>
              <span className="text-[11px] text-white/75">complete</span>
            </ProgressRing>
            <div className="space-y-3.5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 backdrop-blur"><Flame size={18} /></span>
                <span><span className="num block text-lg leading-tight">{st} day{st === 1 ? '' : 's'}</span><span className="block text-[11px] text-white/75">Streak</span></span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 backdrop-blur"><Sparkles size={18} /></span>
                <span><span className="num block text-lg leading-tight">{score.score}<span className="text-sm text-white/70">/100</span></span><span className="block text-[11px] text-white/75">Productivity score</span></span>
              </div>
              <p className="text-[11px] text-white/70">{score.completion}% completed · {score.onTime}% on time · 7 days</p>
            </div>
          </div>
          <div className="relative mt-auto grid grid-cols-3 gap-2 pt-5">
            {[
              { label: 'Due today', value: today.total - today.done },
              { label: 'Done', value: today.done },
              { label: 'Overdue', value: counts.overdue },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl bg-white/15 px-3 py-2 backdrop-blur">
                <span className="num block text-lg leading-none">{m.value}</span>
                <span className="block text-[11px] text-white/75">{m.label}</span>
              </div>
            ))}
          </div>
        </section>

        <Card title="This week" sub="Completed vs pending, by day" action={<Legend items={[{ name: 'Completed', color: document.documentElement.classList.contains('dark') ? '#4da3ff' : '#0a7aff', value: weekDone }, { name: 'Pending', color: document.documentElement.classList.contains('dark') ? 'rgba(255,255,255,0.14)' : 'rgba(60,60,67,0.14)', value: weekPending }]} />}>
          <WeekBarChart data={series} />
        </Card>

        <Card title="By category" sub="Open tasks">
          {cats.length ? (
            <>
              <CategoryDonut data={cats} total={openTotal} />
              <div className="mt-2"><Legend items={cats} /></div>
            </>
          ) : <Empty icon={<CheckCircle2 size={22} />} title="All clear" hint="No open tasks right now." />}
        </Card>
      </div>

      <Card title="Up next" sub="Your next three deadlines" action={<Link to="/tasks" className="btn-ghost text-xs">All tasks <ArrowRight size={14} /></Link>}>
        {next.length ? (
          <div className="grid gap-3 md:grid-cols-3">{next.map((t) => <TaskCard key={t.id} task={t} onEdit={openEdit} compact />)}</div>
        ) : <Empty icon={<CheckCircle2 size={22} />} title="Nothing scheduled" hint="Add a task with a due date to see it here." />}
      </Card>

      <TaskModal open={modal} task={editing} defaults={defaults} onClose={() => setModal(false)} />
    </div>
  )
}
