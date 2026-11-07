import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, Copy, Download, FileText, History, Mail, RefreshCw, Save, Trash2, Check, CircleDashed, Lock, CalendarRange } from 'lucide-react'
import { addWeeks, format } from 'date-fns'
import { Card, Empty } from '../components/ui'
import { useStore } from '../store/useStore'
import { compileWeek, generateReportText, reportSubject } from '../lib/report'
import { fmtRange, fromISO } from '../lib/dates'
import { CategoryTag } from '../components/tasks/Badges'

export default function Report() {
  const { tasks, categories, settings, reports, saveReport, deleteReport } = useStore()
  const [ref, setRef] = useState(new Date())
  const data = useMemo(() => compileWeek(tasks, categories, ref), [tasks, categories, ref])
  const generated = useMemo(() => generateReportText(data, settings, categories), [data, settings, categories])
  const [text, setText] = useState(generated)
  const [subject, setSubject] = useState(reportSubject(data))
  const [dirty, setDirty] = useState(false)
  const [copied, setCopied] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)

  useEffect(() => { if (!dirty) { setText(generated); setSubject(reportSubject(data)) } }, [generated, data, dirty])

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  const email = () => {
    const url = `mailto:${encodeURIComponent(settings.managerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
    window.location.href = url
  }
  const pdf = async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const margin = 56, width = 595 - margin * 2
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
    doc.text(subject, margin, 64)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(110)
    doc.text(`${settings.userName || 'Weekly update'} · generated ${format(new Date(), 'd MMM yyyy, h:mm a')}`, margin, 82)
    doc.setTextColor(20); doc.setFontSize(10.5)
    const lines = doc.splitTextToSize(text, width) as string[]
    let y = 110
    for (const line of lines) {
      if (y > 790) { doc.addPage(); y = 64 }
      const isHeading = /^[A-Z][A-Z /–()\-0-9]+$/.test(line.trim()) && line.trim().length > 3
      doc.setFont('helvetica', isHeading ? 'bold' : 'normal')
      doc.text(line, margin, y)
      y += isHeading ? 17 : 14.5
    }
    doc.save(`Weekly_Update_${format(data.range.start, 'yyyy-MM-dd')}_to_${format(data.range.end, 'yyyy-MM-dd')}.pdf`)
  }
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
          <button className="btn-outline" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copied' : 'Copy to clipboard'}</button>
          <button className="btn-outline" onClick={email} title={settings.managerEmail ? `To ${settings.managerEmail}` : 'Set your manager email in Settings'}><Mail size={15} /> Open in email</button>
          <button className="btn-outline" onClick={pdf}><Download size={15} /> Download as PDF</button>
          <button className="btn-primary" onClick={save}><Save size={15} /> Save to history</button>
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
            <span><span className="num block text-[24px] leading-none">{s.value}</span><span className="block text-xs text-ink-mute dark:text-ink-darkm">{s.label}</span></span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card title="Weekly update" sub={settings.managerEmail ? `To: ${settings.managerName || settings.managerEmail} <${settings.managerEmail}>` : 'Add your manager in Settings to prefill the email'}
          action={<button className="btn-ghost text-xs" onClick={regenerate} title="Discard edits and regenerate from tasks"><RefreshCw size={13} /> Regenerate</button>}>
          <label className="label">Subject</label>
          <input className="input mb-3" value={subject} onChange={(e) => { setSubject(e.target.value); setDirty(true) }} />
          <label className="label">Message (editable)</label>
          <textarea className="input min-h-[520px] font-mono text-[13px] leading-relaxed tracking-normal" value={text} onChange={(e) => { setText(e.target.value); setDirty(true) }} />
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

      {viewed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={() => setViewing(null)}>
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5" onMouseDown={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{viewed.subject}</h3>
              <div className="flex gap-2">
                <button className="btn-outline text-xs" onClick={() => { setText(viewed.text); setSubject(viewed.subject); setDirty(true); setViewing(null) }}>Load into editor</button>
                <button className="btn-ghost text-xs" onClick={() => setViewing(null)}>Close</button>
              </div>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{viewed.text}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
