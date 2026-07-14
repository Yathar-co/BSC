import { useState, useMemo } from 'react'
import { dispatch, lowStockItems, openSales, paidSales, revenue, useStore } from '../data/store.js'
import { useToast } from '../ui/common.jsx'
import { CategoryTile, BoltIcon, ClockIcon, PlusIcon } from '../ui/Icons.jsx'
import { formatPaise, formatQty } from '../util/money.js'
import { greeting, startOfDay, timeOfDay } from '../util/misc.js'

export function HomeScreen({ goTo }) {
  const state = useStore()
  const toast = useToast()

  const [tab, setTab] = useState('overview') // 'overview' | 'analytics' | 'profit'
  const [analyticsFilter, setAnalyticsFilter] = useState('week') // 'day' | 'week' | 'month'

  // Profit/Loss states
  const [calcPeriod, setCalcPeriod] = useState('month') // 'day' | 'week' | 'month'
  const [rawCost, setRawCost] = useState('')
  const [rentCost, setRentCost] = useState('')
  const [elecCost, setElecCost] = useState('')
  const [waterCost, setWaterCost] = useState('')
  const [otherCost, setOtherCost] = useState('')

  const paid = paidSales(state)
  const today0 = startOfDay()
  const todaySales = paid.filter(s => s.at >= today0)
  const todayRevenue = revenue(todaySales)

  // 7-day sparkline logic (used in the overview hero)
  const weekSpark = useMemo(() => {
    const out = []
    for (let d = 6; d >= 0; d--) {
      const from = startOfDay() - d * 86400000
      const to = from + 86400000
      out.push(revenue(paid.filter(s => s.at >= from && s.at < to)))
    }
    return out
  }, [paid])
  const weekSparkMax = Math.max(...weekSpark, 1)

  // Analytics tab chart calculator
  const graphData = useMemo(() => {
    const now = Date.now()
    const out = []

    if (analyticsFilter === 'day') {
      // 24 hours: 6 intervals of 4 hours
      for (let i = 5; i >= 0; i--) {
        const from = now - (i + 1) * 4 * 3600000
        const to = now - i * 4 * 3600000
        const val = revenue(paid.filter(s => s.at >= from && s.at < to))
        const d = new Date(from)
        const label = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
        out.push({ label, val })
      }
    } else if (analyticsFilter === 'week') {
      // 7 days: daily intervals
      for (let i = 6; i >= 0; i--) {
        const from = startOfDay() - i * 86400000
        const to = from + 86400000
        const val = revenue(paid.filter(s => s.at >= from && s.at < to))
        const label = new Date(from).toLocaleDateString('en-IN', { weekday: 'short' })
        out.push({ label, val })
      }
    } else if (analyticsFilter === 'month') {
      // 30 days: 6 intervals of 5 days
      for (let i = 5; i >= 0; i--) {
        const from = startOfDay() - (i + 1) * 5 * 86400000
        const to = from + 5 * 86400000
        const val = revenue(paid.filter(s => s.at >= from && s.at < to))
        const dateStr = new Date(from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        out.push({ label: dateStr, val })
      }
    }
    return out
  }, [paid, analyticsFilter])

  const graphMax = useMemo(() => Math.max(...graphData.map(d => d.val), 1), [graphData])

  // P&L Calculations
  const pAndL = useMemo(() => {
    const now = Date.now()
    const calcDuration = calcPeriod === 'day' ? 86400000 : calcPeriod === 'week' ? 604800000 : 2592000000
    const periodSales = paid.filter(s => s.at >= now - calcDuration)
    const grossRevenue = revenue(periodSales)

    const rawExpense = Math.round(parseFloat(rawCost || 0) * 100)
    const rentExpense = Math.round(parseFloat(rentCost || 0) * 100)
    const elecExpense = Math.round(parseFloat(elecCost || 0) * 100)
    const waterExpense = Math.round(parseFloat(waterCost || 0) * 100)
    const otherExpense = Math.round(parseFloat(otherCost || 0) * 100)
    const totalExpenses = rawExpense + rentExpense + elecExpense + waterExpense + otherExpense

    const netProfit = grossRevenue - totalExpenses
    return { grossRevenue, totalExpenses, netProfit }
  }, [paid, calcPeriod, rawCost, rentCost, elecCost, waterCost, otherCost])

  const low = lowStockItems(state)
  const open = openSales(state)
  const openTotal = revenue(open)
  const recent = [...paid].sort((a, b) => b.at - a.at).slice(0, 5)

  const restock = item => {
    const addMilli = item.saleType === 'LOOSE' ? 5000 : 10000
    dispatch({ type: 'restock', itemId: item.id, addMilli })
    toast(`Restocked ${item.name} +${item.saleType === 'LOOSE' ? '5 ' + (item.unit === 'KG' ? 'kg' : 'L') : '10'}`)
  }

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <div className="muted" style={{ fontSize: 13.5, fontWeight: 600 }}>{greeting()},</div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>{state.shop.name || 'Your shop'}</h1>
        </div>
        
        {/* Navigation Tabs */}
        <div className="tab-container">
          <button className={'tabbtn' + (tab === 'overview' ? ' active' : '')} onClick={() => setTab('overview')}>Overview</button>
          <button className={'tabbtn' + (tab === 'analytics' ? ' active' : '')} onClick={() => setTab('analytics')}>Analytics</button>
          <button className={'tabbtn' + (tab === 'profit' ? ' active' : '')} onClick={() => setTab('profit')}>Profit &amp; Loss</button>
        </div>
      </div>

      {tab === 'overview' && (
        <div className="home-grid">
          <div className="home-main" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="hero">
              <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.75 }}>Today&rsquo;s earnings</div>
              <div className="num" style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 800, lineHeight: 1.15, margin: '2px 0 14px' }}>
                {formatPaise(todayRevenue)}
              </div>
              <div className="spark" aria-label="Last 7 days of sales">
                {weekSpark.map((v, i) => (
                  <div key={i} className={'bar' + (i === 6 ? ' today' : '')} style={{ height: `${Math.max(7, (v / weekSparkMax) * 100)}%` }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.55, marginTop: 6, fontWeight: 600 }}>
                <span>7 days ago</span><span>Today</span>
              </div>
            </div>

            <button className="btn btn-primary btn-block" style={{ marginTop: 4 }} onClick={() => goTo('sell')}>
              <BoltIcon style={{ width: 18, height: 18 }} /> Start a new sale
            </button>

            <div>
              <div className="sectionhead" style={{ marginTop: 10 }}><h3>Recent sales</h3><button className="more" onClick={() => goTo('sales')}>All →</button></div>
              {recent.length === 0 && (
                <div className="empty">
                  <div className="glyph"><BoltIcon /></div>
                  <b>No sales yet today</b>
                  <div style={{ fontSize: 13.5, marginTop: 4 }}>Tap “Start a new sale” to ring up your first bill.</div>
                </div>
              )}
              {recent.map(s => (
                <button className="rowitem" key={s.id} onClick={() => goTo('sales')}>
                  <span className="icontile" style={{ background: 'var(--emerald-tint)', color: 'var(--emerald)', fontWeight: 800, fontSize: 13 }}>₹</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b>{s.lines.length} item{s.lines.length > 1 ? 's' : ''}</b>
                    <span className="muted"> · {s.ref}</span><br />
                    <span className="muted" style={{ fontSize: 12.5 }}>{timeOfDay(s.at)}</span>
                  </span>
                  <b className="num" style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{formatPaise(s.totalPaise)}</b>
                </button>
              ))}
            </div>
          </div>

          <div className="home-side" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="statrow">
              <div className="stattile">
                <div className="big num">{state.items.filter(i => i.quantityMilli > 0).length}</div>
                <div className="lbl">items in stock</div>
              </div>
              <div className="stattile">
                <div className="big num" style={{ color: low.length ? 'var(--amber)' : undefined }}>{low.length}</div>
                <div className="lbl">running low</div>
              </div>
            </div>

            {open.length > 0 && (
              <button className="rowitem" style={{ borderLeft: '4px solid var(--amber)' }} onClick={() => goTo('sales')}>
                <span className="icontile" style={{ background: 'var(--amber-tint)', color: '#A5670F' }}><ClockIcon /></span>
                <span style={{ flex: 1 }}>
                  <b>{open.length} parked bill{open.length > 1 ? 's' : ''}</b><br />
                  <span className="muted" style={{ fontSize: 13 }}>{formatPaise(openTotal)} to collect</span>
                </span>
                <span className="badge badge-amber">View →</span>
              </button>
            )}

            {low.length > 0 && (
              <div>
                <div className="sectionhead" style={{ marginTop: 0 }}><h3>Low stock</h3><button className="more" onClick={() => goTo('stock')}>Manage →</button></div>
                {low.slice(0, 4).map(item => (
                  <div className="rowitem" key={item.id}>
                    <CategoryTile category={item.category} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b>{item.name}</b><br />
                      <span style={{ fontSize: 13, color: item.quantityMilli <= 0 ? 'var(--rose)' : 'var(--amber)', fontWeight: 700 }}>
                        {item.quantityMilli <= 0 ? 'Sold out' : `${formatQty(item.quantityMilli, item.unit)} left`}
                      </span>
                    </span>
                    <button className="btn btn-ghost" style={{ minHeight: 42, padding: '8px 14px', fontSize: 13.5 }} onClick={() => restock(item)}>
                      <PlusIcon style={{ width: 14, height: 14 }} /> {item.saleType === 'LOOSE' ? '5' : '10'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Sales Revenue Chart</h3>
                <span className="muted" style={{ fontSize: 12.5 }}>Track earnings across custom intervals</span>
              </div>
              <div className="tab-container" style={{ margin: 0 }}>
                <button className={'tabbtn' + (analyticsFilter === 'day' ? ' active' : '')} onClick={() => setAnalyticsFilter('day')}>1 Day</button>
                <button className={'tabbtn' + (analyticsFilter === 'week' ? ' active' : '')} onClick={() => setAnalyticsFilter('week')}>1 Week</button>
                <button className={'tabbtn' + (analyticsFilter === 'month' ? ' active' : '')} onClick={() => setAnalyticsFilter('month')}>1 Month</button>
              </div>
            </div>

            {/* Glowing Bar Chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', height: 220, gap: 14, padding: '24px 16px 12px', background: 'var(--ink-bg)', borderRadius: 20, border: '1px solid var(--border)', overflowX: 'auto' }}>
              {graphData.map((d, i) => (
                <div key={i} style={{ flex: 1, minWidth: 45, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, fontFamily: 'var(--font-mono)', color: 'var(--violet)' }}>
                    {d.val > 0 ? `₹${(d.val / 100).toFixed(0)}` : ''}
                  </span>
                  <div style={{
                    width: '100%',
                    maxWidth: 32,
                    height: `${Math.max(4, (d.val / graphMax) * 100)}%`,
                    background: 'linear-gradient(to top, var(--violet) 0%, var(--violet-light) 100%)',
                    borderRadius: '6px 6px 0 0',
                    transition: 'height 0.3s ease',
                    boxShadow: d.val > 0 ? '0 0 10px rgba(122,99,236,0.25)' : 'none'
                  }} />
                  <span className="muted" style={{ fontSize: 10, marginTop: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.2, textAlign: 'center', whiteSpace: 'nowrap' }}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Chart Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <div className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>Highest Interval Peak</div>
              <div className="num" style={{ fontSize: 26, fontWeight: 900, color: 'var(--violet)', marginTop: 4 }}>{formatPaise(graphMax)}</div>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <div className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>Total Period Revenue</div>
              <div className="num" style={{ fontSize: 26, fontWeight: 900, color: 'var(--emerald)', marginTop: 4 }}>
                {formatPaise(graphData.reduce((t, x) => t + x.val, 0))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'profit' && (
        <div className="home-grid">
          <div className="home-main">
            <div className="calculator-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Profit / Loss Calculator</h3>
                  <span className="muted" style={{ fontSize: 12.5 }}>Subtract bills and expenses from earnings</span>
                </div>
                <div className="tab-container" style={{ margin: 0 }}>
                  <button className={'tabbtn' + (calcPeriod === 'day' ? ' active' : '')} onClick={() => setCalcPeriod('day')}>Daily</button>
                  <button className={'tabbtn' + (calcPeriod === 'week' ? ' active' : '')} onClick={() => setCalcPeriod('week')}>Weekly</button>
                  <button className={'tabbtn' + (calcPeriod === 'month' ? ' active' : '')} onClick={() => setCalcPeriod('month')}>Monthly</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="grid-2">
                  <div className="field">
                    <label>Raw Materials (Bought Inventory) Cost (₹)</label>
                    <input className="input num" type="number" placeholder="e.g. 5000" min="0" value={rawCost} onChange={e => setRawCost(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Rent Cost (₹)</label>
                    <input className="input num" type="number" placeholder="e.g. 8000" min="0" value={rentCost} onChange={e => setRentCost(e.target.value)} />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label>Electricity Bill (₹)</label>
                    <input className="input num" type="number" placeholder="e.g. 1500" min="0" value={elecCost} onChange={e => setElecCost(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Water &amp; Utilities (₹)</label>
                    <input className="input num" type="number" placeholder="e.g. 400" min="0" value={waterCost} onChange={e => setWaterCost(e.target.value)} />
                  </div>
                </div>

                <div className="field">
                  <label>Other Miscellaneous Costs (₹)</label>
                  <input className="input num" type="number" placeholder="e.g. 1000" min="0" value={otherCost} onChange={e => setOtherCost(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="home-side" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: 20 }}>
              <div className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>Period Gross Revenue</div>
              <div className="num" style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', marginTop: 4 }}>{formatPaise(pAndL.grossRevenue)}</div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>Total Period Expenses</div>
              <div className="num" style={{ fontSize: 24, fontWeight: 800, color: 'var(--amber)', marginTop: 4 }}>{formatPaise(pAndL.totalExpenses)}</div>
            </div>

            <div className="card" style={{
              padding: 24,
              background: pAndL.netProfit >= 0 ? 'var(--emerald-tint)' : 'var(--rose-tint)',
              border: pAndL.netProfit >= 0 ? '2px solid rgba(15,168,119,0.25)' : '2px solid rgba(224,67,67,0.25)',
              boxShadow: pAndL.netProfit >= 0 ? '0 8px 24px rgba(15,168,119,0.1)' : 'none',
              borderRadius: 24
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: pAndL.netProfit >= 0 ? 'var(--emerald)' : 'var(--rose)' }}>
                {pAndL.netProfit >= 0 ? 'Net Profit 📈' : 'Net Loss 📉'}
              </div>
              <div className="num" style={{
                fontSize: 32,
                fontWeight: 900,
                color: pAndL.netProfit >= 0 ? 'var(--emerald)' : 'var(--rose)',
                marginTop: 6
              }}>
                {pAndL.netProfit < 0 ? '-' : ''}{formatPaise(Math.abs(pAndL.netProfit))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
