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
  <Link to={to} className="card card-pad fade-up flex items-center gap-4 transition hover:shadow-md">
    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}>{icon}</span>
    <span>
      <span className="block text-2xl font-bold leading-tight">{value}</span>
      <span className="block text-xs text-ink-mute dark:text-ink-darkm">{label}</span>
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
          <p className="text-xs text-ink-mute dark:text-ink-darkm">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
          <h2 className="text-2xl font-bold">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}{firstName ? `, ${firstName}` : ''} 👋</h2>
        </div>
        {hasSamples && (
          <button className="btn-outline text-xs" onClick={() => confirm('Remove all sample tasks? Your own tasks are kept.') && clearSamples()}>
            <Trash2 size={14} /> Clear sample tasks
          </button>
        )}
      </div>

      {isFriday && (
        <Link to="/report" className="fade-up flex items-center gap-3 rounded-xl2 bg-gradient-to-r from-accent to-violet-600 px-5 py-4 text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20"><FileText size={20} /></span>
          <span className="flex-1">
            <span className="block font-semibold">Your weekly report is ready, review and send</span>
            <span className="block text-sm opacity-85">{counts.completedThisWeek} task{counts.completedThisWeek === 1 ? '' : 's'} completed this week{settings.managerName ? ` · for ${settings.managerName}` : ''}</span>
          </span>
          <ArrowRight size={20} />
        </Link>
      )}

      <QuickAdd onAdvanced={openNew} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={<CheckCircle2 size={20} />} label="Completed this week" value={counts.completedThisWeek} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" to="/tasks?view=week" />
        <StatCard icon={<AlertTriangle size={20} />} label="Overdue" value={counts.overdue} tone="bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300" to="/tasks?view=today" />
        <StatCard icon={<Flag size={20} />} label="High-priority pending" value={counts.highPending} tone="bg-amber-50 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300" to="/tasks?view=kanban" />
        <StatCard icon={<Loader size={20} />} label="In progress" value={counts.inProgress} tone="bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300" to="/tasks?view=kanban" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Today's progress" sub={`${today.done} of ${today.total} tasks done`}>
          <div className="flex items-center gap-5">
            <ProgressRing value={today.pct} size={132} stroke={12} color={today.pct === 100 ? '#0ca30c' : '#4f46e5'}>
              <span className="text-3xl font-bold">{today.pct}%</span>
              <span className="text-[11px] text-ink-mute dark:text-ink-darkm">complete</span>
            </ProgressRing>
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-500/15 dark:text-orange-300"><Flame size={18} /></span>
                <span><span className="block text-lg font-bold leading-tight">{st} day{st === 1 ? '' : 's'}</span><span className="block text-[11px] text-ink-mute dark:text-ink-darkm">Streak</span></span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent dark:bg-accent-darksoft dark:text-accent-dark"><Sparkles size={18} /></span>
                <span><span className="block text-lg font-bold leading-tight">{score.score}</span><span className="block text-[11px] text-ink-mute dark:text-ink-darkm">Productivity score</span></span>
              </div>
              <p className="text-[11px] text-ink-mute dark:text-ink-darkm">{score.completion}% completed · {score.onTime}% on time (7 days)</p>
            </div>
          </div>
        </Card>

        <Card title="This week" sub="Completed vs pending, by day" action={<Legend items={[{ name: 'Completed', color: document.documentElement.classList.contains('dark') ? '#8b84ff' : '#4f46e5', value: weekDone }, { name: 'Pending', color: document.documentElement.classList.contains('dark') ? '#3a3f55' : '#d9dcea', value: weekPending }]} />}>
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
