import { format } from 'date-fns'
import type { Category, Settings } from '../types'
import type { ReportData } from './report'
import { fmtRange } from './dates'

const hex = (h: string): [number, number, number] => {
  const n = h.replace('#', '')
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
}
const INK: [number, number, number] = [28, 28, 30]
const SOFT: [number, number, number] = [93, 95, 107]
const MUTE: [number, number, number] = [142, 142, 147]
const ACCENT = '#0a7aff'

/** A designed A4 report: header band, stat tiles, coloured section labels, footer. */
export const buildReportPdf = async (d: ReportData, settings: Settings, cats: Category[], subject: string, text: string) => {
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
  const subheadRow = (text: string, color: string) => {
    ensure(22)
    doc.setFillColor(...hex(color)); doc.roundedRect(M + 2, y - 8, 8, 8, 2, 2, 'F')
    doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5)
    doc.text(text, M + 16, y)
    y += 20
  }

  /* ---- content: rendered from the (possibly edited) message text ---- */
  const strip = (l: string) => l.replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, '').replace(/\*/g, '').trim()
  const colourFor = (t: string) => {
    const k = t.toLowerCase()
    if (/complet|done|win/.test(k)) return '#34c759'
    if (/progress|doing/.test(k)) return '#0a7aff'
    if (/pending|block|input|support|overdue/.test(k)) return '#ff9500'
    if (/next week|plan/.test(k)) return '#5e5ce6'
    return ACCENT
  }
  const dotFor = (raw: string) => {
    if (raw.startsWith('✅')) return '#34c759'
    if (raw.startsWith('🔄')) return '#0a7aff'
    if (raw.startsWith('⚠')) return '#ff9500'
    if (raw.startsWith('⭐')) return '#eda100'
    if (raw.startsWith('🔒')) return '#ff3b30'
    return '#9095a8'
  }
  const para = (t: string, size = 10.5, color: [number, number, number] = INK) => {
    const lines = doc.splitTextToSize(t, W - M * 2) as string[]
    ensure(lines.length * 15 + 6)
    doc.setTextColor(...color); doc.setFont('helvetica', 'normal'); doc.setFontSize(size)
    doc.text(lines, M, y, { lineHeightFactor: 1.45 })
    y += lines.length * 15 + 4
  }

  let current = ACCENT
  let blank = 0
  const lines = text.split('\n')
  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (!line) { blank++; if (blank === 1) y += 6; return }
    blank = 0
    const clean = strip(line)
    if (!clean) return
    const hasEmoji = /^\p{Extended_Pictographic}/u.test(line)
    const wrappedBold = /^\*[^*]+\*$/.test(line) || (hasEmoji && /\*[^*]+\*\s*$/.test(line))
    const upper = /^[A-Z][A-Z &·()\-–0-9]+$/.test(line) && line.length > 3
    const subhead = line.match(/^\*?([^*]+?)\*?\s*\((\d+)\)$/)

    if (i < 4 && /weekly update/i.test(clean) && (wrappedBold || upper)) return // header already shows it
    if (subhead && !hasEmoji) {
      const cat = cats.find((c) => c.name.toLowerCase() === subhead[1].trim().toLowerCase())
      subheadRow(`${subhead[1].trim()}  (${subhead[2]})`, cat?.color ?? '#9095a8'); return
    }
    if ((wrappedBold && (hasEmoji || i > 2)) || upper) { current = colourFor(clean); section(clean, current); return }
    if (/^[•\-]\s/.test(line)) {
      const body = strip(line.slice(2))
      const idx = Math.max(body.lastIndexOf(' – '), body.lastIndexOf(' - '))
      const head = idx > 0 ? body.slice(0, idx) : body
      const tail = idx > 0 ? body.slice(idx + 3).trim() : ''
      const isMeta = tail && tail.length < 60 && (/^(due|overdue|expected|need)/i.test(tail) || /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s\d{1,2}(\s\w{3})?$/.test(tail))
      if (isMeta) bullet(head, tail, current)
      else bullet(body, undefined, current)
      return
    }
    if (hasEmoji) { bullet(clean, undefined, dotFor(line)); return }
    para(clean, i === 0 ? 12 : 10.5, i === 0 ? INK : SOFT)
  })

  footer()
  doc.save(`Weekly_Update_${format(d.range.start, 'yyyy-MM-dd')}_to_${format(d.range.end, 'yyyy-MM-dd')}.pdf`)
}
