import { useEffect, useRef, useState } from 'react'
import { Dialog } from './common.jsx'
import { CategoryTile } from './Icons.jsx'
import { formatPaise, formatMilli, formatQty, lineTotalPaise, parseQtyToMilli } from '../util/money.js'

const QUICK = [0.25, 0.5, 1, 2]

/** Loose-item weight entry. onConfirm(qtyMilli). */
export function WeightDialog({ item, initialMilli = null, onConfirm, onClose }) {
  const [text, setText] = useState(initialMilli ? formatMilli(initialMilli) : '')
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  const unitLabel = item.unit === 'KG' ? 'kg' : 'L'
  const qtyMilli = parseQtyToMilli(text)
  const valid = qtyMilli != null && qtyMilli > 0
  const overStock = valid && qtyMilli > item.quantityMilli
  const total = valid ? lineTotalPaise(item.pricePaise, qtyMilli) : 0

  const submit = () => {
    if (valid && !overStock) onConfirm(qtyMilli)
  }

  return (
    <Dialog onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <CategoryTile category={item.category} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{item.name}</div>
          <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
            {formatPaise(item.pricePaise)}/{unitLabel} · {formatQty(item.quantityMilli, item.unit)} in stock
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        className={'input num' + (overStock ? ' err' : '')}
        style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', fontFamily: 'var(--font-display)' }}
        inputMode="decimal"
        placeholder="0.000"
        value={text}
        onChange={e => setText(e.target.value.replace(/[^0-9.]/g, ''))}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        aria-label={`Weight in ${unitLabel}`}
      />
      {overStock && (
        <div style={{ color: 'var(--rose)', fontSize: 13, fontWeight: 700, textAlign: 'center', marginTop: 6 }}>
          Only {formatQty(item.quantityMilli, item.unit)} in stock
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '14px 0' }}>
        {QUICK.map(q => (
          <button key={q} className="chip" onClick={() => setText(String(q))}>
            {q} {unitLabel}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg)', borderRadius: 14, marginBottom: 16 }}>
        <span className="muted" style={{ fontSize: 13.5, fontWeight: 600 }}>
          {formatPaise(item.pricePaise)} × {valid ? formatMilli(qtyMilli) : '0'} {unitLabel}
        </span>
        <span className="num" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>
          {formatPaise(total)}
        </span>
      </div>

      <button className="btn btn-emerald btn-block" disabled={!valid || overStock} onClick={submit}>
        {initialMilli ? 'Update' : 'Add'} · {formatPaise(total)}
      </button>
    </Dialog>
  )
}
