import { useState } from 'react'
import { registerShop, loginShop, startDemo } from '../data/store.js'
import { isValidVpa } from '../util/upi.js'
import { BoltIcon, BackIcon, PersonIcon, ShopIcon } from '../ui/Icons.jsx'

export function OnboardingScreen() {
  const [screen, setScreen] = useState('welcome') // 'welcome' | 'register' | 'login'
  
  // Register fields
  const [shopName, setShopName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [upiId, setUpiId] = useState('')
  const [regError, setRegError] = useState('')

  // Login fields
  const [loginPhone, setLoginPhone] = useState('')
  const [loginPin, setLoginPin] = useState('')
  const [loginError, setLoginError] = useState('')

  // Validations
  const isPhoneValid = p => /^\d{10}$/.test(p)
  const isPinValid = p => /^\d{4,6}$/.test(p)
  const isUpiValid = u => !u || isValidVpa(u)

  const handleRegister = (e) => {
    e.preventDefault()
    setRegError('')
    if (!shopName.trim()) {
      setRegError('Shop name is required.')
      return
    }
    if (!isPhoneValid(phone)) {
      setRegError('Mobile number must be exactly 10 digits.')
      return
    }
    if (!isPinValid(pin)) {
      setRegError('PIN must be 4 to 6 digits.')
      return
    }
    if (upiId && !isValidVpa(upiId)) {
      setRegError('Invalid UPI ID format (e.g. name@bank).')
      return
    }

    registerShop({
      shopName: shopName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      pin: pin.trim(),
      upiId: upiId.trim() || undefined,
    })
  }

  const handleLogin = (e) => {
    e.preventDefault()
    setLoginError('')
    if (!isPhoneValid(loginPhone)) {
      setLoginError('Mobile number must be exactly 10 digits.')
      return
    }
    if (!isPinValid(loginPin)) {
      setLoginError('PIN must be 4 to 6 digits.')
      return
    }

    const res = loginShop({ phone: loginPhone, pin: loginPin })
    if (!res.ok) {
      setLoginError(res.error || 'Authentication failed.')
    }
  }

  const renderForm = () => {
    if (screen === 'register') {
      const canSubmit = shopName.trim() && isPhoneValid(phone) && isPinValid(pin) && isUpiValid(upiId)

      return (
        <div className="onboard-card-content">
          <button className="navbtn" style={{ alignSelf: 'flex-start', color: '#fff', padding: 0, marginBottom: 20 }} onClick={() => setScreen('welcome')}>
            <BackIcon style={{ width: 24, height: 24, strokeWidth: 2.2 }} />
          </button>

          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Create new shop</h2>
          <p className="muted" style={{ color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 24px', fontSize: 13 }}>
            Enter your shop details to get started offline.
          </p>

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label htmlFor="shop-name">Shop Name *</label>
              <input
                id="shop-name"
                className="input"
                placeholder="e.g. Verma Kirana Store"
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="owner-name">Owner Name (Optional)</label>
              <input
                id="owner-name"
                className="input"
                placeholder="e.g. Rajesh Verma"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="mobile">10-Digit Mobile *</label>
              <input
                id="mobile"
                className="input num"
                inputMode="numeric"
                maxLength={10}
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="pin">4–6 Digit PIN *</label>
              <input
                id="pin"
                type="password"
                className="input num"
                inputMode="numeric"
                maxLength={6}
                placeholder="Set secure PIN"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="upi">UPI ID for payments (Optional)</label>
              <input
                id="upi"
                className="input num"
                placeholder="e.g. shopname@okaxis"
                value={upiId}
                onChange={e => setUpiId(e.target.value.trim())}
              />
              {upiId && !isValidVpa(upiId) && (
                <span className="errmsg">Must match name@bank format</span>
              )}
            </div>

            {regError && (
              <div style={{ color: 'var(--rose)', fontSize: 13, fontWeight: 700 }}>
                {regError}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={!canSubmit} style={{ marginTop: 10 }}>
              Create shop &amp; Start
            </button>
          </form>
        </div>
      )
    }

    if (screen === 'login') {
      const canSubmit = isPhoneValid(loginPhone) && isPinValid(loginPin)

      return (
        <div className="onboard-card-content">
          <button className="navbtn" style={{ alignSelf: 'flex-start', color: '#fff', padding: 0, marginBottom: 20 }} onClick={() => setScreen('welcome')}>
            <BackIcon style={{ width: 24, height: 24, strokeWidth: 2.2 }} />
          </button>

          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Log in</h2>
          <p className="muted" style={{ color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 24px', fontSize: 13 }}>
            Enter your mobile and PIN to unlock your store.
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label htmlFor="login-mobile">10-Digit Mobile</label>
              <input
                id="login-mobile"
                className="input num"
                inputMode="numeric"
                maxLength={10}
                placeholder="e.g. 9876543210"
                value={loginPhone}
                onChange={e => setLoginPhone(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="login-pin">PIN</label>
              <input
                id="login-pin"
                type="password"
                className="input num"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter secure PIN"
                value={loginPin}
                onChange={e => setLoginPin(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>

            {loginError && (
              <div style={{ color: 'var(--rose)', fontSize: 13, fontWeight: 700 }}>
                {loginError}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={!canSubmit} style={{ marginTop: 10 }}>
              Log in to store
            </button>
          </form>
        </div>
      )
    }

    // Welcome screen
    return (
      <div className="onboard-card-content" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="brandmark" style={{ marginBottom: 18 }}>Z</div>
        <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.15 }}>Zippi</h1>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255, 255, 255, 0.75)', margin: '4px 0 36px' }}>
          Bill faster. Track everything.
        </p>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="btn btn-primary btn-block" style={{ background: '#fff', color: 'var(--violet-deep)', border: 'none', boxShadow: 'none' }} onClick={() => setScreen('register')}>
            <ShopIcon style={{ width: 19, height: 19 }} /> New shop
          </button>

          <button className="btn btn-outline btn-block" style={{ color: '#fff', background: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.25)' }} onClick={() => setScreen('login')}>
            <PersonIcon style={{ width: 19, height: 19 }} /> Log in
          </button>

          <div className="divider" style={{ background: 'rgba(255, 255, 255, 0.15)', margin: '14px 0', height: 1, width: '100%' }} />

          <button className="btn btn-ghost btn-block" style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#fff' }} onClick={() => startDemo()}>
            <BoltIcon style={{ width: 17, height: 17, color: 'var(--amber)' }} /> Skip — demo store (this device only)
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="onboard-wrapper">
      <div className="onboard-container">
        {/* Left pane: Premium marketing banner (visible on desktops) */}
        <div className="onboard-hero">
          <div className="brandmark-row" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div className="brandmark" style={{ width: 52, height: 52, borderRadius: 16, fontSize: 28 }}>Z</div>
            <span style={{ fontSize: 32, fontWeight: 900, fontFamily: 'var(--font-display)', letterSpacing: '-0.5px' }}>Zippi <span style={{ color: '#00F0FF' }}>POS</span></span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
            <span className="sticker-badge sticker-cyan">⚡ DYNAMIC UPI QR</span>
            <span className="sticker-badge sticker-green">🔌 100% OFFLINE-FIRST</span>
            <span className="sticker-badge sticker-pink">☁️ SUPABASE LIVE</span>
          </div>

          <h2 style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.1, marginBottom: 16, fontFamily: 'var(--font-display)', letterSpacing: '-1px' }}>
            The lightning-fast billing system for <span style={{ textDecoration: 'underline', decorationColor: '#FF007A' }}>kirana stores</span>.
          </h2>
          <p className="muted" style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.75)', margin: '0 0 32px', maxWidth: 520, lineHeight: 1.5 }}>
            Zippi turns any phone, tablet, or laptop into a powerful inventory counter and payments terminal. Zero internet required to run operations.
          </p>

          <div className="onboard-features-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="onboard-feature-item bento-box">
              <span className="bento-icon">🔌</span>
              <h4 style={{ margin: '10px 0 4px', fontSize: 15, fontWeight: 800 }}>Always Works</h4>
              <p style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.55)', margin: 0, lineHeight: 1.35 }}>Generate bills and manage stock levels 100% offline. Local data persists securely on this device.</p>
            </div>

            <div className="onboard-feature-item bento-box">
              <span className="bento-icon">⚡</span>
              <h4 style={{ margin: '10px 0 4px', fontSize: 15, fontWeight: 800 }}>UPI Payments</h4>
              <p style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.55)', margin: 0, lineHeight: 1.35 }}>Dynamic QR codes matching the bill's exact total make verification fast and avoid errors.</p>
            </div>

            <div className="onboard-feature-item bento-box">
              <span className="bento-icon">💬</span>
              <h4 style={{ margin: '10px 0 4px', fontSize: 15, fontWeight: 800 }}>Receipts via SMS</h4>
              <p style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.55)', margin: 0, lineHeight: 1.35 }}>Collect phone numbers and send transaction bills instantly via native device SMS protocols.</p>
            </div>

            <div className="onboard-feature-item bento-box">
              <span className="bento-icon">☁️</span>
              <h4 style={{ margin: '10px 0 4px', fontSize: 15, fontWeight: 800 }}>Supabase Sync</h4>
              <p style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.55)', margin: 0, lineHeight: 1.35 }}>Automatic sync queue stores records locally and drains changes to Supabase when online.</p>
            </div>
          </div>
        </div>

        {/* Right pane: Floating Form Card */}
        <div className="onboard-form-side">
          <div className="onboard-form-card maximalist-glow">
            {renderForm()}
          </div>
        </div>
      </div>
    </div>
  )
}
