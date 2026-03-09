import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Settings, Bookmark, CheckCircle, Star, MapPin, ChevronRight, LogOut, Shield, Loader2, Users, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import UserAvatar from '../components/ui/UserAvatar'

type MyReview = {
  id: string
  rating: number
  body?: string | null
  createdAt: string
  place: { id: string; name: string; cuisine?: string | null }
}

function formatJoinDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

type Stats = { saves: number; visits: number; reviews: number; followers: number; following: number }
type TasteProfile = { cuisines: Array<{ cuisine: string; score: number }>; totalSignals: number }
type FeedItem = {
  type: 'review' | 'visit'
  id: string
  createdAt: string
  user: { id: string; displayName: string }
  place: { id: string; name: string; cuisine?: string | null }
  review?: { rating: number; body?: string | null }
}

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats>({ saves: 0, visits: 0, reviews: 0, followers: 0, following: 0 })
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [tasteProfile, setTasteProfile] = useState<TasteProfile>({ cuisines: [], totalSignals: 0 })
  const [myReviews, setMyReviews] = useState<MyReview[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    api
      .get<{ data: Stats }>('/api/users/me/stats')
      .then((res) => setStats(res.data))
      .catch(() => setStats({ saves: 0, visits: 0, reviews: 0, followers: 0, following: 0 }))
  }, [user])

  useEffect(() => {
    if (!user) return
    api
      .get<{ data: TasteProfile }>('/api/users/me/taste-profile')
      .then((res) => setTasteProfile(res.data))
      .catch(() => setTasteProfile({ cuisines: [], totalSignals: 0 }))
  }, [user])

  useEffect(() => {
    if (!user) return
    setReviewsLoading(true)
    api
      .get<{ data: MyReview[] }>('/api/users/me/reviews')
      .then((res) => setMyReviews(res.data))
      .catch(() => setMyReviews([]))
      .finally(() => setReviewsLoading(false))
  }, [user])

  useEffect(() => {
    if (!user) return
    setFeedLoading(true)
    api
      .get<{ data: FeedItem[] }>('/api/users/feed')
      .then((res) => setFeed(res.data))
      .catch(() => setFeed([]))
      .finally(() => setFeedLoading(false))
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user) return null

  const statCards = [
    { label: 'Followers', value: stats.followers, icon: Users, to: `/profile/followers` },
    { label: 'Following', value: stats.following, icon: UserPlus, to: `/profile/following` },
    { label: 'Saved', value: stats.saves, icon: Bookmark, to: null },
    { label: 'Visited', value: stats.visits, icon: CheckCircle, to: null },
    { label: 'Reviews', value: stats.reviews, icon: Star, to: null },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Profile card */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} className="w-16 h-16 rounded-2xl shadow-sm" textClassName="text-xl" />
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
          <Link to="/settings" className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors">
            <Settings className="w-4 h-4 text-slate-600" />
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3">
          {statCards.map(({ label, value, icon: Icon, to }) => {
            const inner = (
              <>
                <Icon className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </>
            )
            return to ? (
              <Link
                key={label}
                to={to}
                className="bg-slate-50 hover:ring-2 hover:ring-orange-200 rounded-xl p-3 text-center transition-all cursor-pointer block"
              >
                {inner}
              </Link>
            ) : (
              <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                {inner}
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4">Following feed</h2>
        {feedLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading activity...
          </div>
        ) : feed.length === 0 ? (
          <p className="text-sm text-slate-500">Follow people to see their latest visits and reviews.</p>
        ) : (
          <div className="space-y-4">
            {feed.slice(0, 8).map((item) => (
              <div key={`${item.type}-${item.id}`} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <div className="text-sm text-slate-700">
                  <Link to={`/users/${item.user.id}`} className="font-semibold text-slate-900 hover:text-orange-600">
                    {item.user.displayName}
                  </Link>{' '}
                  {item.type === 'review' ? 'reviewed' : 'visited'}{' '}
                  <Link to={`/places/${item.place.id}`} className="font-semibold text-slate-900 hover:text-orange-600">
                    {item.place.name}
                  </Link>
                </div>
                {item.type === 'review' && item.review && (
                  <p className="text-xs text-slate-500 mt-1">
                    {item.review.rating.toFixed(1)} stars
                    {item.review.body ? ` - ${item.review.body}` : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-base font-bold text-slate-900 mb-3">Your taste profile</h2>
        {tasteProfile.cuisines.length === 0 ? (
          <p className="text-sm text-slate-500">Rate and visit more places to build your taste profile.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tasteProfile.cuisines.map((item) => (
              <span key={item.cuisine} className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-600 rounded-full px-3 py-1">
                {item.cuisine}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4">Your reviews</h2>
        {reviewsLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading reviews...
          </div>
        ) : myReviews.length === 0 ? (
          <p className="text-sm text-slate-500">
            You haven't written any reviews yet.{' '}
            <Link to="/discover" className="text-orange-500 hover:text-orange-600 font-medium">
              Discover places →
            </Link>
          </p>
        ) : (
          <div className="space-y-4">
            {myReviews.slice(0, 10).map((review) => (
              <div key={review.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`/places/${review.place.id}`}
                    className="text-sm font-semibold text-slate-900 hover:text-orange-600"
                  >
                    {review.place.name}
                  </Link>
                  <span className="text-xs text-amber-500 font-semibold shrink-0">
                    {'★'.repeat(Math.round(review.rating))} {review.rating.toFixed(1)}
                  </span>
                </div>
                {review.body && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {review.body.length > 100 ? `${review.body.slice(0, 100)}…` : review.body}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  {new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        )}
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
