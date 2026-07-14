import { useState } from 'react'
import { dispatch, logout, paidSales, revenue, useStore } from '../data/store.js'
import { useToast, Sheet, QrCanvas } from '../ui/common.jsx'
import { isValidVpa } from '../util/upi.js'
import { buildUpiLink } from '../util/upi.js'
import { formatPaise } from '../util/money.js'
import { CloudIcon, LogoutIcon, PersonIcon, QrIcon, ShopIcon, CheckIcon, AlertIcon } from '../ui/Icons.jsx'

export function ShopScreen() {
  const state = useStore()
  const toast = useToast()
  const shop = state.shop

  // State for shop edit form
  const [name, setName] = useState(shop.name || '')
  const [ownerName, setOwnerName] = useState(shop.ownerName || '')
  const [upiId, setUpiId] = useState(shop.upiId || '')
  const [upiError, setUpiError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [showQrSheet, setShowQrSheet] = useState(false)

  const paid = paidSales(state)
  const lifetimeRevenue = revenue(paid)
  const totalBills = paid.length
  const totalProducts = state.items.length

  const handleUpiChange = (val) => {
    setUpiId(val)
    if (val && !isValidVpa(val)) {
      setUpiError('Invalid UPI ID (must be like name@bank)')
    } else {
      setUpiError('')
    }
  }

  const handleSave = (e) => {
    e.preventDefault()
    if (upiId && !isValidVpa(upiId)) {
      setUpiError('Please fix the UPI ID format before saving')
      return
    }
    dispatch({
      type: 'updateShop',
      shop: { name: name.trim(), ownerName: ownerName.trim(), upiId: upiId.trim() },
    })
    setIsEditing(false)
    toast('Shop details updated')
  }

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out? All offline-first modifications are saved locally.')) {
      logout()
      toast('Logged out successfully')
    }
  }

  const hasVpa = isValidVpa(shop.upiId)
  const staticUpiLink = hasVpa
    ? buildUpiLink({ vpa: shop.upiId, shopName: shop.name })
    : null

  return (
    <div className="screen">
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 14 }}>Shop Settings</h2>

      <div className="shop-grid">
        <div className="shop-main" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Profile Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <span className="icontile" style={{ background: 'var(--violet-tint)', color: 'var(--violet)' }}>
                <ShopIcon />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800 }}>{shop.name || 'Your Shop'}</h3>
                <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
                  {shop.ownerName && <span>{shop.ownerName} · </span>}
                  <span>{shop.phone || 'Demo Mode'}</span>
                </div>
              </div>
              {hasVpa && (
                <button className="pinbtn on" onClick={() => setShowQrSheet(true)} aria-label="Show shop QR">
                  <QrIcon style={{ width: 22, height: 22 }} />
                </button>
              )}
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12.5, borderTop: '1px solid rgba(20,17,30,0.07)', paddingTop: 14 }}>
              <div style={{ textAlign: 'center' }}>
                <div className="num" style={{ fontWeight: 800, fontSize: 16 }}>{totalProducts}</div>
                <div className="muted" style={{ fontWeight: 600, fontSize: 11 }}>Products</div>
              </div>
              <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(20,17,30,0.07)', borderRight: '1px solid rgba(20,17,30,0.07)' }}>
                <div className="num" style={{ fontWeight: 800, fontSize: 16 }}>{totalBills}</div>
                <div className="muted" style={{ fontWeight: 600, fontSize: 11 }}>Paid Bills</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="num font-display" style={{ fontWeight: 800, fontSize: 16 }}>{formatPaise(lifetimeRevenue)}</div>
                <div className="muted" style={{ fontWeight: 600, fontSize: 11 }}>Revenue</div>
              </div>
            </div>
          </div>

          {/* QR Code Quick View Card if VPA not set */}
          {!hasVpa && (
            <div className="rowitem" style={{ borderLeft: '4px solid var(--amber)' }}>
              <span className="icontile" style={{ background: 'var(--amber-tint)', color: 'var(--amber)' }}>
                <AlertIcon />
              </span>
              <span style={{ flex: 1, fontSize: 13.5 }}>
                <b>UPI QR payments disabled</b><br />
                Add a UPI ID below to show payment QR codes.
              </span>
            </div>
          )}

          {/* Edit Form / Details */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Profile Details</h3>
              {!isEditing && (
                <button className="btn btn-ghost" style={{ minHeight: 32, padding: '6px 12px', borderRadius: 10, fontSize: 12.5 }} onClick={() => setIsEditing(true)}>
                  Edit Info
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="field">
                  <label htmlFor="shop-edit-name">Shop Name</label>
                  <input
                    id="shop-edit-name"
                    className="input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="shop-edit-owner">Owner Name</label>
                  <input
                    id="shop-edit-owner"
                    className="input"
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="shop-edit-upi">UPI ID (VPA)</label>
                  <input
                    id="shop-edit-upi"
                    className="input num"
                    placeholder="e.g. shopname@okaxis"
                    value={upiId}
                    onChange={e => handleUpiChange(e.target.value.trim())}
                  />
                  {upiError && <span className="errmsg">{upiError}</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                  <button type="button" className="btn btn-outline" onClick={() => {
                    setName(shop.name || '')
                    setOwnerName(shop.ownerName || '')
                    setUpiId(shop.upiId || '')
                    setUpiError('')
                    setIsEditing(false)
                  }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={!!upiError}>Save</button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                  <span className="muted" style={{ fontWeight: 600 }}>Shop Name</span>
                  <span style={{ fontWeight: 700 }}>{shop.name || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                  <span className="muted" style={{ fontWeight: 600 }}>Owner Name</span>
                  <span style={{ fontWeight: 700 }}>{shop.ownerName || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                  <span className="muted" style={{ fontWeight: 600 }}>UPI ID (VPA)</span>
                  <span style={{ fontWeight: 700 }} className="num">{shop.upiId || 'Not Set'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="shop-side" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Cloud Sync / Demo Status */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CloudIcon style={{ width: 20, height: 20 }} /> Cloud Account
            </h3>

            {state.mode === 'demo' ? (
              <div>
                <p className="muted" style={{ fontSize: 13, margin: '0 0 12px', fontWeight: 600 }}>
                  You are currently running in **Demo Mode**. All data is saved on this browser/device only.
                </p>
                <button className="btn btn-primary btn-block" onClick={() => logout()}>
                  Sign Up / Log In
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 13.5 }}>
                    Offline sync queue: <b>{state.outbox.length} pending actions</b>
                  </span>
                  <span className={'badge ' + (state.outbox.length === 0 ? 'badge-green' : 'badge-amber')}>
                    {state.outbox.length === 0 ? 'Synced' : 'Offline Ready'}
                  </span>
                </div>
                <button className="btn btn-danger-ghost btn-block" onClick={handleLogout}>
                  <LogoutIcon style={{ width: 17, height: 17 }} /> Log Out from Device
                </button>
              </div>
            )}
          </div>

          {/* Feature recap tiles */}
          <div>
            <div className="sectionhead" style={{ marginTop: 0 }}>
              <h3>Zippi Features</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Offline-First Billing', 'No internet? No problem. Zippi logs sales and updates stock instantly offline.'],
                ['Dynamic UPI QRs', 'Ring up cart items to show the customer an exact payment QR for GPay/PhonePe.'],
                ['2-Step Quick Add', 'Create new items in under 5 seconds with automatic stock and category defaults.'],
                ['Active Queue / Parked Bills', 'Hold open bills for regular customers and collect payments later.'],
              ].map(([title, desc]) => (
                <div key={title} className="stattile" style={{ width: '100%' }}>
                  <b style={{ fontSize: 14, color: 'var(--violet-deep)' }}>{title}</b>
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.35 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Printable Shop QR Modal */}
      {showQrSheet && hasVpa && (
        <Sheet onClose={() => setShowQrSheet(false)}>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>{shop.name}</h3>
            <span className="muted num" style={{ fontSize: 13, fontWeight: 700 }}>{shop.upiId}</span>
            
            <div className="qrframe" style={{ margin: '20px auto 14px' }}>
              <QrCanvas text={staticUpiLink} />
            </div>

            <p className="muted" style={{ fontSize: 13.5, fontWeight: 600, padding: '0 20px', lineHeight: 1.4 }}>
              Scan to pay with any UPI app. Enter the bill amount on your screen.
            </p>

            <button className="btn btn-outline btn-block" style={{ marginTop: 20 }} onClick={() => window.print()}>
              Print QR Code
            </button>
            <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => setShowQrSheet(false)}>
              Close
            </button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
