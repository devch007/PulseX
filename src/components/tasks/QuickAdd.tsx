import { useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { Priority } from '../../types'
import { combineDateTime, format } from '../../lib/dates'
import { addDays } from 'date-fns'

/**
 * Quick-add bar. Enter adds the task. Understands a few shortcuts:
 *   !high / !med / !low   → priority
 *   #Compliance           → category (by name)
 *   @today / @tomorrow / @mon..@sun → due date (6 pm)
 */
export const QuickAdd = ({ onAdvanced }: { onAdvanced: (title: string) => void }) => {
  const [v, setV] = useState('')
  const { addTask, categories, settings } = useStore()

  const parse = (raw: string) => {
    let title = raw
    let priority: Priority = 'medium'
    let categoryId = categories[0]?.id ?? 'admin'
    let dueAt: string | undefined
    const p = title.match(/!(high|med|medium|low)\b/i)
    if (p) { priority = p[1].toLowerCase().startsWith('med') ? 'medium' : (p[1].toLowerCase() as Priority); title = title.replace(p[0], '') }
    const c = title.match(/#([\w-]+)/)
    if (c) {
      const found = categories.find((x) => x.name.toLowerCase() === c[1].toLowerCase())
      if (found) { categoryId = found.id; title = title.replace(c[0], '') }
    }
    const d = title.match(/@(today|tomorrow|mon|tue|wed|thu|fri|sat|sun)\b/i)
    if (d) {
      const key = d[1].toLowerCase()
      let date = new Date()
      if (key === 'tomorrow') date = addDays(date, 1)
      else if (key !== 'today') {
        const idx = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(key)
        do date = addDays(date, 1); while (date.getDay() !== idx)
      }
      dueAt = combineDateTime(format(date, 'yyyy-MM-dd'), settings.workEnd)
      title = title.replace(d[0], '')
    }
    return { title: title.replace(/\s+/g, ' ').trim(), priority, categoryId, dueAt }
  }

  const submit = () => {
    const parsed = parse(v)
    if (!parsed.title) return
    addTask({ ...parsed, status: 'todo', reminderMinutes: settings.notifications.defaultReminderMinutes, recurrence: { freq: 'none' } })
    setV('')
  }

  return (
    <div className="card glass-strong flex items-center gap-2 rounded-full p-1.5 pl-4 focus-within:ring-4 focus-within:ring-accent/20">
      <span className="tile-blue h-7 w-7 rounded-[9px]"><Plus size={16} strokeWidth={2.6} /></span>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Add a task and press Enter…  try: GST return !high #Compliance @fri"
        className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-mute dark:placeholder:text-ink-darkm"
        aria-label="Quick add task"
      />
      <span className="kbd">⏎ to add</span>
      <button className="btn-ghost hidden sm:inline-flex" onClick={() => onAdvanced(v)} title="Open full form"><Sparkles size={15} /> Details</button>
      <button className="btn-primary" onClick={submit}>Add</button>
    </div>
  )
}
