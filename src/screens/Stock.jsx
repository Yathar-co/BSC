import { useMemo, useState } from 'react'
import { CATEGORIES, dispatch, lowStockItems, useStore } from '../data/store.js'
import { Sheet, Segmented, useToast } from '../ui/common.jsx'
import { CategoryTile, CATEGORY_META, PlusIcon, SearchIcon, StockIcon, TrashIcon } from '../ui/Icons.jsx'
import { QuickAdd } from '../ui/QuickAdd.jsx'
import { formatPaise, formatQty, parseRupeesToPaise, parseQtyToMilli, formatMilli } from '../util/money.js'

const UNITS = [
  { value: 'PCS', label: 'Pcs' },
  { value: 'KG', label: 'Kg' },
  { value: 'LTR', label: 'Ltr' },
]

function stockColor(item) {
  if (item.quantityMilli <= 0) return 'var(--rose)'
  if (item.quantityMilli <= item.lowStockAtMilli) return 'var(--amber)'
  return 'var(--emerald)'
}

export function StockScreen() {
  const state = useStore()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('ALL') // ALL | LOW | category
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null) // item id

  const low = lowStockItems(state)
  const filtered = useMemo(() => {
    let list = state.items
    if (filter === 'LOW') list = list.filter(i => i.quantityMilli <= i.lowStockAtMilli)
    else if (filter !== 'ALL') list = list.filter(i => i.category === filter)
    const q = query.trim().toLowerCase()
    if (q) list = list.filter(i => i.name.toLowerCase().includes(q) || (i.barcode && i.barcode.includes(q)))
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [state.items, filter, query])

  const editItem = editing ? state.items.find(i => i.id === editing) : null
  const usedCategories = [...new Set(state.items.map(i => i.category))]

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Stock</h2>
        <button className="btn btn-primary" style={{ minHeight: 44, padding: '10px 16px' }} onClick={() => setAdding(true)}>
          <PlusIcon style={{ width: 16, height: 16 }} /> Add
        </button>
      </div>

      <div className="searchbar" style={{ marginBottom: 10 }}>
        <SearchIcon />
        <input placeholder="Search items…" value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <div className="chiprow" style={{ marginBottom: 10 }}>
        <button className={'chip' + (filter === 'ALL' ? ' on' : '')} onClick={() => setFilter('ALL')}>All ({state.items.length})</button>
        <button className={'chip' + (filter === 'LOW' ? ' on' : '')} onClick={() => setFilter('LOW')}>Low stock ({low.length})</button>
        {usedCategories.map(c => (
          <button key={c} className={'chip' + (filter === c ? ' on' : '')} onClick={() => setFilter(c)}>{CATEGORY_META[c].label}</button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty">
          <div className="glyph"><StockIcon /></div>
          <b>{state.items.length === 0 ? 'No items yet' : 'Nothing matches'}</b>
          <div style={{ fontSize: 13.5, marginTop: 4 }}>
            {state.items.length === 0 ? 'Add your first item — it takes 5 seconds.' : 'Try a different search or filter.'}
          </div>
          {state.items.length === 0 && (
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-primary" onClick={() => setAdding(true)}><PlusIcon style={{ width: 16, height: 16 }} /> Quick add</button>
            </div>
          )}
        </div>
      )}

      <div className="stock-grid">
        {filtered.map(item => (
          <button className="rowitem" key={item.id} onClick={() => setEditing(item.id)}>
            <CategoryTile category={item.category} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</b>
              <span className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>
                {CATEGORY_META[item.category].label} · {formatPaise(item.pricePaise)}{item.saleType === 'LOOSE' ? `/${item.unit === 'KG' ? 'kg' : 'L'}` : ''}
              </span>
            </span>
            <span style={{ textAlign: 'right' }}>
              <b className="num" style={{ color: stockColor(item), fontSize: 15 }}>
                {item.quantityMilli <= 0 ? 'Out' : formatQty(item.quantityMilli, item.unit)}
              </b><br />
              <span className="muted" style={{ fontSize: 11.5, fontWeight: 600 }}>in stock</span>
            </span>
          </button>
        ))}
      </div>

      {adding && <QuickAdd onClose={() => setAdding(false)} />}
      {editItem && <EditItemSheet item={editItem} onClose={() => setEditing(null)} />}
    </div>
  )
}

function EditItemSheet({ item, onClose }) {
  const toast = useToast()
  const [name, setName] = useState(item.name)
  const [unit, setUnit] = useState(item.unit)
  const [price, setPrice] = useState(String(item.pricePaise % 100 === 0 ? item.pricePaise / 100 : (item.pricePaise / 100).toFixed(2)))
  const [stock, setStock] = useState(formatMilli(item.quantityMilli))
  const [alertAt, setAlertAt] = useState(formatMilli(item.lowStockAtMilli))
  const [barcode, setBarcode] = useState(item.barcode || '')
  const [category, setCategory] = useState(item.category)

  const loose = unit !== 'PCS'
  const pricePaise = parseRupeesToPaise(price)
  const stockMilli = parseQtyToMilli(stock)
  const alertMilli = parseQtyToMilli(alertAt)
  const canSave = name.trim() && pricePaise != null && pricePaise > 0 && stockMilli != null && alertMilli != null

  const save = () => {
    if (!canSave) return
    dispatch({
      type: 'updateItem',
      item: {
        id: item.id, name: name.trim(), category, pricePaise,
        saleType: loose ? 'LOOSE' : 'FIXED', unit,
        quantityMilli: stockMilli, lowStockAtMilli: alertMilli,
        barcode: barcode.trim() || null,
      },
    })
    toast('Saved')
    onClose()
  }

  const del = () => {
    if (!window.confirm(`Delete ${item.name}? Past bills keep their records.`)) return
    dispatch({ type: 'deleteItem', itemId: item.id })
    toast('Item deleted')
    onClose()
  }

  return (
    <Sheet onClose={onClose}>
      <h3 style={{ fontSize: 19, fontWeight: 800, marginBottom: 16 }}>Edit item</h3>
      <div className="field">
        <label>Name</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Sold by {loose ? '(price becomes per kg/L, stock becomes decimal)' : ''}</label>
        <Segmented options={UNITS} value={unit} onChange={setUnit} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field">
          <label>Price (₹){loose ? ` / ${unit === 'KG' ? 'kg' : 'L'}` : ''}</label>
          <input className="input num" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} />
        </div>
        <div className="field">
          <label>Stock ({loose ? (unit === 'KG' ? 'kg' : 'L') : 'pcs'})</label>
          <input className="input num" inputMode="decimal" value={stock} onChange={e => setStock(e.target.value.replace(/[^0-9.]/g, ''))} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field">
          <label>Low-stock alert at</label>
          <input className="input num" inputMode="decimal" value={alertAt} onChange={e => setAlertAt(e.target.value.replace(/[^0-9.]/g, ''))} />
        </div>
        <div className="field">
          <label>Barcode</label>
          <input className="input num" inputMode="numeric" placeholder="EAN-13" value={barcode} onChange={e => setBarcode(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Category</label>
        <div className="chiprow">
          {CATEGORIES.map(c => (
            <button key={c} className={'chip' + (category === c ? ' on' : '')} onClick={() => setCategory(c)}>{CATEGORY_META[c].label}</button>
          ))}
        </div>
      </div>
      <button className="btn btn-primary btn-block" disabled={!canSave} onClick={save}>Save changes</button>
      <button className="btn btn-danger-ghost btn-block" style={{ marginTop: 10 }} onClick={del}>
        <TrashIcon style={{ width: 17, height: 17 }} /> Delete item
      </button>
    </Sheet>
  )
}
