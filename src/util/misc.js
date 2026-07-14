import { formatPaise, formatQty } from './money.js'

export function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now()
}

const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function newSaleRef() {
  let s = ''
  for (let i = 0; i < 6; i++) s += REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)]
  return 'ZP' + s
}

/** Stable pastel from a cue string, for queue avatars. */
export function cueColor(text) {
  let h = 0
  const t = String(text || '?')
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0
  const hue = h % 360
  return { bg: `hsl(${hue} 70% 92%)`, fg: `hsl(${hue} 55% 34%)` }
}

export function timeOfDay(ts) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function dayLabel(ts) {
  const d = new Date(ts)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const that = new Date(d); that.setHours(0, 0, 0, 0)
  const diff = Math.round((today - that) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: that.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

export function startOfDay(ts = Date.now()) {
  const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime()
}

export function ageMinutes(ts) {
  return Math.floor((Date.now() - ts) / 60000)
}

export function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Customer-facing plain-text bill. RULE: the internal customerCue must NEVER
 * appear here — do not add it.
 */
export function billText(shop, sale) {
  const lines = []
  lines.push(`🧾 ${shop.name || 'My Shop'}`)
  lines.push(`Bill ${sale.ref} · ${new Date(sale.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}`)
  lines.push('──────────────')
  for (const l of sale.lines) {
    const total = formatPaise(Math.round((l.pricePaise * l.qtyMilli) / 1000))
    const qty = l.unit === 'PCS' ? `x${Math.round(l.qtyMilli / 1000)}` : formatQty(l.qtyMilli, l.unit)
    lines.push(`${l.name} ${qty} — ${total}`)
  }
  lines.push('──────────────')
  lines.push(`TOTAL ${formatPaise(sale.totalPaise)}`)
  lines.push(sale.status === 'PAID' ? 'Paid via UPI ✅' : 'Payment pending')
  lines.push('')
  lines.push('Powered by Zippi')
  return lines.join('\n')
}

export async function shareText(text) {
  if (navigator.share) {
    try { await navigator.share({ text }); return 'shared' } catch { /* cancelled */ }
  }
  try { await navigator.clipboard.writeText(text) } catch { /* ignore */ }
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener')
  return 'whatsapp'
}
