import { useEffect, useRef, useState } from 'react'
import { Sheet, Segmented, useToast } from './common.jsx'
import { CATEGORIES, dispatch } from '../data/store.js'
import { CATEGORY_META } from './Icons.jsx'
import { parseRupeesToPaise, parseQtyToMilli } from '../util/money.js'
import { uid } from '../util/misc.js'

const UNITS = [
  { value: 'PCS', label: 'Pcs' },
  { value: 'KG', label: 'Kg' },
  { value: 'LTR', label: 'Ltr' },
]

/**
 * 2-step Quick Add (<5s): name → price + unit → Done. Smart defaults applied
 * silently: 24 pcs (or 10 kg/L) opening stock, alert at 5 (or 2), category Other.
 */
export function QuickAdd({ onClose, onAdded, prefillBarcode = null }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('PCS')
  const [advanced, setAdvanced] = useState(false)
  const [stock, setStock] = useState('')
  const [alertAt, setAlertAt] = useState('')
  const [barcode, setBarcode] = useState(prefillBarcode || '')
  const [category, setCategory] = useState('OTHER')
  const nameRef = useRef(null)
  const priceRef = useRef(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const loose = unit !== 'PCS'
  const pricePaise = parseRupeesToPaise(price)
  const canSave = name.trim().length > 0 && pricePaise != null && pricePaise > 0

  const save = () => {
    if (!canSave) return
    const stockMilli = stock !== '' ? parseQtyToMilli(stock) : null
    const alertMilli = alertAt !== '' ? parseQtyToMilli(alertAt) : null
    const item = {
      id: uid(),
      name: name.trim(),
      category,
      pricePaise,
      saleType: loose ? 'LOOSE' : 'FIXED',
      unit,
      quantityMilli: stockMilli != null ? stockMilli : (loose ? 10000 : 24000),
      lowStockAtMilli: alertMilli != null ? alertMilli : (loose ? 2000 : 5000),
      barcode: barcode.trim() || null,
    }
    dispatch({ type: 'addItem', item })
    toast(`Added ${item.name}`)
    onAdded?.(item)
    onClose()
  }

  return (
    <Sheet onClose={onClose}>
      <h3 style={{ fontSize: 19, fontWeight: 800, marginBottom: 16 }}>Quick add item</h3>

      <div className="field">
        <label htmlFor="qa-name">Item name</label>
        <input id="qa-name" ref={nameRef} className="input" placeholder="e.g. Parle-G Biscuit"
          value={name} onChange={e => setName(e.target.value)} enterKeyHint="next"
          onKeyDown={e => { if (e.key === 'Enter') priceRef.current?.focus() }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 12 }}>
        <div className="field">
          <label htmlFor="qa-price">Price (₹){loose ? ` / ${unit === 'KG' ? 'kg' : 'L'}` : ''}</label>
          <input id="qa-price" ref={priceRef} className="input num" inputMode="decimal" placeholder="0"
            value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} enterKeyHint="done"
            onKeyDown={e => { if (e.key === 'Enter') save() }} />
        </div>
        <div className="field">
          <label>Sold by</label>
          <Segmented options={UNITS} value={unit} onChange={setUnit} />
        </div>
      </div>

      <button className="btn btn-ghost btn-block" style={{ marginBottom: 12 }} onClick={() => setAdvanced(a => !a)}>
        {advanced ? 'Hide advanced' : 'Advanced — stock, barcode, category'}
      </button>

      {advanced && (
        <div style={{ animation: 'screenIn 0.2s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label htmlFor="qa-stock">Opening stock ({loose ? (unit === 'KG' ? 'kg' : 'L') : 'pcs'})</label>
              <input id="qa-stock" className="input num" inputMode="decimal" placeholder={loose ? '10' : '24'}
                value={stock} onChange={e => setStock(e.target.value.replace(/[^0-9.]/g, ''))} enterKeyHint="next" />
            </div>
            <div className="field">
              <label htmlFor="qa-alert">Low-stock alert at</label>
              <input id="qa-alert" className="input num" inputMode="decimal" placeholder={loose ? '2' : '5'}
                value={alertAt} onChange={e => setAlertAt(e.target.value.replace(/[^0-9.]/g, ''))} enterKeyHint="next" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="qa-barcode">Barcode (type or scan into this field)</label>
            <input id="qa-barcode" className="input num" inputMode="numeric" placeholder="EAN-13"
              value={barcode} onChange={e => setBarcode(e.target.value)} enterKeyHint="done"
              onKeyDown={e => { if (e.key === 'Enter') save() }} />
          </div>
          <div className="field">
            <label>Category</label>
            <div className="chiprow">
              {CATEGORIES.map(c => (
                <button key={c} className={'chip' + (category === c ? ' on' : '')} onClick={() => setCategory(c)}>
                  {CATEGORY_META[c].label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <button className="btn btn-primary btn-block" disabled={!canSave} onClick={save}>Done — add item</button>
    </Sheet>
  )
}
