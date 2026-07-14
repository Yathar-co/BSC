import { useMemo, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { Sheet, QrCanvas, useToast } from './common.jsx'
import { CheckIcon, PersonIcon, ShareIcon } from './Icons.jsx'
import { dispatch, recentCues, useStore } from '../data/store.js'
import { formatPaise, formatQty } from '../util/money.js'
import { billText, newSaleRef, shareText, timeOfDay, uid } from '../util/misc.js'
import { buildUpiLink, isValidVpa } from '../util/upi.js'

const CUE_STARTERS = ['Table 1', 'Table 2', 'Delivery']

/**
 * The payment sheet, in two modes:
 *  - mode="charge": new sale from the cart (lines + totalPaise given).
 *    Confirm → recordSale PAID (stock decrements). Park → recordSale OPEN.
 *  - mode="settle": collect a parked bill (sale given).
 *    Confirm → settleSale (MUST NOT touch stock). Void → voidSale (restocks).
 */
export function PaymentSheet({ mode = 'charge', lines, totalPaise, sale, onClose, onCommitted }) {
  const state = useStore()
  const toast = useToast()
  const shop = state.shop

  // Stable identifiers for the whole sheet lifetime (QR tr= must match the bill).
  const [saleId] = useState(() => (mode === 'settle' ? sale.id : uid()))
  const [ref] = useState(() => (mode === 'settle' ? sale.ref : newSaleRef()))
  const effLines = mode === 'settle' ? sale.lines : lines
  const effTotal = mode === 'settle' ? sale.totalPaise : totalPaise

  const [cue, setCue] = useState(mode === 'settle' ? (sale.customerCue || '') : '')
  const [cueOpen, setCueOpen] = useState(mode === 'settle' && !!sale.customerCue)
  const [phone, setPhone] = useState(mode === 'settle' ? (sale.customerPhone || '') : '')
  const [phoneOpen, setPhoneOpen] = useState(mode === 'settle' && !!sale.customerPhone)
  const [done, setDone] = useState(null) // {at} once paid
  const committed = useRef(false) // double-taps must record exactly ONE sale

  const cueSuggestions = useMemo(() => {
    const recents = recentCues(state)
    return [...recents, ...CUE_STARTERS.filter(s => !recents.includes(s))].slice(0, 5)
  }, [state])

  const hasVpa = isValidVpa(shop.upiId)
  const upiLink = hasVpa
    ? buildUpiLink({ vpa: shop.upiId.trim(), shopName: shop.name, amountPaise: effTotal, note: `Bill ${ref}`, ref })
    : null

  const itemCount = effLines.length

  const burst = () => {
    confetti({ particleCount: 90, spread: 75, origin: { y: 0.7 }, colors: ['#5B43E0', '#0FA877', '#E89324', '#7A63EC'] })
    setTimeout(() => confetti({ particleCount: 40, spread: 100, origin: { y: 0.65 }, scalar: 0.8 }), 180)
  }

  const buildSale = status => ({
    id: saleId, ref, totalPaise: effTotal, at: Date.now(), status,
    customerCue: cue.trim().slice(0, 48) || null,
    customerPhone: phone.trim().slice(0, 15) || null,
    pinned: false,
    lines: effLines,
  })

  const confirmPaid = () => {
    if (committed.current) return
    committed.current = true
    const at = Date.now()
    if (mode === 'settle') {
      const curCue = sale.customerCue || ''
      const curPhone = sale.customerPhone || ''
      if (cue.trim() !== curCue || phone.trim() !== curPhone) {
        dispatch({
          type: 'updateCue',
          saleId,
          cue: cue.trim().slice(0, 48) || null,
          phone: phone.trim().slice(0, 15) || null
        })
      }
      dispatch({ type: 'settleSale', saleId, at })
    } else {
      dispatch({ type: 'recordSale', sale: buildSale('PAID') })
    }
    setDone({ at })
    burst()
    onCommitted?.()
  }

  const parkBill = () => {
    if (committed.current) return
    committed.current = true
    dispatch({ type: 'recordSale', sale: buildSale('OPEN') })
    toast('Bill parked — collect from Sales')
    onCommitted?.()
    onClose()
  }

  const voidBill = () => {
    if (committed.current) return
    if (!window.confirm('Cancel this order and return items to stock?')) return
    committed.current = true
    dispatch({ type: 'voidSale', saleId })
    toast('Order cancelled · stock restored')
    onClose()
  }

  const shareWhatsApp = async () => {
    const s = mode === 'settle'
      ? { ...sale, status: 'PAID', at: done.at }
      : { id: saleId, ref, totalPaise: effTotal, at: done.at, status: 'PAID', lines: effLines }
    const how = await shareText(billText(shop, s))
    if (how === 'whatsapp') toast('Bill copied — opening WhatsApp')
  }

  const shareSMS = async () => {
    const s = mode === 'settle'
      ? { ...sale, status: 'PAID', at: done.at }
      : { id: saleId, ref, totalPaise: effTotal, at: done.at, status: 'PAID', lines: effLines }
    const bodyText = billText(shop, s)
    const phoneClean = phone.trim()
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
    const smsUrl = `sms:${phoneClean}${isIOS ? '&' : '?'}body=${encodeURIComponent(bodyText)}`
    try {
      await navigator.clipboard.writeText(bodyText)
      toast('Bill copied to clipboard')
    } catch {}
    window.open(smsUrl, '_blank')
  }

  // ── Success view ──
  if (done) {
    return (
      <Sheet onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <span style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--emerald-tint)', color: 'var(--emerald)', display: 'inline-grid', placeItems: 'center' }}>
            <CheckIcon style={{ width: 34, height: 34 }} />
          </span>
          <h3 style={{ fontSize: 22, fontWeight: 800, margin: '12px 0 2px' }}>Payment received</h3>
          <div className="num" style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800 }}>{formatPaise(effTotal)}</div>
          <div className="muted" style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{timeOfDay(done.at)} · {ref}</div>
          <div style={{ marginTop: 12 }}>
            <span className="badge badge-green">Inventory &amp; sales updated</span>
          </div>
        </div>

        <div className="receipt" style={{ margin: '18px 0' }}>
          {effLines.map((l, i) => (
            <div className="billline" key={i}>
              <span>{l.name} <span className="muted">{l.unit === 'PCS' ? `x${Math.round(l.qtyMilli / 1000)}` : formatQty(l.qtyMilli, l.unit)}</span></span>
              <span className="num" style={{ fontWeight: 700 }}>{formatPaise(Math.round((l.pricePaise * l.qtyMilli) / 1000))}</span>
            </div>
          ))}
          <div className="divider" style={{ margin: '8px 0' }} />
          <div className="billline" style={{ fontWeight: 800 }}>
            <span>Total</span><span className="num">{formatPaise(effTotal)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button className="btn btn-ghost" style={{ background: 'var(--emerald-tint)', color: 'var(--emerald)' }} onClick={shareWhatsApp}>
              <ShareIcon style={{ width: 16, height: 16 }} /> WhatsApp
            </button>
            <button className="btn btn-ghost" style={{ background: 'var(--violet-tint)', color: 'var(--violet)' }} onClick={shareSMS}>
              <span>💬</span> Send SMS
            </button>
          </div>
          <button className="btn btn-primary btn-block" onClick={onClose}>Done</button>
        </div>
      </Sheet>
    )
  }

  // ── Pay view ──
  return (
    <Sheet onClose={onClose}>
      {mode === 'settle' && <div className="badge badge-amber" style={{ marginBottom: 8 }}>Collect parked bill</div>}
      <div style={{ textAlign: 'center' }}>
        <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>Amount to pay</div>
        <div className="num" style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 800, lineHeight: 1.1, marginBottom: 14 }}>
          {formatPaise(effTotal)}
        </div>

        {hasVpa ? (
          <>
            <div className="qrframe"><QrCanvas text={upiLink} /></div>
            <div className="muted" style={{ fontSize: 12.5, fontWeight: 600, marginTop: 10 }}>
              Scan with any UPI app · GPay · PhonePe · Paytm
            </div>
          </>
        ) : (
          <div style={{ background: 'var(--amber-tint)', borderRadius: 16, padding: '14px 16px', fontSize: 13.5, fontWeight: 600, color: '#A5670F' }}>
            Add your UPI ID in the Shop tab to show a payment QR here. You can still mark cash payments received below.
          </div>
        )}
      </div>

      <div style={{ margin: '16px 0 4px' }}>
        {[
          ['Paying to', shop.name || '—'],
          ['UPI ID', hasVpa ? shop.upiId : 'Not set'],
          ['Items', String(itemCount)],
          ['Bill no.', ref],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13.5 }}>
            <span className="muted" style={{ fontWeight: 600 }}>{k}</span>
            <span style={{ fontWeight: 700 }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', margin: '8px 0 12px' }}>
        <span className="waitpill"><span className="waitdot" /> Waiting for customer to pay…</span>
      </div>

      {/* Customer details: internal cue & phone number */}
      {!cueOpen && !phoneOpen ? (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button className="chip" type="button" onClick={() => setCueOpen(true)}>
            <PersonIcon style={{ width: 15, height: 15 }} /> + Who&rsquo;s this for?
          </button>
          <button className="chip" type="button" onClick={() => { setPhoneOpen(true); setCueOpen(true); }}>
            <span>📞</span> + Add customer phone
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cueOpen && (
            <div>
              <input className="input" placeholder="Customer cue (e.g. Green jacket · Table 3)" autoFocus={!phoneOpen}
                value={cue} onChange={e => setCue(e.target.value)} aria-label="Customer cue (internal)" />
              <div className="cuechips">
                {cueSuggestions.map(s => (
                  <button key={s} className="chip" type="button" onClick={() => setCue(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {phoneOpen ? (
            <input className="input num" type="tel" placeholder="Customer phone (e.g. 9876543210)" maxLength={10} autoFocus={phoneOpen}
              value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} aria-label="Customer phone" />
          ) : (
            <button className="chip" type="button" style={{ alignSelf: 'flex-start' }} onClick={() => setPhoneOpen(true)}>
              <span>📞</span> + Add customer phone
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 10 }}>
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn btn-emerald" onClick={confirmPaid}>
          <CheckIcon style={{ width: 18, height: 18 }} /> Payment received
        </button>
      </div>

      {mode === 'charge' && (
        <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={parkBill}>
          Park bill — collect later
        </button>
      )}
      {mode === 'settle' && (
        <button className="btn btn-danger-ghost btn-block" style={{ marginTop: 10 }} onClick={voidBill}>
          Cancel this order &amp; restock
        </button>
      )}
    </Sheet>
  )
}
