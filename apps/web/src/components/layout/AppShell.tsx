import { useState } from 'react'
import { Outlet, NavLink, Link } from 'react-router-dom'
import { Map, Bookmark, CheckCircle, User, MapPin, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useGeolocation } from '../../hooks/useGeolocation'

const navLinks = [
  { to: '/discover', label: 'Discover', end: true },
  { to: '/map', label: 'Map' },
  { to: '/saved', label: 'Saved' },
  { to: '/visited', label: 'Visited' },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function AppShell() {
  const { user } = useAuth()
  const { permission, requestLocation } = useGeolocation()
  const [locationDismissed, setLocationDismissed] = useState(
    () => localStorage.getItem('bm_loc_dismissed') === 'true',
  )

  const dismissLocation = () => {
    localStorage.setItem('bm_loc_dismissed', 'true')
    setLocationDismissed(true)
  }

  const showLocationBanner = !locationDismissed && permission === 'prompt'

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/discover" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm">
              <Map className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg tracking-tight">BiteMap</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-orange-500 bg-orange-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Profile avatar with initials */}
          <Link
            to="/profile"
            className="w-9 h-9 bg-slate-900 hover:bg-slate-700 rounded-full flex items-center justify-center transition-colors shrink-0"
          >
            {user ? (
              <span className="text-white text-xs font-bold">{getInitials(user.displayName)}</span>
            ) : (
              <User className="w-4 h-4 text-white" />
            )}
          </Link>
        </div>

        {/* Location permission banner */}
        {showLocationBanner && (
          <div className="bg-orange-50 border-t border-orange-100 px-6 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="text-sm text-slate-700">
                Enable location for nearby recommendations
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={requestLocation}
                className="text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-lg transition-colors"
              >
                Allow
              </button>
              <button onClick={dismissLocation} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 flex items-center justify-around px-2 py-2">
          {[
            { to: '/discover', icon: Map, label: 'Discover', end: true },
            { to: '/map', icon: Map, label: 'Map', end: false },
            { to: '/saved', icon: Bookmark, label: 'Saved', end: false },
            { to: '/visited', icon: CheckCircle, label: 'Visited', end: false },
            { to: '/profile', icon: User, label: 'Profile', end: false },
          ].map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive ? 'text-orange-500' : 'text-slate-400'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  )
}
