// ── Repository ──────────────────────────────────────────────────────────────
// All writes go through dispatch(action): the action is (a) applied to local
// state (the "Room" layer, persisted to localStorage) and (b) appended to an
// outbox as {opId, action} for the Phase 2 sync worker. The server dedupes by
// opId, so retries are safe. Demo mode: outbox disabled.

import { useSyncExternalStore } from 'react'
import { uid } from '../util/misc.js'

const DB_KEY = 'zippi.db.v1'
const ACCOUNT_KEY = 'zippi.account.v1' // local stand-in until the REST backend is wired

export const CATEGORIES = ['GROCERY', 'SNACKS', 'BEVERAGES', 'STATIONERY', 'HOUSEHOLD', 'PERSONAL', 'OTHER']

const emptyState = () => ({
  onboarded: false,
  mode: null, // 'demo' | 'account'
  shop: { name: '', ownerName: '', upiId: '', phone: '' },
  items: [],
  sales: [],
  outbox: [],
})

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (!raw) return emptyState()
    return { ...emptyState(), ...JSON.parse(raw) }
  } catch {
    return emptyState()
  }
}

let state = load()
const listeners = new Set()

function persist() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(state)) } catch { /* quota */ }
}

function emit() {
  persist()
  for (const l of listeners) l()
}

export function getState() { return state }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) }
export function useStore() { return useSyncExternalStore(subscribe, getState) }

// ── Reducer: mirrors the Phase 2 /api/ops action vocabulary ────────────────
function apply(s, a) {
  switch (a.type) {
    case 'addItem':
      return { ...s, items: [...s.items, a.item] }
    case 'updateItem':
      return { ...s, items: s.items.map(i => (i.id === a.item.id ? { ...i, ...a.item } : i)) }
    case 'deleteItem':
      return { ...s, items: s.items.filter(i => i.id !== a.itemId) }
    case 'restock':
      return {
        ...s,
        items: s.items.map(i => (i.id === a.itemId ? { ...i, quantityMilli: i.quantityMilli + a.addMilli } : i)),
      }
    case 'recordSale': {
      // Stock decrements NOW — for PAID sales and for parked (OPEN) bills alike
      // (parked goods are set aside). Stock floors at 0, never negative.
      const dec = new Map()
      for (const l of a.sale.lines) dec.set(l.itemId, (dec.get(l.itemId) || 0) + l.qtyMilli)
      return {
        ...s,
        items: s.items.map(i => (dec.has(i.id) ? { ...i, quantityMilli: Math.max(0, i.quantityMilli - dec.get(i.id)) } : i)),
        sales: [...s.sales, a.sale],
      }
    }
    case 'settleSale':
      // Flips OPEN → PAID with timestamp = now. MUST NOT touch stock again.
      return {
        ...s,
        sales: s.sales.map(x => (x.id === a.saleId && x.status === 'OPEN' ? { ...x, status: 'PAID', at: a.at, pinned: false } : x)),
      }
    case 'voidSale': {
      // Cancel a parked bill: return quantities to stock exactly, drop the sale.
      const sale = s.sales.find(x => x.id === a.saleId)
      if (!sale || sale.status !== 'OPEN') return s
      const inc = new Map()
      for (const l of sale.lines) inc.set(l.itemId, (inc.get(l.itemId) || 0) + l.qtyMilli)
      return {
        ...s,
        items: s.items.map(i => (inc.has(i.id) ? { ...i, quantityMilli: i.quantityMilli + inc.get(i.id) } : i)),
        sales: s.sales.filter(x => x.id !== a.saleId),
      }
    }
    case 'updateCue':
      return {
        ...s,
        sales: s.sales.map(x =>
          x.id === a.saleId
            ? { ...x, customerCue: a.cue, customerPhone: a.phone !== undefined ? a.phone : x.customerPhone }
            : x
        ),
      }
    case 'togglePin':
      return { ...s, sales: s.sales.map(x => (x.id === a.saleId ? { ...x, pinned: !x.pinned } : x)) }
    case 'updateShop':
      return { ...s, shop: { ...s.shop, ...a.shop } }
    case 'clearOutboxItem':
      return { ...s, outbox: s.outbox.filter(x => x.opId !== a.opId) }
    default:
      return s
  }
}

export function dispatch(action) {
  state = apply(state, action)
  if (state.mode === 'account') {
    // Phase 2 seam: the sync worker will drain this via POST /api/ops.
    state = { ...state, outbox: [...state.outbox, { opId: uid(), action }] }
  }
  emit()
}

// ── Session / onboarding (local stand-ins for POST /api/register & /login) ──
export function registerShop({ shopName, ownerName, phone, pin, upiId }) {
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ phone, pin, shopName, ownerName, upiId }))
  } catch { /* ignore */ }
  state = {
    ...emptyState(),
    onboarded: true,
    mode: 'account',
    shop: { name: shopName, ownerName: ownerName || '', upiId: upiId || '', phone },
  }
  emit()
}

export function loginShop({ phone, pin }) {
  let acct = null
  try { acct = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null') } catch { /* ignore */ }
  if (!acct || acct.phone !== phone || acct.pin !== pin) return { ok: false, error: 'No account found for that mobile + PIN on this device.' }
  const existing = load()
  state = {
    ...existing,
    onboarded: true,
    mode: 'account',
    shop: { name: acct.shopName, ownerName: acct.ownerName || '', upiId: acct.upiId || '', phone },
  }
  emit()
  return { ok: true }
}

export function startDemo() {
  state = {
    ...emptyState(),
    onboarded: true,
    mode: 'demo',
    shop: { name: 'Zippi Demo Store', ownerName: 'Demo', upiId: 'zippidemo@upi', phone: '' },
    items: seedItems(),
  }
  emit()
}

export function logout() {
  state = { ...state, onboarded: false }
  emit()
}

// ── Demo seed: a believable kirana shelf ────────────────────────────────────
function seedItems() {
  const mk = (name, category, priceRupees, saleType, unit, qty, lowAt, barcode = null) => ({
    id: uid(), name, category,
    pricePaise: Math.round(priceRupees * 100),
    saleType, unit,
    quantityMilli: Math.round(qty * 1000),
    lowStockAtMilli: Math.round(lowAt * 1000),
    barcode,
  })
  return [
    mk('Parle-G Biscuit', 'SNACKS', 10, 'FIXED', 'PCS', 52, 10, '8901719100017'),
    mk('Basmati Rice', 'GROCERY', 80, 'LOOSE', 'KG', 12.5, 2),
    mk('Toor Dal', 'GROCERY', 140, 'LOOSE', 'KG', 6, 2),
    mk('Sugar', 'GROCERY', 44, 'LOOSE', 'KG', 2, 3),
    mk('Amul Milk 500ml', 'BEVERAGES', 27, 'FIXED', 'PCS', 18, 6, '8901262010023'),
    mk('Chai Patti (loose)', 'BEVERAGES', 320, 'LOOSE', 'KG', 1.5, 0.5),
    mk('Maggi Noodles', 'SNACKS', 14, 'FIXED', 'PCS', 36, 8, '8901058000290'),
    mk('Lays Chips', 'SNACKS', 20, 'FIXED', 'PCS', 2, 6, '8901491101837'),
    mk('Colgate Toothpaste', 'PERSONAL', 55, 'FIXED', 'PCS', 9, 4, '8901314010328'),
    mk('Lifebuoy Soap', 'PERSONAL', 32, 'FIXED', 'PCS', 24, 6),
    mk('Vim Bar', 'HOUSEHOLD', 10, 'FIXED', 'PCS', 30, 8),
    mk('Surf Excel 1kg', 'HOUSEHOLD', 135, 'FIXED', 'PCS', 7, 3),
    mk('Classmate Notebook', 'STATIONERY', 45, 'FIXED', 'PCS', 15, 5),
    mk('Ball Pen (Blue)', 'STATIONERY', 10, 'FIXED', 'PCS', 0, 10),
    mk('Sunflower Oil', 'GROCERY', 128, 'LOOSE', 'LTR', 8, 2),
    mk('Bru Coffee 50g', 'BEVERAGES', 95, 'FIXED', 'PCS', 11, 4),
  ]
}

// ── Derived selectors (the Kotlin Flows) ────────────────────────────────────
export function lowStockItems(s) {
  return s.items.filter(i => i.quantityMilli <= i.lowStockAtMilli)
}

export function openSales(s) {
  // Pinned first, then FIFO by park time.
  return s.sales
    .filter(x => x.status === 'OPEN')
    .sort((a, b) => (a.pinned === b.pinned ? a.at - b.at : a.pinned ? -1 : 1))
}

export function paidSales(s) {
  return s.sales.filter(x => x.status === 'PAID')
}

export function paidSalesSince(s, since) {
  return paidSales(s).filter(x => x.at >= since)
}

export function revenue(sales) {
  return sales.reduce((t, x) => t + x.totalPaise, 0)
}

export function itemsSoldMilli(sales) {
  return sales.reduce((t, x) => t + x.lines.reduce((u, l) => u + l.qtyMilli, 0), 0)
}

/** Last 3 distinct customer cues, most recent first. */
export function recentCues(s) {
  const out = []
  const sorted = [...s.sales].sort((a, b) => b.at - a.at)
  for (const sale of sorted) {
    const c = (sale.customerCue || '').trim()
    if (c && !out.includes(c)) out.push(c)
    if (out.length === 3) break
  }
  return out
}
