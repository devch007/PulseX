import { addDays, format } from 'date-fns'
import type { Category, Settings } from '../types'
import type { ReportData } from './report'
import { fmtRange, fromISO, isOverdue } from './dates'
import { categoryOf } from '../store/useStore'

const hex = (h: string): [number, number, number] => {
  const n = h.replace('#', '')
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
}
const INK: [number, number, number] = [28, 28, 30]
const SOFT: [number, number, number] = [93, 95, 107]
const MUTE: [number, number, number] = [142, 142, 147]
const ACCENT = '#0a7aff'

/** A designed A4 report: header band, stat tiles, coloured section labels, footer. */
export const buildReportPdf = async (d: ReportData, settings: Settings, cats: Category[], subject: string) => {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = 595, Hh = 842, M = 48
  let y = 0
  let page = 1

  const footer = () => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTE)
    doc.text(`${settings.userName || 'Weekly update'} · generated ${format(new Date(), 'd MMM yyyy, h:mm a')}`, M, Hh - 28)
    doc.text(`Page ${page}`, W - M, Hh - 28, { align: 'right' })
  }
  const ensure = (need: number) => {
    if (y + need > Hh - 60) { footer(); doc.addPage(); page++; y = M + 8 }
  }

  /* ---- header band ---- */
  doc.setFillColor(...hex('#0a7aff')); doc.rect(0, 0, W, 150, 'F')
  doc.setFillColor(...hex('#3b6cf6')); doc.rect(W * 0.55, 0, W * 0.45, 150, 'F')
  doc.setFillColor(...hex('#6a5cf0')); doc.rect(W * 0.8, 0, W * 0.2, 150, 'F')
  const g = doc as unknown as { setGState: (g: unknown) => void; GState: (o: { opacity: number }) => unknown }
  doc.setFillColor(255, 255, 255); g.setGState(g.GState({ opacity: 0.12 }))
  doc.circle(W - 70, 20, 110, 'F'); doc.circle(80, 160, 70, 'F')
  g.setGState(g.GState({ opacity: 1 }))
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text('WEEKLY UPDATE', M, 52, { charSpace: 1.5 })
  doc.setFontSize(24); doc.text(fmtRange(d.range.start, d.range.end), M, 84)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
  doc.text(`${settings.userName || 'Your name'}${settings.managerName ? `  for  ${settings.managerName}` : ''}`, M, 106)
  doc.setFontSize(9); doc.text(subject, M, 124)
  y = 178

  /* ---- stat tiles ---- */
  const tiles: [string, string, string][] = [
    ['Completed', String(d.completed.length), '#34c759'],
    ['In progress', String(d.inProgress.length), '#0a7aff'],
    ['Pending / blocked', String(d.pending.length + d.blocked.length), '#ff9500'],
  ]
  const tw = (W - M * 2 - 14 * 2) / 3
  tiles.forEach(([label, val, c], i) => {
    const x = M + i * (tw + 14)
    doc.setFillColor(246, 247, 251); doc.roundedRect(x, y, tw, 76, 14, 14, 'F')
    doc.setFillColor(...hex(c)); doc.roundedRect(x + 16, y + 18, 6, 40, 3, 3, 'F')
    doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.text(val, x + 34, y + 42)
    doc.setTextColor(...MUTE); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(label, x + 34, y + 60)
  })
  y += 112

  /* ---- helpers ---- */
  const section = (title: string, color = ACCENT) => {
    ensure(40)
    doc.setFillColor(...hex(color)); doc.roundedRect(M, y - 9, 4, 14, 2, 2, 'F')
    doc.setTextColor(...hex(color)); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5)
    doc.text(title.toUpperCase(), M + 12, y + 2, { charSpace: 1 })
    y += 20
    doc.setDrawColor(233, 235, 242); doc.setLineWidth(0.6); doc.line(M, y - 6, W - M, y - 6)
    y += 12
  }
  const bullet = (text: string, meta?: string, color = '#9095a8', indent = 0) => {
    const x = M + 14 + indent
    const lines = doc.splitTextToSize(text, W - M - x - 6) as string[]
    ensure(lines.length * 16 + (meta ? 13 : 0) + 8)
    doc.setFillColor(...hex(color)); doc.circle(x - 8, y - 3.5, 2.6, 'F')
    doc.setTextColor(...INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5)
    doc.text(lines, x, y, { lineHeightFactor: 1.45 })
    y += lines.length * 16
    if (meta) { doc.setTextColor(...MUTE); doc.setFontSize(8.5); doc.text(meta, x, y - 3); y += 13 }
    y += 5
  }
  const subhead = (text: string, color: string) => {
    ensure(22)
    doc.setFillColor(...hex(color)); doc.roundedRect(M + 2, y - 8, 8, 8, 2, 2, 'F')
    doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5)
    doc.text(text, M + 16, y)
    y += 20
  }
  const empty = (t: string) => { ensure(18); doc.setTextColor(...SOFT); doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.text(t, M + 6, y); y += 16 }

  /* ---- content ---- */
  section('What I completed', '#34c759')
  if (!d.byCategory.length) empty('Nothing closed this week.')
  for (const g of d.byCategory) {
    subhead(`${g.category.name}  (${g.tasks.length})`, g.category.color)
    for (const t of g.tasks) bullet(t.title, undefined, g.category.color, 8)
    y += 8
  }
  y += 10

  section('In progress', '#0a7aff')
  if (!d.inProgress.length) empty('Nothing in progress right now.')
  for (const t of d.inProgress) bullet(t.title, `${categoryOf(cats, t.categoryId).name} · expected ${t.dueAt ? format(fromISO(t.dueAt), 'EEE d MMM') : 'TBC'}`, categoryOf(cats, t.categoryId).color)
  y += 16

  section('Pending & need your input', '#ff9500')
  if (!d.blocked.length && !d.pending.length) empty('No blockers. All good.')
  for (const t of d.blocked) bullet(`Blocked: ${t.title}`, t.notes ? `Need: ${t.notes}` : undefined, '#ff3b30')
  for (const t of d.pending) bullet(t.title, isOverdue(t.dueAt, t.status) ? `Overdue since ${format(fromISO(t.dueAt!), 'd MMM')}` : t.dueAt ? `Due ${format(fromISO(t.dueAt), 'd MMM')}` : undefined, '#ff9500')
  y += 16

  const nw = { start: addDays(d.range.start, 7), end: addDays(d.range.end, 7) }
  section(`Plan for next week · ${fmtRange(nw.start, nw.end)}`, '#5e5ce6')
  if (!d.nextWeek.length) empty('Will plan on Monday.')
  for (const t of d.nextWeek) bullet(`${format(fromISO(t.dueAt!), 'EEE d')}  ${t.title}`, `${categoryOf(cats, t.categoryId).name}${t.priority === 'high' ? ' · high priority' : ''}`, categoryOf(cats, t.categoryId).color)

  footer()
  doc.save(`Weekly_Update_${format(d.range.start, 'yyyy-MM-dd')}_to_${format(d.range.end, 'yyyy-MM-dd')}.pdf`)
}
