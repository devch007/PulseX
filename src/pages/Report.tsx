import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Clock, Copy, Download, FileText, History, Mail, RefreshCw, Save, Trash2, Check, CircleDashed, Lock, CalendarRange, MessageCircle } from 'lucide-react'
import { addWeeks, format } from 'date-fns'
import { Card, Empty, Num, Segmented } from '../components/ui'
import { useStore } from '../store/useStore'
import { compileWeek, generateReportText, reportSubject, type ReportFormat } from '../lib/report'
import { buildReportPdf } from '../lib/pdf'
import { fmtRange, fromISO } from '../lib/dates'
import { CategoryTag } from '../components/tasks/Badges'

export default function Report() {
  const { tasks, categories, settings, reports, saveReport, deleteReport } = useStore()
  const [ref, setRef] = useState(new Date())
  const data = useMemo(() => compileWeek(tasks, categories, ref, settings.workingDays), [tasks, categories, ref, settings.workingDays])
  const [fmt, setFmt] = useState<ReportFormat>(() => (localStorage.getItem('pulsex-report-format') as ReportFormat) || 'whatsapp')
  const generated = useMemo(() => generateReportText(data, settings, categories, fmt), [data, settings, categories, fmt])
  const [text, setText] = useState(generated)
  const [subject, setSubject] = useState(reportSubject(data))
  const [dirty, setDirty] = useState(false)
  const [copied, setCopied] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)
  const [view, setView] = useState<'preview' | 'edit'>('preview')

  useEffect(() => { if (!dirty) { setText(generated); setSubject(reportSubject(data)) } }, [generated, data, dirty])

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  const changeFmt = (f: ReportFormat) => { setFmt(f); localStorage.setItem('pulsex-report-format', f); setDirty(false) }
  const email = () => {
    const url = `mailto:${encodeURIComponent(settings.managerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
    window.location.href = url
  }
  const pdf = () => buildReportPdf(data, settings, categories, subject, text)
  const save = () => {
    saveReport({
      weekStart: data.range.start.toISOString(), weekEnd: data.range.end.toISOString(), subject, text,
      stats: { completed: data.completed.length, inProgress: data.inProgress.length, pending: data.pending.length + data.blocked.length, areas: data.byCategory.length },
    })
  }
  const regenerate = () => { setDirty(false); setText(generated); setSubject(reportSubject(data)) }
  const viewed = reports.find((r) => r.id === viewing)

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl bg-black/5 p-1 dark:bg-white/5">
          <button className="btn-ghost p-1.5" onClick={() => { setRef(addWeeks(ref, -1)); setDirty(false) }} aria-label="Previous week"><ChevronLeft size={16} /></button>
          <span className="px-2 text-sm font-medium"><CalendarRange size={14} className="mr-1.5 inline -mt-0.5" />{fmtRange(data.range.start, data.range.end)}</span>
          <button className="btn-ghost p-1.5" onClick={() => { setRef(addWeeks(ref, 1)); setDirty(false) }} aria-label="Next week"><ChevronRight size={16} /></button>
        </div>
        <button className="btn-ghost text-xs" onClick={() => { setRef(new Date()); setDirty(false) }}>This week</button>
        <div className="ml-auto flex flex-wrap gap-2">
          <button className="btn-primary" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copied!' : 'Copy message'}</button>
          <button className="btn-outline !text-[#1faa59]" onClick={whatsapp} title="Opens WhatsApp with the message ready to send"><MessageCircle size={15} /> WhatsApp</button>
          <button className="btn-outline" onClick={pdf}><Download size={15} /> PDF</button>
          <button className="btn-ghost" onClick={email} title={settings.managerEmail ? `To ${settings.managerEmail}` : 'Set your manager email in Settings'}><Mail size={15} /> Email</button>
          <button className="btn-ghost" onClick={save}><Save size={15} /> Save</button>
        </div>
      </div>

      <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { label: 'Completed', value: data.completed.length, icon: <Check size={18} />, tone: 'tile-green' },
          { label: 'In progress', value: data.inProgress.length, icon: <CircleDashed size={18} />, tone: 'tile-blue' },
          { label: 'Pending / blocked', value: data.pending.length + data.blocked.length, icon: <Lock size={18} />, tone: 'tile-orange' },
          { label: 'Hours logged', value: Math.round(data.totalMinutes / 6) / 10, icon: <Clock size={18} />, tone: 'tile-purple' },
        ].map((s) => (
          <div key={s.label} className="card card-pad fade-up flex items-center gap-3">
            <span className={`${s.tone} h-10 w-10`}>{s.icon}</span>
            <span><span className="num block text-[24px] leading-none"><Num value={s.value} /></span><span className="block text-xs text-ink-mute dark:text-ink-darkm">{s.label}</span></span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card title="Weekly update" sub={settings.managerEmail ? `To: ${settings.managerName || settings.managerEmail} <${settings.managerEmail}>` : 'Add your manager in Settings to prefill the email'}
          action={<button className="btn-ghost text-xs" onClick={regenerate} title="Discard edits and regenerate from tasks"><RefreshCw size={13} /> Regenerate</button>}>
          <label className="label">Subject</label>
          <input className="input mb-3" value={subject} onChange={(e) => { setSubject(e.target.value); setDirty(true) }} />
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className="label !mb-0">Message</label>
              <Segmented value={fmt} onChange={changeFmt} options={[{ value: 'whatsapp', label: <span className="flex items-center gap-1"><MessageCircle size={12} />WhatsApp</span> }, { value: 'plain', label: 'Plain text' }]} />
            </div>
            <Segmented value={view} onChange={setView} options={[{ value: 'preview', label: 'Preview' }, { value: 'edit', label: 'Edit' }]} />
          </div>
          {view === 'edit' ? (
            <textarea className="input min-h-[560px] font-mono text-[13px] leading-relaxed tracking-normal" value={text} onChange={(e) => { setText(e.target.value); setDirty(true) }} />
          ) : (
            <div className="rounded-2xl bg-white/70 p-6 shadow-[inset_0_0_0_1px_rgba(60,60,67,0.08)] dark:bg-white/[0.04] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" onDoubleClick={() => setView('edit')}>
              <MessagePreview text={text} />
              <p className="mt-4 text-[11px] text-ink-mute dark:text-ink-darkm">Double-click to edit. Copy pastes exactly this into WhatsApp, where *bold* renders as bold.</p>
            </div>
          )}
          {dirty && <p className="mt-2 text-[11px] text-ink-mute dark:text-ink-darkm">You have edited this report. Regenerate to rebuild it from your tasks.</p>}
        </Card>

        <div className="space-y-4">
          <Card title="Accomplishments by area">
            {data.byCategory.length ? (
              <ul className="space-y-2">
                {data.byCategory.map((g) => (
                  <li key={g.category.id} className="flex items-center justify-between gap-2">
                    <CategoryTag category={g.category} />
                    <span className="text-sm font-semibold">{g.tasks.length}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-ink-mute dark:text-ink-darkm">Nothing completed in this window yet.</p>}
          </Card>

          <Card title="Report history" sub={`${reports.length} saved`}>
            {reports.length ? (
              <ul className="space-y-1.5">
                {reports.map((r) => (
                  <li key={r.id} className="group flex items-center gap-2 rounded-xl p-2 transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
                    <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setViewing(r.id)}>
                      <span className="tile-gray h-8 w-8 rounded-[9px]"><FileText size={14} /></span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{fmtRange(fromISO(r.weekStart), fromISO(r.weekEnd))}</span>
                        <span className="block text-[11px] text-ink-mute dark:text-ink-darkm">{r.stats.completed} done · saved {format(fromISO(r.createdAt), 'd MMM')}</span>
                      </span>
                    </button>
                    <button className="btn-ghost p-1 opacity-0 group-hover:opacity-100" onClick={() => confirm('Delete this saved report?') && deleteReport(r.id)} aria-label="Delete"><Trash2 size={13} /></button>
                  </li>
                ))}
              </ul>
            ) : <Empty icon={<History size={20} />} title="No saved reports" hint="Save a report to keep a copy here." />}
          </Card>
        </div>
      </div>

      {viewed && createPortal(
        <div className="backdrop-enter fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={() => setViewing(null)}>
          <div className="card sheet sheet-enter w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5" onMouseDown={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{viewed.subject}</h3>
              <div className="flex gap-2">
                <button className="btn-outline text-xs" onClick={() => { setText(viewed.text); setSubject(viewed.subject); setDirty(true); setViewing(null) }}>Load into editor</button>
                <button className="btn-ghost text-xs" onClick={() => setViewing(null)}>Close</button>
              </div>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{viewed.text}</pre>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}


/** Renders the message the way WhatsApp will show it: *bold*, emoji markers, bullets. */
const Inline = ({ t }: { t: string }) => (
  <>{t.split(/(\*[^*]+\*)/g).map((part, i) => part.startsWith('*') && part.endsWith('*') && part.length > 2 ? <b key={i} className="font-semibold text-ink dark:text-ink-darkp">{part.slice(1, -1)}</b> : <span key={i}>{part}</span>)}</>
)
const MessagePreview = ({ text }: { text: string }) => {
  const lines = text.split('\n')
  const isHeading = (l: string) => /^(\p{Extended_Pictographic}|[📊🏆🔄⚠️📅⏱⭐✅])/u.test(l) && /\*[^*]+\*/.test(l) || (/^[A-Z][A-Z &·()\-–0-9]+$/.test(l.trim()) && l.trim().length > 3)
  return (
    <div className="mx-auto max-w-[560px] space-y-[3px] text-[14.5px] leading-[1.55]">
      {lines.map((l, i) => {
        if (!l.trim()) return <div key={i} className="h-2.5" />
        if (isHeading(l)) return <p key={i} className="mt-3 text-[13px] font-bold uppercase tracking-wide text-accent first:mt-0 dark:text-accent-dark"><Inline t={l} /></p>
        if (/^• /.test(l)) return <p key={i} className="flex gap-2 pl-1"><span className="text-ink-mute">•</span><span className="text-ink-soft dark:text-ink-darks"><Inline t={l.slice(2)} /></span></p>
        if (/^\*[^*]+\*\s*\(\d+\)$/.test(l.trim())) return <p key={i} className="mt-2 font-semibold"><Inline t={l} /></p>
        if (/^(✅|🔄|⚠️|⏱|⭐|-)\s/.test(l)) return <p key={i} className="flex gap-2"><span className="w-5">{l.split(' ')[0]}</span><span><Inline t={l.slice(l.indexOf(' ') + 1)} /></span></p>
        return <p key={i}><Inline t={l} /></p>
      })}
    </div>
  )
}
