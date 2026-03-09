import { useState, useEffect } from 'react'
import { Users, UtensilsCrossed, MessageSquare, Bookmark, CheckCircle, Star, Loader2, AlertTriangle, UserX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import type { AdminInsights, AdminStats, UserLeaderboardEntry } from '@bitemap/shared'
import UserAvatar from '../../components/ui/UserAvatar'

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-3xl font-bold text-white">{value.toLocaleString()}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [insights, setInsights] = useState<AdminInsights | null>(null)
  const [leaderboard, setLeaderboard] = useState<UserLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get<AdminStats>('/api/admin/stats'),
      api.get<AdminInsights>('/api/admin/insights'),
      api.get<UserLeaderboardEntry[]>('/api/admin/leaderboard?limit=6'),
    ])
      .then(([statsData, insightsData, leaderboardData]) => {
        setStats(statsData)
        setInsights(insightsData)
        setLeaderboard(leaderboardData)
        setError(null)
      })
      .catch((err) => {
        setStats(null)
        setInsights(null)
        setLeaderboard([])
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Overview of your BiteMap platform</p>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Open reports alert */}
      {(stats?.openReviewReports ?? 0) > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-amber-300 text-sm font-medium">
            ⚠ {stats!.openReviewReports} review report{stats!.openReviewReports !== 1 ? 's' : ''} need attention
          </span>
          <Link to="/admin/reviews" className="text-amber-400 hover:text-amber-300 text-sm font-semibold transition-colors">
            Review Now →
          </Link>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <StatCard label="Users" value={stats?.totalUsers ?? 0} icon={Users} color="bg-blue-500/20 text-blue-400" />
        <StatCard label="Places" value={stats?.totalPlaces ?? 0} icon={UtensilsCrossed} color="bg-orange-500/20 text-orange-400" />
        <StatCard label="Reviews" value={stats?.totalReviews ?? 0} icon={MessageSquare} color="bg-violet-500/20 text-violet-400" />
        <StatCard label="Saves" value={stats?.totalSaves ?? 0} icon={Bookmark} color="bg-pink-500/20 text-pink-400" />
        <StatCard label="Visits" value={stats?.totalVisits ?? 0} icon={CheckCircle} color="bg-emerald-500/20 text-emerald-400" />
        <StatCard label="Open Reports" value={stats?.openReviewReports ?? 0} icon={AlertTriangle} color="bg-amber-500/20 text-amber-300" />
        <StatCard label="Deactivated" value={stats?.deactivatedUsers ?? 0} icon={UserX} color="bg-rose-500/20 text-rose-300" />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Add a Place', desc: 'Add a new restaurant or venue', to: '/admin/places', color: 'from-orange-500 to-orange-600' },
          { label: 'Manage Users', desc: 'View and update user roles', to: '/admin/users', color: 'from-blue-500 to-blue-600' },
          { label: 'Moderate Reviews', desc: 'Review and remove content', to: '/admin/reviews', color: 'from-violet-500 to-violet-600' },
          { label: 'Open Reports', desc: `${stats?.openReviewReports ?? 0} report(s) waiting`, to: '/admin/reviews', color: 'from-amber-500 to-amber-600' },
        ].map(({ label, desc, to, color }) => (
          <Link
            key={to}
            to={to}
            className={`bg-gradient-to-br ${color} rounded-2xl p-5 hover:opacity-90 transition-opacity`}
          >
            <h3 className="font-bold text-white text-sm">{label}</h3>
            <p className="text-white/70 text-xs mt-1">{desc}</p>
          </Link>
        ))}
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-white">Top Saved Places</h2>
          </div>
          <div className="divide-y divide-slate-700">
            {(insights?.topSavedPlaces ?? []).length === 0 ? (
              <p className="px-6 py-6 text-sm text-slate-400">No save activity yet.</p>
            ) : (
              insights!.topSavedPlaces.map((place) => (
                <div key={place.id} className="px-6 py-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/places/${place.id}`} className="text-sm font-medium text-white hover:text-orange-300">
                      {place.name}
                    </Link>
                    {place.cuisine && <p className="text-xs text-slate-400 mt-1">{place.cuisine}</p>}
                  </div>
                  <span className="text-xs font-semibold text-orange-300 bg-orange-500/10 px-2 py-1 rounded-md">
                    {place.saveCount} saves
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-white">Cuisine Trends</h2>
          </div>
          <div className="divide-y divide-slate-700">
            {(insights?.topCuisines ?? []).length === 0 ? (
              <p className="px-6 py-6 text-sm text-slate-400">No cuisine trends yet.</p>
            ) : (
              insights!.topCuisines.map((row) => (
                <div key={row.cuisine} className="px-6 py-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{row.cuisine}</p>
                    <p className="text-xs text-slate-400 mt-1">{row.placeCount} places</p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded-md">
                    {row.saveCount} saves
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-white">Top Community Contributors</h2>
        </div>
        {(leaderboard ?? []).length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-400">No ranking data yet.</p>
        ) : (
          <div className="divide-y divide-slate-700">
            {leaderboard.map((entry, index) => (
              <div key={entry.userId} className="px-6 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-orange-300 font-semibold w-6">#{index + 1}</span>
                  <UserAvatar
                    name={entry.displayName}
                    avatarUrl={entry.avatarUrl}
                    className="w-9 h-9"
                    textClassName="text-xs"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{entry.displayName}</p>
                    <p className="text-xs text-slate-400">
                      {entry.reviews} reviews • {entry.saves} saves • {entry.followers} followers • {entry.visits} visits
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent reviews */}
      {stats?.recentReviews && stats.recentReviews.length > 0 && (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent Reviews</h2>
            <Link to="/admin/reviews" className="text-xs text-orange-400 hover:text-orange-300">View all</Link>
          </div>
          <div className="divide-y divide-slate-700">
            {stats.recentReviews.map((review) => (
              <div key={review.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {review.user.displayName} reviewed{' '}
                      <Link to={`/places/${review.place.id}`} className="text-orange-400 hover:text-orange-300">
                        {review.place.name}
                      </Link>
                    </p>
                    {review.body && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{review.body}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-semibold text-white">{review.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
