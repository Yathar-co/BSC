import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

// ── Toasts ──
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const show = useCallback((msg, kind = 'ok') => {
    const id = Math.random()
    setToasts(t => [...t.slice(-2), { id, msg, kind }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2400)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="toastwrap">
        {toasts.map(t => <div key={t.id} className={'toast' + (t.kind === 'err' ? ' err' : '')}>{t.msg}</div>)}
      </div>
    </ToastCtx.Provider>
  )
}

// ── Bottom sheet & centered dialog ──
export function Sheet({ onClose, children }) {
  return (
    <div className="scrim" onClick={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-grab" />
        {children}
      </div>
    </div>
  )
}

export function Dialog({ onClose, children }) {
  return (
    <div className="scrim center" onClick={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="dialog" role="dialog" aria-modal="true">{children}</div>
    </div>
  )
}

// ── QR canvas: EC level Q because the ₹/Z logo excavates center modules ──
export function QrCanvas({ text, size = 224, logo = '₹' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current || !text) return
    QRCode.toCanvas(ref.current, text, {
      errorCorrectionLevel: 'Q',
      width: size,
      margin: 0,
      color: { dark: '#14111E', light: '#FFFFFF' },
    }).catch(() => {})
  }, [text, size])
  return (
    <div className="qrinner">
      <canvas ref={ref} style={{ display: 'block', borderRadius: 8 }} />
      <span className="qrlogo">{logo}</span>
    </div>
  )
}

// ── Segmented control ──
export function Segmented({ options, value, onChange }) {
  return (
    <div className="seg" role="tablist">
      {options.map(o => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value}
          className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
