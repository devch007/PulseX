import { useMemo, useRef, useState } from 'react'
import { CalendarDays, Check, Flag, Plus, Sparkles, Tag } from 'lucide-react'
import { useStore, categoryOf } from '../../store/useStore'
import type { Priority } from '../../types'
import { combineDateTime, format } from '../../lib/dates'
import { addDays } from 'date-fns'
import { PRIORITY_META } from '../../lib/categories'

/**
 * Quick-add bar. Enter adds the task. Shortcuts:
 *   !high / !med / !low   → priority
 *   #Clients              → category (by name)
 *   @today / @tomorrow / @mon..@sun → due date (end of working day)
 */
export const QuickAdd = ({ onAdvanced }: { onAdvanced: (title: string) => void }) => {
  const [v, setV] = useState('')
  const [added, setAdded] = useState(false)
  const [focus, setFocus] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { addTask, categories, settings } = useStore()

  const parsed = useMemo(() => {
    let title = v
    let priority: Priority | undefined
    let categoryId: string | undefined
    let dueAt: string | undefined
    let dueLabel = ''
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
      dueLabel = `${format(date, 'EEE d MMM')} · ${settings.workEnd}`
      title = title.replace(d[0], '')
    }
    return { title: title.replace(/\s+/g, ' ').trim(), priority, categoryId, dueAt, dueLabel }
  }, [v, categories, settings.workEnd])

  const submit = () => {
    if (!parsed.title) return
    addTask({
      title: parsed.title, priority: parsed.priority ?? 'medium', categoryId: parsed.categoryId ?? categories[0]?.id ?? 'admin', dueAt: parsed.dueAt,
      status: 'todo', reminderMinutes: settings.notifications.defaultReminderMinutes, recurrence: { freq: 'none' },
    })
    setV('')
    setAdded(true); setTimeout(() => setAdded(false), 1200)
  }
  const insert = (token: string) => {
    setV((cur) => (cur.trim() ? `${cur.trim()} ${token} ` : `${token} `))
    inputRef.current?.focus()
  }
  const hasChips = parsed.priority || parsed.categoryId || parsed.dueAt
  const cat = parsed.categoryId ? categoryOf(categories, parsed.categoryId) : null

  return (
    <div className={`card glass-strong rounded-[26px] p-1.5 transition duration-300 ease-apple ${focus ? 'ring-4 ring-accent/20' : ''}`}>
      <div className="flex items-center gap-2 pl-2.5">
        <span className="tile-blue h-8 w-8 rounded-[10px]"><Plus size={17} strokeWidth={2.6} /></span>
        <input
          ref={inputRef}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Add a task…"
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-ink-mute dark:placeholder:text-ink-darkm"
          aria-label="Quick add task"
        />
        {!v && (
          <div className="hidden items-center gap-1 lg:flex">
            {[['!high', 'Priority'], ['#Clients', 'Category'], ['@fri', 'Due day']].map(([t, title]) => (
              <button key={t} type="button" title={title} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(t)}
                className="rounded-full bg-black/[0.045] px-2.5 py-1 font-mono text-[11px] font-medium text-ink-mute transition hover:bg-accent/10 hover:text-accent dark:bg-white/[0.07] dark:text-ink-darkm dark:hover:text-accent-dark">
                {t}
              </button>
            ))}
          </div>
        )}
        <button className="btn-ghost hidden sm:inline-flex" onClick={() => onAdvanced(parsed.title)} title="Open full form"><Sparkles size={15} /> Details</button>
        <button className={`btn-primary min-w-[64px] transition-colors duration-300 ${added ? '!bg-[#34c759] !shadow-none' : ''}`} onClick={submit} disabled={!parsed.title && !added}>
          {added ? <Check size={16} strokeWidth={3} className="pop" /> : 'Add'}
        </button>
      </div>
      {hasChips && (
        <div className="fade-up flex flex-wrap items-center gap-1.5 px-3 pb-1.5 pt-1.5">
          <span className="text-[11px] text-ink-mute dark:text-ink-darkm">Will add as</span>
          {cat && <span className="chip" style={{ background: `${cat.color}1f` }}><Tag size={10} style={{ color: cat.color }} />{cat.name}</span>}
          {parsed.priority && <span className={`chip ${PRIORITY_META[parsed.priority].bg}`}><Flag size={10} />{PRIORITY_META[parsed.priority].label}</span>}
          {parsed.dueAt && <span className="chip bg-accent-soft text-accent dark:bg-accent-darksoft dark:text-accent-dark"><CalendarDays size={10} />{parsed.dueLabel}</span>}
        </div>
      )}
    </div>
  )
}
