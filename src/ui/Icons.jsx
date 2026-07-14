// Inline Material-style icons (24dp grid, stroke style). No emojis anywhere.
const I = ({ children, ...p }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{children}</svg>
)

export const HomeIcon = p => <I {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></I>
export const StockIcon = p => <I {...p}><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" /><path d="M4 7.5 12 12l8-4.5" /><path d="M12 12v9" /></I>
export const SalesIcon = p => <I {...p}><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 8h8M8 12h8M8 16h4" /></I>
export const ShopIcon = p => <I {...p}><path d="M4 9 5.5 4h13L20 9" /><path d="M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" /><path d="M5 11.5V20h14v-8.5" /><path d="M9.5 20v-5h5v5" /></I>
export const PlusIcon = p => <I {...p} strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></I>
export const SearchIcon = p => <I {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></I>
export const ScanIcon = p => <I {...p}><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" /><path d="M7 12h10" /></I>
export const BackIcon = p => <I {...p}><path d="m14.5 5-7 7 7 7" /></I>
export const CloseIcon = p => <I {...p}><path d="m6 6 12 12M18 6 6 18" /></I>
export const CheckIcon = p => <I {...p} strokeWidth="2.6"><path d="m4.5 12.5 5 5L19.5 7" /></I>
export const ShareIcon = p => <I {...p}><circle cx="6" cy="12" r="2.6" /><circle cx="17.5" cy="5.5" r="2.6" /><circle cx="17.5" cy="18.5" r="2.6" /><path d="m8.4 10.8 6.8-4M8.4 13.2l6.8 4" /></I>
export const PinIcon = p => <I {...p} fill={p.filled ? 'currentColor' : 'none'}><path d="M9 4h6l-.6 6.2 2.6 2.3v1.5H7v-1.5l2.6-2.3z" /><path d="M12 14v6" /></I>
export const PersonIcon = p => <I {...p}><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></I>
export const EditIcon = p => <I {...p}><path d="M14.5 5.5 18.5 9.5 8.5 19.5H4.5v-4z" /><path d="m13 7 4 4" /></I>
export const AlertIcon = p => <I {...p}><path d="M12 3.5 21.5 20h-19z" /><path d="M12 10v4.5" /><circle cx="12" cy="17.2" r="0.4" fill="currentColor" /></I>
export const RupeeIcon = p => <I {...p} strokeWidth="2.1"><path d="M7 4h10M7 8.6h10M7 4c5.5 0 6.6 2 6.6 4.6S12 13.2 8.5 13.2H7L14 20" /></I>
export const CloudIcon = p => <I {...p}><path d="M7 18a4.2 4.2 0 0 1-.5-8.4 5.6 5.6 0 0 1 11-.1A4 4 0 0 1 17 18z" /></I>
export const BoltIcon = p => <I {...p}><path d="M13 2.5 5 13.5h5.5L11 21.5l8-11h-5.5z" /></I>
export const QrIcon = p => <I {...p}><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><path d="M13.5 13.5h3v3h-3zM17 17h3v3h-3z" /></I>
export const CartIcon = p => <I {...p}><circle cx="9.5" cy="19.5" r="1.4" /><circle cx="17" cy="19.5" r="1.4" /><path d="M3.5 4.5h2.2l2.2 11h9.8l2-7.7H7" /></I>
export const TrashIcon = p => <I {...p}><path d="M5 7h14M9.5 7V4.8h5V7M7 7l1 13h8l1-13" /></I>
export const ClockIcon = p => <I {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></I>
export const LogoutIcon = p => <I {...p}><path d="M14 4h-8v16h8" /><path d="M10 12h10.5M17.5 8.5 21 12l-3.5 3.5" /></I>

// ── Category icons ──
const BasketIcon = p => <I {...p}><path d="M4 10h16l-1.6 9H5.6z" /><path d="m8 10 3-6M16 10l-3-6" /><path d="M9.5 13.5v3M14.5 13.5v3" /></I>
const CookieIcon = p => <I {...p}><path d="M20.5 12A8.5 8.5 0 1 1 12 3.5c-.3 2.6 1.8 4.6 4.4 4.1.2 2.3 1.8 3.9 4.1 4.4z" /><circle cx="9" cy="10" r="0.5" fill="currentColor" /><circle cx="10" cy="15.5" r="0.5" fill="currentColor" /><circle cx="14.5" cy="14" r="0.5" fill="currentColor" /></I>
const CupIcon = p => <I {...p}><path d="M5 8h11v7a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 15z" /><path d="M16 9.5h1.5a2.5 2.5 0 0 1 0 5H16" /><path d="M8 5V3.5M11 5V3M13.5 5V3.5" /></I>
const PencilIcon = p => <I {...p}><path d="m13.5 5.5 5 5L8 21H3v-5z" /><path d="m11.5 7.5 5 5" /><path d="m16 3 5 5" /></I>
const SprayIcon = p => <I {...p}><path d="M8 10h6l1 11H7z" /><path d="M9.5 10V7.5h3V10" /><path d="M9.5 7.5V5h2" /><path d="M15.5 4.5h.01M18 6h.01M18 3h.01" strokeWidth="2.4" /></I>
const DropIcon = p => <I {...p}><path d="M12 3.5s5.5 6 5.5 10a5.5 5.5 0 1 1-11 0c0-4 5.5-10 5.5-10z" /><path d="M9.8 13.5a2.4 2.4 0 0 0 2 2.6" /></I>
const BoxIcon = p => <I {...p}><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M4 11h16M12 7v13" /><path d="m7 7 1.5-3h7L17 7" /></I>

export const CATEGORY_META = {
  GROCERY: { label: 'Grocery', Icon: BasketIcon, bg: '#D5F1E6', fg: '#0A7A57' },
  SNACKS: { label: 'Snacks', Icon: CookieIcon, bg: '#FBEBD2', fg: '#A5670F' },
  BEVERAGES: { label: 'Beverages', Icon: CupIcon, bg: '#DEEAFF', fg: '#1D5ED0' },
  STATIONERY: { label: 'Stationery', Icon: PencilIcon, bg: '#F1EFFC', fg: '#4631AE' },
  HOUSEHOLD: { label: 'Household', Icon: SprayIcon, bg: '#E8EAF0', fg: '#4A5265' },
  PERSONAL: { label: 'Personal care', Icon: DropIcon, bg: '#FBE2E8', fg: '#C22B50' },
  OTHER: { label: 'Other', Icon: BoxIcon, bg: '#E8EAF0', fg: '#4A5265' },
}

export function CategoryTile({ category, size = 42 }) {
  const meta = CATEGORY_META[category] || CATEGORY_META.OTHER
  const { Icon } = meta
  return (
    <span className="icontile" style={{ background: meta.bg, color: meta.fg, width: size, height: size }}>
      <Icon />
    </span>
  )
}
