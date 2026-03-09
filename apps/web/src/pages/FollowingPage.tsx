import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import UserAvatar from '../components/ui/UserAvatar'

type FollowUser = {
  id: string
  displayName: string
  avatarUrl?: string | null
  role: string
}

export default function FollowingPage() {
  const { user } = useAuth()
  const [following, setFollowing] = useState<FollowUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    api
      .get<{ data: FollowUser[] }>(`/api/users/${user.id}/following?limit=50`)
      .then((res) => setFollowing(res.data))
      .catch(() => setError('Could not load following'))
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
        <h1 className="text-xl font-bold text-slate-900 mb-6">Following</h1>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : following.length === 0 ? (
          <div className="text-center py-10">
            <UserPlus className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Not following anyone yet.</p>
            <Link to="/discover" className="text-xs text-orange-500 hover:text-orange-600 font-medium mt-1 inline-block">
              Discover people →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {following.map((person) => (
              <Link
                key={person.id}
                to={`/users/${person.id}`}
                className="flex items-center gap-3 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl transition-colors"
              >
                <UserAvatar name={person.displayName} avatarUrl={person.avatarUrl} className="w-10 h-10 rounded-xl" textClassName="text-sm" />
                <span className="text-sm font-medium text-slate-900">{person.displayName}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
