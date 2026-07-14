import { paiseToUpiAmount } from './money.js'

// VPA like name@bank — letters/digits/._- before @, letters after.
export const VPA_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,}@[a-zA-Z][a-zA-Z0-9]{1,}$/

export function isValidVpa(vpa) {
  return VPA_REGEX.test(String(vpa || '').trim())
}

/**
 * Encode a UPI query value: spaces as %20, keep the VPA's @ literal.
 * encodeURIComponent already leaves no spaces raw and would escape @ — undo that.
 */
function upiEncode(value) {
  return encodeURIComponent(String(value)).replace(/%40/g, '@')
}

/**
 * upi://pay?pa=<VPA>&pn=<shop name>&am=<2-decimal>&cu=INR&tn=<note>&tr=<ref>
 * Pass amountPaise = null for the static "shop QR" (customer enters amount).
 */
export function buildUpiLink({ vpa, shopName, amountPaise = null, note = null, ref = null }) {
  const parts = [`pa=${upiEncode(vpa)}`, `pn=${upiEncode(shopName || 'Shop')}`]
  if (amountPaise != null) parts.push(`am=${paiseToUpiAmount(amountPaise)}`)
  parts.push('cu=INR')
  if (note) parts.push(`tn=${upiEncode(note)}`)
  if (ref) parts.push(`tr=${upiEncode(ref)}`)
  return `upi://pay?${parts.join('&')}`
}
