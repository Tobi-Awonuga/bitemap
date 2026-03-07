import { Outlet, NavLink, Link } from 'react-router-dom'
import { Map, Bookmark, CheckCircle, User } from 'lucide-react'

const navLinks = [
  { to: '/', label: 'Discover', end: true },
  { to: '/map', label: 'Map' },
  { to: '/saved', label: 'Saved' },
  { to: '/visited', label: 'Visited' },
]

export default function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
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

          {/* Profile */}
          <Link
            to="/profile"
            className="w-9 h-9 bg-slate-900 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors"
          >
            <User className="w-4 h-4 text-white" />
          </Link>
        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 flex items-center justify-around px-2 py-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                isActive ? 'text-orange-500' : 'text-slate-400'
              }`
            }
          >
            <Map className="w-5 h-5" />
            Discover
          </NavLink>
          <NavLink
            to="/map"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                isActive ? 'text-orange-500' : 'text-slate-400'
              }`
            }
          >
            <Map className="w-5 h-5" />
            Map
          </NavLink>
          <NavLink
            to="/saved"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                isActive ? 'text-orange-500' : 'text-slate-400'
              }`
            }
          >
            <Bookmark className="w-5 h-5" />
            Saved
          </NavLink>
          <NavLink
            to="/visited"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                isActive ? 'text-orange-500' : 'text-slate-400'
              }`
            }
          >
            <CheckCircle className="w-5 h-5" />
            Visited
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                isActive ? 'text-orange-500' : 'text-slate-400'
              }`
            }
          >
            <User className="w-5 h-5" />
            Profile
          </NavLink>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  )
}
