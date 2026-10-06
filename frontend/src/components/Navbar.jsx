import {
  Mountain,
  LayoutDashboard,
  Sparkles,
  Map,
  BarChart3,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import './Navbar.css'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'predict', label: 'Prediction', icon: Sparkles },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
]

export default function Navbar({ activeView, onNavigate, health }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleNav = (id) => {
    onNavigate(id)
    setMobileOpen(false)
  }

  const apiOnline = health?.status === 'ok'
  const modelReady = health?.model === 'Validated XGBoost'

  return (
    <header className="navbar">
      <div className="navbar-inner">

        {/* Brand */}
        <div className="navbar-brand">
          <span className="navbar-brand-icon" aria-hidden="true">
            <Mountain size={20} strokeWidth={2.2} />
          </span>

          <div>
            <span className="navbar-title">OreVision AI</span>
            <span className="navbar-subtitle">
              Iron Ore Prospectivity Mapping
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="navbar-links" aria-label="Main navigation">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`navbar-link ${
                activeView === id ? 'active' : ''
              }`}
              onClick={() => handleNav(id)}
              aria-current={activeView === id ? 'page' : undefined}
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </button>
          ))}
        </nav>

        {/* API / Model Status */}
        <div className="navbar-status">
          {apiOnline && modelReady ? (
            <span className="status-pill status-ok">
              <span className="dot" />
              Validated XGBoost
            </span>
          ) : apiOnline ? (
            <span className="status-pill status-warn">
              <span className="dot" />
              API Online
            </span>
          ) : (
            <span className="status-pill status-error">
              <span className="dot" />
              API Offline
            </span>
          )}
        </div>

        {/* Mobile Menu */}
        <button
          className="navbar-menu-btn"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <nav
          className="navbar-mobile"
          aria-label="Mobile navigation"
        >
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`navbar-link ${
                activeView === id ? 'active' : ''
              }`}
              onClick={() => handleNav(id)}
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </button>
          ))}
        </nav>
      )}
    </header>
  )
}