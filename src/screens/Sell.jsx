import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../data/store.js'
import { useToast, Dialog } from '../ui/common.jsx'
import { CategoryTile, SearchIcon, ScanIcon, PlusIcon, BoltIcon, EditIcon, CartIcon } from '../ui/Icons.jsx'
import { WeightDialog } from '../ui/WeightDialog.jsx'
import { QuickAdd } from '../ui/QuickAdd.jsx'
import { PaymentSheet } from '../ui/PaymentSheet.jsx'
import { formatPaise, formatQty, lineTotalPaise } from '../util/money.js'

function stockBadge(item) {
  if (item.quantityMilli <= 0) return <span className="badge badge-rose">Sold out</span>
  const label = item.unit === 'PCS' ? `${Math.floor(item.quantityMilli / 1000)} left` : `${formatQty(item.quantityMilli, item.unit)} left`
  if (item.quantityMilli <= item.lowStockAtMilli) return <span className="badge badge-amber">{label}</span>
  return <span className="badge badge-green">{label}</span>
}

export function SellScreen({ cart, setCart }) {
  const state = useStore()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [weightFor, setWeightFor] = useState(null) // item being weighed
  const [quickAdd, setQuickAdd] = useState(false)
  const [paySheet, setPaySheet] = useState(null) // {lines, totalPaise}
  const [scanOpen, setScanOpen] = useState(false)
  const searchRef = useRef(null)
  const lastScanAt = useRef(0)

  const items = state.items
  const byId = useMemo(() => new Map(items.map(i => [i.id, i])), [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(i => i.name.toLowerCase().includes(q) || (i.barcode && i.barcode.includes(q)))
  }, [items, query])

  const cartQty = id => cart.find(c => c.itemId === id)?.qtyMilli || 0

  const setQty = (item, qtyMilli) => {
    setCart(prev => {
      if (qtyMilli <= 0) return prev.filter(c => c.itemId !== item.id)
      if (prev.some(c => c.itemId === item.id)) return prev.map(c => (c.itemId === item.id ? { ...c, qtyMilli } : c))
      return [...prev, { itemId: item.id, qtyMilli }]
    })
  }

  const addFixed = item => {
    const cur = cartQty(item.id)
    if (cur + 1000 > item.quantityMilli) { toast(`Only ${Math.floor(item.quantityMilli / 1000)} in stock`, 'err'); return }
    setQty(item, cur + 1000)
  }

  const tapItem = item => {
    if (item.quantityMilli <= 0) return
    if (item.saleType === 'LOOSE') setWeightFor(item)
    else addFixed(item)
  }

  const handleScan = code => {
    const now = Date.now()
    if (now - lastScanAt.current < 300) return
    lastScanAt.current = now
    const item = items.find(i => i.barcode === code)
    if (!item) { toast(`No item with barcode ${code}`, 'err'); return }
    if (item.quantityMilli <= 0) { toast(`${item.name} is sold out`, 'err'); return }
    if (item.saleType === 'LOOSE') setWeightFor(item)
    else { addFixed(item); toast(`Added ${item.name}`) }
    setQuery('')
  }

  // USB / Bluetooth keyboard-wedge scanners: rapid key burst ending in Enter.
  useEffect(() => {
    let buf = ''
    let lastKey = 0
    const onKey = e => {
      const now = performance.now()
      if (now - lastKey > 90) buf = ''
      lastKey = now
      if (e.key === 'Enter') {
        if (buf.length >= 6) { handleScan(buf); e.preventDefault() }
        buf = ''
      } else if (e.key.length === 1 && /[0-9A-Za-z]/.test(e.key)) {
        buf += e.key
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [items, cart]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cart → lines snapshot
  const lines = cart
    .map(c => ({ item: byId.get(c.itemId), qtyMilli: c.qtyMilli }))
    .filter(x => x.item)
    .map(({ item, qtyMilli }) => ({
      itemId: item.id, name: item.name, category: item.category,
      pricePaise: item.pricePaise, qtyMilli, unit: item.unit,
    }))
  const total = lines.reduce((t, l) => t + lineTotalPaise(l.pricePaise, l.qtyMilli), 0)
  const count = lines.length

  const openCharge = () => setPaySheet({ lines, totalPaise: total })

  const BillPanel = (
    <div className="billpanel card">
      <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <CartIcon style={{ width: 19, height: 19 }} /> Current bill
      </h3>
      {lines.length === 0 && <div className="muted" style={{ fontSize: 13.5, padding: '12px 0' }}>Tap items to add them here.</div>}
      {lines.map(l => {
        const item = byId.get(l.itemId)
        return (
          <div key={l.itemId} className="billline" style={{ alignItems: 'center' }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b>{l.name}</b><br />
              <span className="muted" style={{ fontSize: 12.5 }}>
                {l.unit === 'PCS' ? `x${Math.round(l.qtyMilli / 1000)}` : formatQty(l.qtyMilli, l.unit)} · {formatPaise(lineTotalPaise(l.pricePaise, l.qtyMilli))}
              </span>
            </span>
            {item?.saleType === 'LOOSE'
              ? <button className="pinbtn on" onClick={() => setWeightFor(item)} aria-label="Edit weight"><EditIcon style={{ width: 17, height: 17 }} /></button>
              : (
                <span className="stepper">
                  <button onClick={() => setQty(item, l.qtyMilli - 1000)} aria-label="Less">−</button>
                  <span className="qv num">{Math.round(l.qtyMilli / 1000)}</span>
                  <button onClick={() => addFixed(item)} aria-label="More">+</button>
                </span>
              )}
          </div>
        )
      })}
      <div className="divider" />
      <div className="billline" style={{ fontWeight: 800, fontSize: 16 }}>
        <span>Total</span><span className="num">{formatPaise(total)}</span>
      </div>
      <button className="btn btn-emerald btn-block" disabled={count === 0} onClick={openCharge}>Charge {count ? formatPaise(total) : ''} →</button>
    </div>
  )

  return (
    <div className="screen">
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 14 }}>New sale</h2>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div className="searchbar" style={{ flex: 1 }}>
          <SearchIcon />
          <input ref={searchRef} placeholder="Search or scan barcode…" value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && /^\d{6,}$/.test(query.trim())) handleScan(query.trim())
            }} />
          <button className="scanbtn" onClick={() => setScanOpen(true)} aria-label="Scan barcode with camera"><ScanIcon /></button>
        </div>
        <button className="btn btn-ghost" style={{ padding: '0 16px' }} onClick={() => setQuickAdd(true)}>
          <BoltIcon style={{ width: 17, height: 17 }} /> Quick item
        </button>
      </div>

      <div className="sell-duo">
        <div>
          {filtered.length === 0 && (
            <div className="empty">
              <div className="glyph"><SearchIcon /></div>
              <b>Nothing matches “{query}”</b>
              <div style={{ marginTop: 10 }}>
                <button className="btn btn-primary" onClick={() => setQuickAdd(true)}><PlusIcon style={{ width: 16, height: 16 }} /> Add “{query}” as a new item</button>
              </div>
            </div>
          )}
          <div className="prodgrid">
            {filtered.map(item => {
              const inCart = cartQty(item.id)
              const dead = item.quantityMilli <= 0
              return (
                <div key={item.id} className={'prodcard' + (inCart ? ' incart' : '') + (dead ? ' dead' : '')}
                  role="button" tabIndex={dead ? -1 : 0}
                  onClick={() => tapItem(item)}
                  onKeyDown={e => { if (e.key === ' ') { e.preventDefault(); tapItem(item) } }}>
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <CategoryTile category={item.category} />
                    {stockBadge(item)}
                  </div>
                  <div className="pname">{item.name}</div>
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <span>
                      <span className="pprice num">{formatPaise(item.pricePaise)}</span>
                      {item.saleType === 'LOOSE' && <span className="punit">/{item.unit === 'KG' ? 'kg' : 'L'}</span>}
                    </span>
                    {inCart > 0 && item.saleType === 'FIXED' && (
                      <span className="stepper" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setQty(item, inCart - 1000)} aria-label="Less">−</button>
                        <span className="qv num">{Math.round(inCart / 1000)}</span>
                        <button onClick={() => addFixed(item)} aria-label="More">+</button>
                      </span>
                    )}
                    {inCart > 0 && item.saleType === 'LOOSE' && (
                      <button className="badge badge-violet" onClick={e => { e.stopPropagation(); setWeightFor(item) }}>
                        {formatQty(inCart, item.unit)} <EditIcon style={{ width: 12, height: 12 }} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {BillPanel}
      </div>

      {/* Floating charge bar (phone) */}
      {count > 0 && !paySheet && (
        <button className="chargebar" onClick={openCharge}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{count} item{count > 1 ? 's' : ''}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19 }} className="num">{formatPaise(total)}</span>
          <span style={{ fontWeight: 800 }}>Charge →</span>
        </button>
      )}

      {weightFor && (
        <WeightDialog
          item={weightFor}
          initialMilli={cartQty(weightFor.id) || null}
          onClose={() => setWeightFor(null)}
          onConfirm={qtyMilli => { setQty(weightFor, qtyMilli); setWeightFor(null) }}
        />
      )}
      {quickAdd && <QuickAdd onClose={() => setQuickAdd(false)} />}
      {paySheet && (
        <PaymentSheet
          mode="charge"
          lines={paySheet.lines}
          totalPaise={paySheet.totalPaise}
          onClose={() => setPaySheet(null)}
          onCommitted={() => setCart([])}
        />
      )}
      {scanOpen && <ScanModal onClose={() => setScanOpen(false)} onScan={code => { setScanOpen(false); handleScan(code) }} />}
    </div>
  )
}

/** Camera scanning via the BarcodeDetector API where available. */
function ScanModal({ onClose, onScan }) {
  const videoRef = useRef(null)
  const [error, setError] = useState(null)
  const [manual, setManual] = useState('')
  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window

  useEffect(() => {
    let stream, timer, stopped = false
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (stopped) { stream.getTracks().forEach(t => t.stop()); return }
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        if (supported) {
          const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'] })
          timer = setInterval(async () => {
            try {
              const codes = await detector.detect(videoRef.current)
              if (codes.length > 0 && codes[0].rawValue) { clearInterval(timer); onScan(codes[0].rawValue) }
            } catch { /* frame not ready */ }
          }, 280)
        }
      } catch {
        setError('Camera unavailable. Type the barcode below or use a USB scanner.')
      }
    }
    start()
    return () => { stopped = true; clearInterval(timer); stream?.getTracks().forEach(t => t.stop()) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog onClose={onClose}>
      <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Scan barcode</h3>
      {!error && <video ref={videoRef} className="scanvideo" muted playsInline />}
      {!error && !supported && (
        <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
          Live detection isn&rsquo;t supported in this browser — type the code below instead.
        </div>
      )}
      {error && <div className="muted" style={{ fontSize: 13.5 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input className="input num" inputMode="numeric" placeholder="Type barcode…" value={manual}
          onChange={e => setManual(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && manual.trim()) onScan(manual.trim()) }} />
        <button className="btn btn-primary" disabled={!manual.trim()} onClick={() => onScan(manual.trim())}>Go</button>
      </div>
      <button className="btn btn-outline btn-block" style={{ marginTop: 10 }} onClick={onClose}>Close</button>
    </Dialog>
  )
}
