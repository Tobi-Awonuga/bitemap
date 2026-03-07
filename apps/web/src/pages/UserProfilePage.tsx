import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, MapPin, Shield, Star, UserPlus, UserMinus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

type UserProfileData = {
  user: {
    id: string
    displayName: string
    avatarUrl?: string | null
    createdAt: string
    role: 'user' | 'admin'
  }
  stats: {
    saves: number
    visits: number
    reviews: number
    followers: number
    following: number
  }
  isFollowing: boolean
  recentReviews: Array<{
    id: string
    rating: number
    body?: string | null
    createdAt: string
    place: {
      id: string
      name: string
      cuisine?: string | null
      imageUrl?: string | null
    }
  }>
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { user: me } = useAuth()
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api
      .get<{ data: UserProfileData }>(`/api/users/${id}`)
      .then((res) => setProfile(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load user profile'))
      .finally(() => setLoading(false))
  }, [id])

  const isSelf = useMemo(() => !!me && !!profile && me.id === profile.user.id, [me, profile])

  const toggleFollow = async () => {
    if (!profile || !id || pending || isSelf) return
    setPending(true)
    try {
      if (profile.isFollowing) {
        await api.del(`/api/users/${id}/follow`)
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: false,
                stats: { ...prev.stats, followers: Math.max(0, prev.stats.followers - 1) },
              }
            : prev,
        )
      } else {
        await api.post(`/api/users/${id}/follow`)
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: true,
                stats: { ...prev.stats, followers: prev.stats.followers + 1 },
              }
            : prev,
        )
      }
    } finally {
      setPending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-sm text-red-500">{error ?? 'Profile not found'}</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link to="/discover" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-orange-600">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <span className="text-white font-bold text-xl">{getInitials(profile.user.displayName)}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{profile.user.displayName}</h1>
                {profile.user.role === 'admin' && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 rounded-full px-2 py-0.5">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Member since {formatDate(profile.user.createdAt)}</p>
            </div>
          </div>
          {!isSelf && (
            <button
              onClick={toggleFollow}
              disabled={pending}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                profile.isFollowing
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              {profile.isFollowing ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {profile.isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-5 gap-2 mt-6">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-slate-900">{profile.stats.followers}</p>
            <p className="text-xs text-slate-500">Followers</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-slate-900">{profile.stats.following}</p>
            <p className="text-xs text-slate-500">Following</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-slate-900">{profile.stats.reviews}</p>
            <p className="text-xs text-slate-500">Reviews</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-slate-900">{profile.stats.visits}</p>
            <p className="text-xs text-slate-500">Visits</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-slate-900">{profile.stats.saves}</p>
            <p className="text-xs text-slate-500">Saved</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4">Recent reviews</h2>
        {profile.recentReviews.length === 0 ? (
          <p className="text-sm text-slate-500">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {profile.recentReviews.map((review) => (
              <Link key={review.id} to={`/places/${review.place.id}`} className="block border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">{review.place.name}</p>
                  <div className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {review.rating.toFixed(1)}
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="w-3 h-3" />
                  <span>{review.place.cuisine ?? 'Uncategorized'}</span>
                </div>
                {review.body && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{review.body}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
