import { useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, NavLink, Link } from 'react-router-dom'
import { Compass, Map, Bookmark, CheckCircle, User, MapPin, X, Bell, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useGeolocation } from '../../hooks/useGeolocation'
import { api } from '../../lib/api'
import UserAvatar from '../ui/UserAvatar'

const navLinks = [
  { to: '/discover', label: 'Discover', end: true },
  { to: '/map', label: 'Map' },
  { to: '/saved', label: 'Saved' },
  { to: '/visited', label: 'Visited' },
]

export default function AppShell() {
  const { user } = useAuth()
  const { permission, requestLocation } = useGeolocation()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notifications, setNotifications] = useState<Array<{
    id: string
    type: string
    title: string
    body?: string | null
    link?: string | null
    isRead: boolean
    createdAt: string
    actor: { id: string; displayName: string; avatarUrl?: string | null } | null
  }>>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const notificationsRef = useRef<HTMLDivElement | null>(null)
  const [locationDismissed, setLocationDismissed] = useState(
    () => localStorage.getItem('bm_loc_dismissed') === 'true',
  )

  const dismissLocation = () => {
    localStorage.setItem('bm_loc_dismissed', 'true')
    setLocationDismissed(true)
  }

  const showLocationBanner = !locationDismissed && permission === 'prompt'

  const refreshUnreadCount = async () => {
    try {
      const res = await api.get<{ data: { count: number } }>('/api/notifications/unread-count')
      setUnreadCount(res.data.count)
    } catch {
      setUnreadCount(0)
    }
  }

  const loadNotifications = async () => {
    setNotificationsLoading(true)
    try {
      const res = await api.get<{ data: typeof notifications }>('/api/notifications?limit=20')
      setNotifications(res.data)
    } finally {
      setNotificationsLoading(false)
    }
  }

  const markNotificationRead = async (id: string) => {
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    try {
      await api.patch(`/api/notifications/${id}/read`)
    } catch {
      // ignore and let next refresh correct
    }
  }

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
    setUnreadCount(0)
    try {
      await api.patch('/api/notifications/read-all')
    } catch {
      // ignore and let next refresh correct
    }
  }

  useEffect(() => {
    void refreshUnreadCount()
    const interval = setInterval(() => void refreshUnreadCount(), 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!notificationsOpen) return
    void loadNotifications()
  }, [notificationsOpen])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!notificationsRef.current) return
      if (event.target instanceof Node && notificationsRef.current.contains(event.target)) return
      setNotificationsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const notificationLabel = useMemo(() => {
    if (unreadCount > 99) return '99+'
    return String(unreadCount)
  }, [unreadCount])

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

          <div className="relative flex items-center gap-2 shrink-0" ref={notificationsRef}>
            <button
              onClick={() => setNotificationsOpen((v) => !v)}
              className="relative w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
              aria-label="Open notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold leading-[18px] text-center">
                  {notificationLabel}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-lg z-[60]">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  <button
                    onClick={markAllRead}
                    className="text-xs font-medium text-orange-500 hover:text-orange-600"
                  >
                    Mark all read
                  </button>
                </div>
                {notificationsLoading ? (
                  <div className="py-10 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                  </div>
                ) : notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 px-4 py-8 text-center">No notifications yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.map((item) => (
                      item.link ? (
                        <Link
                          key={item.id}
                          to={item.link}
                          onClick={() => {
                            if (!item.isRead) void markNotificationRead(item.id)
                            setNotificationsOpen(false)
                          }}
                          className={`block px-4 py-3 hover:bg-slate-50 ${item.isRead ? 'bg-white' : 'bg-orange-50/40'}`}
                        >
                          <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                          {item.body && <p className="text-xs text-slate-600 mt-0.5">{item.body}</p>}
                          <p className="text-[11px] text-slate-400 mt-1">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </Link>
                      ) : (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (!item.isRead) void markNotificationRead(item.id)
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${item.isRead ? 'bg-white' : 'bg-orange-50/40'}`}
                        >
                          <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                          {item.body && <p className="text-xs text-slate-600 mt-0.5">{item.body}</p>}
                          <p className="text-[11px] text-slate-400 mt-1">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </button>
                      )
                    ))}
                  </div>
                )}
              </div>
            )}

            <Link
              to="/profile"
              className="w-9 h-9 bg-slate-900 hover:bg-slate-700 rounded-full flex items-center justify-center transition-colors"
            >
              {user ? (
                <UserAvatar
                  name={user.displayName}
                  avatarUrl={user.avatarUrl}
                  className="w-9 h-9"
                  textClassName="text-xs"
                />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </Link>
          </div>
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
            { to: '/discover', icon: Compass, label: 'Discover', end: true },
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
