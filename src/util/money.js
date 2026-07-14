// ── Money math ──────────────────────────────────────────────────────────────
// NEVER floating-point on money. Prices live as PAISE in integers.
// Weights/volumes live as MILLI-units (grams / ml) in integers.

/** Line total in paise: pricePaise per unit × qtyMilli thousandths of a unit. */
export function lineTotalPaise(pricePaise, qtyMilli) {
  // Integer-safe: values stay far below Number.MAX_SAFE_INTEGER for shop scale.
  return Math.round((pricePaise * qtyMilli) / 1000)
}

/** Indian digit grouping for a non-negative integer string: 1234567 → 12,34,567 */
function groupIndian(intStr) {
  if (intStr.length <= 3) return intStr
  const last3 = intStr.slice(-3)
  let rest = intStr.slice(0, -3)
  const parts = []
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2))
    rest = rest.slice(0, -2)
  }
  if (rest) parts.unshift(rest)
  return parts.join(',') + ',' + last3
}

/**
 * Format paise as rupees: ₹1,23,456.50 — hides ".00" on whole rupees.
 * Pass { symbol:false } to omit the ₹ sign.
 */
export function formatPaise(paise, { symbol = true } = {}) {
  const neg = paise < 0
  const abs = Math.abs(Math.round(paise))
  const rupees = Math.floor(abs / 100)
  const p = abs % 100
  let s = groupIndian(String(rupees))
  if (p !== 0) s += '.' + String(p).padStart(2, '0')
  return (neg ? '-' : '') + (symbol ? '₹' : '') + s
}

/** Always-2-decimal plain amount for the UPI deep link: 6960 → "69.60" */
export function paiseToUpiAmount(paise) {
  const abs = Math.max(0, Math.round(paise))
  return `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

/** Parse a user-typed rupee string ("80", "69.6", "69.60") → paise. null if invalid. */
export function parseRupeesToPaise(text) {
  const t = String(text).trim()
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(t)) return null
  const [r, p = ''] = t.split('.')
  return parseInt(r, 10) * 100 + parseInt((p + '00').slice(0, 2) || '0', 10)
}

/** Parse a decimal quantity ("0.87", "2.5") → milli-units. null if invalid. */
export function parseQtyToMilli(text) {
  const t = String(text).trim()
  if (!/^\d{0,5}(\.\d{1,3})?$/.test(t) || t === '' || t === '.') return null
  const [w = '0', f = ''] = t.split('.')
  return parseInt(w || '0', 10) * 1000 + parseInt((f + '000').slice(0, 3), 10)
}

/** Display a milli quantity: 870 → "0.87", 2500 → "2.5", 3000 → "3" */
export function formatMilli(qtyMilli) {
  const whole = Math.floor(qtyMilli / 1000)
  const frac = qtyMilli % 1000
  if (frac === 0) return String(whole)
  return `${whole}.${String(frac).padStart(3, '0').replace(/0+$/, '')}`
}

/** Quantity with unit label: (870,'KG') → "0.87 kg"; (3000,'PCS') → "3 pcs" */
export function formatQty(qtyMilli, unit) {
  const u = unit === 'KG' ? 'kg' : unit === 'LTR' ? 'L' : 'pcs'
  return `${formatMilli(qtyMilli)} ${u}`
}
