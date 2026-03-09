import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import UserAvatar from '../components/ui/UserAvatar'

type FollowUser = {
  id: string
  displayName: string
  avatarUrl?: string | null
  role: string
}

export default function FollowersPage() {
  const { user } = useAuth()
  const [followers, setFollowers] = useState<FollowUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    api
      .get<{ data: FollowUser[] }>(`/api/users/${user.id}/followers?limit=50`)
      .then((res) => setFollowers(res.data))
      .catch(() => setError('Could not load followers'))
      .finally(() => setLoading(false))
  }, [user])

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link to="/profile" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-orange-600">
        <ArrowLeft className="w-4 h-4" />
        Back to profile
      </Link>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h1 className="text-xl font-bold text-slate-900 mb-6">Followers</h1>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading followers...
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : followers.length === 0 ? (
          <div className="text-center py-10">
            <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No followers yet.</p>
            <p className="text-xs text-slate-400 mt-1">Share your profile to get followers.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {followers.map((follower) => (
              <Link
                key={follower.id}
                to={`/users/${follower.id}`}
                className="flex items-center gap-3 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl transition-colors"
              >
                <UserAvatar name={follower.displayName} avatarUrl={follower.avatarUrl} className="w-10 h-10 rounded-xl" textClassName="text-sm" />
                <span className="text-sm font-medium text-slate-900">{follower.displayName}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
