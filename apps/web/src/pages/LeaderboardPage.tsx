import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Trophy } from 'lucide-react'
import { api } from '../lib/api'
import UserAvatar from '../components/ui/UserAvatar'

type LeaderboardUser = {
  userId: string
  displayName: string
  avatarUrl?: string | null
  reviews: number
  visits: number
  saves: number
  followers: number
  points: number
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<{ data: LeaderboardUser[] }>('/api/users/leaderboard?limit=25')
      .then((res) => setLeaderboard(res.data))
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Trophy className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold text-slate-900">Community Leaderboard</h1>
        </div>
        <p className="text-slate-500 text-sm">Points come from reviews, saves, followers, and visits.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-20">
          <Trophy className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No rankings yet. Start reviewing to claim the top spot.</p>
        </div>
      ) : (
        <>
          {leaderboard.length >= 3 && (
            <div className="flex items-end justify-center gap-3 mb-8">
              {[1, 0, 2].map((idx) => {
                const entry = leaderboard[idx]
                const rank = idx + 1
                const heights = ['h-28', 'h-36', 'h-24']
                const bgColors = ['bg-slate-100', 'bg-amber-50 ring-2 ring-amber-300', 'bg-slate-100']
                return (
                  <Link
                    key={entry.userId}
                    to={`/users/${entry.userId}`}
                    className={`flex flex-col items-center justify-end rounded-2xl px-4 pb-4 pt-2 flex-1 max-w-[140px] transition-opacity hover:opacity-80 ${heights[idx]} ${bgColors[idx]}`}
                  >
                    <span className="text-xl mb-1">{MEDALS[rank - 1]}</span>
                    <UserAvatar
                      name={entry.displayName}
                      avatarUrl={entry.avatarUrl}
                      className={idx === 0 ? 'w-12 h-12' : 'w-10 h-10'}
                      textClassName="text-xs"
                    />
                    <p className="text-xs font-semibold text-slate-900 mt-1.5 text-center truncate w-full">{entry.displayName}</p>
                    <p className="text-xs text-slate-500">{entry.points} pts</p>
                  </Link>
                )
              })}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {leaderboard.map((entry, index) => (
              <Link
                key={entry.userId}
                to={`/users/${entry.userId}`}
                className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
              >
                <span className={`w-7 text-sm font-bold shrink-0 ${index < 3 ? 'text-lg' : 'text-slate-400'}`}>
                  {index < 3 ? MEDALS[index] : `#${index + 1}`}
                </span>
                <UserAvatar
                  name={entry.displayName}
                  avatarUrl={entry.avatarUrl}
                  className="w-10 h-10 shrink-0"
                  textClassName="text-xs"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{entry.displayName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {entry.reviews} reviews - {entry.saves} saves - {entry.followers} followers - {entry.visits} visits
                  </p>
                </div>
                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full shrink-0">
                  {entry.points} pts
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
