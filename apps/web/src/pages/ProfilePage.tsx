import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Settings, Bookmark, CheckCircle, Star, MapPin, ChevronRight, LogOut, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

function formatJoinDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

type Stats = { saves: number; visits: number; reviews: number }

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats>({ saves: 0, visits: 0, reviews: 0 })

  useEffect(() => {
    if (!user) return
    Promise.all([
      api.get<unknown[]>('/api/saves').catch(() => []),
      api.get<unknown[]>('/api/visits').catch(() => []),
    ]).then(([saves, visits]) => {
      setStats({ saves: saves.length, visits: visits.length, reviews: 0 })
    })
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user) return null

  const statCards = [
    { label: 'Saved', value: stats.saves, icon: Bookmark },
    { label: 'Visited', value: stats.visits, icon: CheckCircle },
    { label: 'Reviews', value: stats.reviews, icon: Star },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Profile card */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-xl">{getInitials(user.displayName)}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{user.displayName}</h1>
                {user.role === 'admin' && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 rounded-full px-2 py-0.5">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">{user.email}</p>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span className="text-xs text-slate-400">
                  Member since {formatJoinDate(user.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <button className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors">
            <Settings className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {statCards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
              <Icon className="w-4 h-4 text-orange-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl shadow-sm divide-y divide-slate-100 overflow-hidden">
        {[
          { label: 'Saved Places', icon: Bookmark, to: '/saved' },
          { label: 'Visited Places', icon: CheckCircle, to: '/visited' },
          ...(user.role === 'admin'
            ? [{ label: 'Admin Panel', icon: Shield, to: '/admin' }]
            : []),
        ].map(({ label, icon: Icon, to }) => (
          <Link
            key={label}
            to={to}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-900">{label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        ))}
      </div>

      {/* Sign out */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 text-sm font-medium transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    </div>
  )
}
