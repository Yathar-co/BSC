import { useState } from 'react'
import { useStore, openSales } from './data/store.js'
import { ToastProvider } from './ui/common.jsx'
import { OnboardingScreen } from './screens/Onboarding.jsx'
import { HomeScreen } from './screens/Home.jsx'
import { SellScreen } from './screens/Sell.jsx'
import { SalesScreen } from './screens/Sales.jsx'
import { StockScreen } from './screens/Stock.jsx'
import { ShopScreen } from './screens/Shop.jsx'
import { HomeIcon, StockIcon, PlusIcon, SalesIcon, ShopIcon } from './ui/Icons.jsx'

function ZippiApp() {
  const state = useStore()
  const [activeTab, setActiveTab] = useState('home')
  const [cart, setCart] = useState([])

  if (!state.onboarded) {
    return <OnboardingScreen />
  }

  // Active queue open count for bottom nav badge
  const openCount = openSales(state).length

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen goTo={setActiveTab} />
      case 'stock':
        return <StockScreen />
      case 'sell':
        return <SellScreen cart={cart} setCart={setCart} />
      case 'sales':
        return <SalesScreen />
      case 'shop':
        return <ShopScreen />
      default:
        return <HomeScreen goTo={setActiveTab} />
    }
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="brandmark-mini">Z</div>
          <span className="sidebar-title">Zippi</span>
        </div>
        <nav className="sidebar-menu">
          <button
            className={'sidebar-item' + (activeTab === 'home' ? ' active' : '')}
            onClick={() => setActiveTab('home')}
          >
            <HomeIcon />
            <span>Home</span>
          </button>
          <button
            className={'sidebar-item' + (activeTab === 'stock' ? ' active' : '')}
            onClick={() => setActiveTab('stock')}
          >
            <StockIcon />
            <span>Stock</span>
          </button>
          <button
            className={'sidebar-item' + (activeTab === 'sell' ? ' active' : '')}
            onClick={() => setActiveTab('sell')}
          >
            <PlusIcon />
            <span>Sell</span>
          </button>
          <button
            className={'sidebar-item' + (activeTab === 'sales' ? ' active' : '')}
            onClick={() => setActiveTab('sales')}
          >
            <SalesIcon />
            <span>Sales</span>
            {openCount > 0 && <span className="sidebar-badge">{openCount}</span>}
          </button>
          <button
            className={'sidebar-item' + (activeTab === 'shop' ? ' active' : '')}
            onClick={() => setActiveTab('shop')}
          >
            <ShopIcon />
            <span>Shop</span>
          </button>
        </nav>
      </aside>

      <div className="app">
        {renderScreen()}

        <nav className="bottomnav">
          <button
            className={'navbtn' + (activeTab === 'home' ? ' active' : '')}
            onClick={() => setActiveTab('home')}
          >
            <HomeIcon />
            <span>Home</span>
          </button>

          <button
            className={'navbtn' + (activeTab === 'stock' ? ' active' : '')}
            onClick={() => setActiveTab('stock')}
          >
            <StockIcon />
            <span>Stock</span>
          </button>

          <button
            className={'navbtn' + (activeTab === 'sell' ? ' active' : '')}
            onClick={() => setActiveTab('sell')}
            style={{ overflow: 'visible' }}
          >
            <div className="sellfab">
              <PlusIcon />
            </div>
            <div className="sellfab-label">Sell</div>
          </button>

          <button
            className={'navbtn' + (activeTab === 'sales' ? ' active' : '')}
            onClick={() => setActiveTab('sales')}
          >
            <SalesIcon />
            <span>Sales</span>
            {openCount > 0 && <span className="navbadge">{openCount}</span>}
          </button>

          <button
            className={'navbtn' + (activeTab === 'shop' ? ' active' : '')}
            onClick={() => setActiveTab('shop')}
          >
            <ShopIcon />
            <span>Shop</span>
          </button>
        </nav>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <ZippiApp />
    </ToastProvider>
  )
}
