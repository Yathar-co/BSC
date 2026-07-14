import { useEffect, useMemo, useState } from 'react'
import { dispatch, openSales, paidSales, revenue, itemsSoldMilli, useStore } from '../data/store.js'
import { Sheet, useToast } from '../ui/common.jsx'
import { PersonIcon, PinIcon, SalesIcon, ShareIcon } from '../ui/Icons.jsx'
import { PaymentSheet } from '../ui/PaymentSheet.jsx'
import { formatPaise, formatQty, lineTotalPaise, formatMilli } from '../util/money.js'
import { ageMinutes, billText, cueColor, dayLabel, shareText, startOfDay, timeOfDay } from '../util/misc.js'

function AgingBadge({ at }) {
  const m = ageMinutes(at)
  const cls = m < 5 ? 'badge-green' : m <= 15 ? 'badge-amber' : 'badge-rose'
  const label = m < 1 ? 'just now' : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
  return <span className={'badge ' + cls}>{label}</span>
}

export function SalesScreen() {
  const state = useStore()
  const toast = useToast()
  const [settle, setSettle] = useState(null) // sale being collected
  const [details, setDetails] = useState(null) // saleId for history details
  const [, tick] = useState(0)

  // Refresh aging badges every 30s.
  useEffect(() => {
    const t = setInterval(() => tick(x => x + 1), 30000)
    return () => clearInterval(t)
  }, [])

  const open = openSales(state)
  const paid = paidSales(state)
  const today0 = startOfDay()
  const todaySales = paid.filter(s => s.at >= today0)
  const todayRevenue = revenue(todaySales)
  const todayItems = itemsSoldMilli(todaySales)
  const avgBill = todaySales.length ? Math.round(todayRevenue / todaySales.length) : 0

  const grouped = useMemo(() => {
    const sorted = [...paid].sort((a, b) => b.at - a.at)
    const groups = []
    for (const s of sorted) {
      const label = dayLabel(s.at)
      const g = groups.find(x => x.label === label)
      if (g) { g.sales.push(s); g.total += s.totalPaise }
      else groups.push({ label, sales: [s], total: s.totalPaise })
    }
    return groups
  }, [paid])

  const detailSale = details ? state.sales.find(s => s.id === details) : null

  return (
    <div className="screen">
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 14 }}>Sales</h2>

      {open.length > 0 && (
        <>
          <div className="sectionhead" style={{ marginTop: 0 }}>
            <h3>Active queue</h3>
            <span className="badge badge-amber">{formatPaise(revenue(open))} to collect</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
            {open.map(sale => {
              const title = sale.customerCue || sale.lines.map(l => l.name).slice(0, 2).join(', ') + (sale.lines.length > 2 ? '…' : '')
              const col = cueColor(sale.customerCue || sale.ref)
              return (
                <div key={sale.id} className={'queuecard' + (sale.pinned ? ' pinned' : '')} style={{ transition: 'all 0.25s ease' }}>
                  <button style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, textAlign: 'left' }} onClick={() => setSettle(sale)}>
                    <span className="qavatar" style={{ background: col.bg, color: col.fg }}><PersonIcon /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</b>
                      <span className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>
                        {formatPaise(sale.totalPaise)} · {sale.lines.length} item{sale.lines.length > 1 ? 's' : ''} · {sale.ref}
                      </span>
                    </span>
                  </button>
                  <AgingBadge at={sale.at} />
                  <button className={'pinbtn' + (sale.pinned ? ' on' : '')} aria-label={sale.pinned ? 'Unpin' : 'Pin to top'}
                    onClick={() => dispatch({ type: 'togglePin', saleId: sale.id })}>
                    <PinIcon filled={sale.pinned} style={{ width: 19, height: 19 }} />
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className="hero" style={{ marginTop: open.length ? 14 : 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.75 }}>Today</div>
        <div className="num" style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, marginBottom: 12 }}>{formatPaise(todayRevenue)}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12.5 }}>
          {[
            [String(todaySales.length), 'orders'],
            [formatMilli(todayItems), 'items sold'],
            [formatPaise(avgBill), 'avg bill'],
          ].map(([v, l]) => (
            <div key={l} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '10px 12px' }}>
              <div className="num" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17 }}>{v}</div>
              <div style={{ opacity: 0.65, fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {grouped.length === 0 && open.length === 0 && (
        <div className="empty">
          <div className="glyph"><SalesIcon /></div>
          <b>No sales yet</b>
          <div style={{ fontSize: 13.5, marginTop: 4 }}>Your bills will appear here, day by day.</div>
        </div>
      )}

      {grouped.map(g => (
        <div key={g.label}>
          <div className="sectionhead">
            <h3>{g.label}</h3>
            <span className="muted num" style={{ fontSize: 13.5, fontWeight: 700 }}>{formatPaise(g.total)}</span>
          </div>
          {g.sales.map(s => (
            <button className="rowitem" key={s.id} onClick={() => setDetails(s.id)}>
              <span className="icontile" style={{ background: 'var(--emerald-tint)', color: 'var(--emerald)', fontWeight: 800 }}>₹</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b>{s.customerCue || `${s.lines.length} item${s.lines.length > 1 ? 's' : ''}`}</b>
                <span className="muted"> · {s.ref}</span><br />
                <span className="muted" style={{ fontSize: 12.5 }}>{timeOfDay(s.at)} · {s.lines.length} item{s.lines.length > 1 ? 's' : ''}</span>
              </span>
              <b className="num" style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{formatPaise(s.totalPaise)}</b>
            </button>
          ))}
        </div>
      ))}

      {settle && (
        <PaymentSheet mode="settle" sale={settle} onClose={() => setSettle(null)} />
      )}
      {detailSale && (
        <BillDetails sale={detailSale} shop={state.shop} onClose={() => setDetails(null)} toast={toast} />
      )}
    </div>
  )
}

function BillDetails({ sale, shop, onClose, toast }) {
  return (
    <Sheet onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <h3 style={{ fontSize: 19, fontWeight: 800 }}>Bill {sale.ref}</h3>
        <span className={'badge ' + (sale.status === 'PAID' ? 'badge-green' : 'badge-amber')}>{sale.status === 'PAID' ? 'Paid' : 'Open'}</span>
      </div>
      <div className="muted" style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
        {dayLabel(sale.at)} · {timeOfDay(sale.at)}
      </div>

      <div className="receipt">
        {sale.lines.map((l, i) => (
          <div className="billline" key={i}>
            <span>{l.name} <span className="muted">{l.unit === 'PCS' ? `x${Math.round(l.qtyMilli / 1000)}` : formatQty(l.qtyMilli, l.unit)}</span></span>
            <span className="num" style={{ fontWeight: 700 }}>{formatPaise(lineTotalPaise(l.pricePaise, l.qtyMilli))}</span>
          </div>
        ))}
        <div className="divider" style={{ margin: '8px 0' }} />
        <div className="billline" style={{ fontWeight: 800 }}>
          <span>Total</span><span className="num">{formatPaise(sale.totalPaise)}</span>
        </div>
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label>Customer cue (only you see this)</label>
        <input className="input" maxLength={48} placeholder="e.g. Green jacket · Table 3"
          value={sale.customerCue || ''}
          onChange={e => dispatch({ type: 'updateCue', saleId: sale.id, cue: e.target.value || null })} />
      </div>

      <div className="field" style={{ marginTop: 10 }}>
        <label>Customer Phone (for SMS billing)</label>
        <input className="input num" type="tel" placeholder="e.g. 9876543210" maxLength={10}
          value={sale.customerPhone || ''}
          onChange={e => dispatch({ type: 'updateCue', saleId: sale.id, cue: sale.customerCue, phone: e.target.value.replace(/\D/g, '') || null })} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button className="btn btn-ghost" style={{ background: 'var(--emerald-tint)', color: 'var(--emerald)' }} onClick={async () => {
            const how = await shareText(billText(shop, sale))
            if (how === 'whatsapp') toast('Bill copied — opening WhatsApp')
          }}>
            <ShareIcon style={{ width: 16, height: 16 }} /> WhatsApp
          </button>
          <button className="btn btn-ghost" style={{ background: 'var(--violet-tint)', color: 'var(--violet)' }} onClick={async () => {
            const bodyText = billText(shop, sale)
            const phoneClean = (sale.customerPhone || '').trim()
            const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
            const smsUrl = `sms:${phoneClean}${isIOS ? '&' : '?'}body=${encodeURIComponent(bodyText)}`
            try { await navigator.clipboard.writeText(bodyText); toast('Bill copied to clipboard') } catch {}
            window.open(smsUrl, '_blank')
          }}>
            <span>💬</span> Send SMS
          </button>
        </div>
        <button className="btn btn-primary btn-block" onClick={onClose}>Close</button>
      </div>
    </Sheet>
  )
}
