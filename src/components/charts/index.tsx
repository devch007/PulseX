import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'

const isDark = () => document.documentElement.classList.contains('dark')

const TooltipBox = ({ active, payload, label, fmt }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color?: string; payload?: Record<string, unknown> }>; label?: string; fmt?: (p: { name: string; value: number }) => string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-semibold">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? (p.payload?.color as string) }} />
          <span className="text-ink-soft dark:text-ink-darks">{fmt ? fmt(p) : `${p.name}: ${p.value}`}</span>
        </p>
      ))}
    </div>
  )
}

/** Completed vs pending per day – two series, legend rendered by the parent card */
export const WeekBarChart = ({ data }: { data: { day: string; completed: number; pending: number; isToday: boolean }[] }) => {
  const dark = isDark()
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barGap={3} barCategoryGap="28%" margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeWidth={1} />
        <XAxis dataKey="day" axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} content={<TooltipBox />} />
        <Bar dataKey="completed" name="Completed" fill={dark ? '#8b84ff' : '#4f46e5'} radius={[4, 4, 0, 0]} barSize={14} animationDuration={500} />
        <Bar dataKey="pending" name="Pending" fill={dark ? '#3a3f55' : '#d9dcea'} radius={[4, 4, 0, 0]} barSize={14} animationDuration={500} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export const CategoryDonut = ({ data, total }: { data: { name: string; value: number; color: string }[]; total: number }) => {
  const dark = isDark()
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={2} animationDuration={500} stroke={dark ? '#181b25' : '#ffffff'} strokeWidth={2}>
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip content={<TooltipBox fmt={(p) => `${p.name}: ${p.value} open`} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{total}</span>
        <span className="text-[11px] text-ink-mute dark:text-ink-darkm">open tasks</span>
      </div>
    </div>
  )
}

export const Legend = ({ items }: { items: { name: string; color: string; value?: number }[] }) => (
  <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
    {items.map((i) => (
      <li key={i.name} className="flex items-center gap-1.5 text-xs text-ink-soft dark:text-ink-darks">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />{i.name}{i.value !== undefined && <span className="font-semibold text-ink dark:text-ink-darkp">{i.value}</span>}
      </li>
    ))}
  </ul>
)
