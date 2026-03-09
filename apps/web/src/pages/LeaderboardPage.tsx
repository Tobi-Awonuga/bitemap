import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Trophy } from 'lucide-react'
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
const PODIUM_ORDER = [1, 0, 2]
const PODIUM_STYLES = [
  'min-h-[188px] bg-slate-50/90 border-slate-200',
  'min-h-[228px] bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_100%)] border-amber-300 shadow-[0_24px_60px_-30px_rgba(249,115,22,0.45)]',
  'min-h-[172px] bg-slate-50/90 border-slate-200',
]
const PODIUM_AVATARS = ['w-11 h-11', 'w-14 h-14', 'w-10 h-10']

export default function LeaderboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<{ data: LeaderboardUser[] }>('/api/users/leaderboard?limit=25')
      .then((res) => setLeaderboard(res.data))
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false))
  }, [])

  const handleBack = () => {
    const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from
    if (from?.pathname) {
      navigate(`${from.pathname}${from.search ?? ''}`)
      return
    }
    navigate(-1)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-orange-500 transition-colors mb-5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
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
            <div className="mb-8 rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(255,247,237,0.95),_rgba(255,255,255,1)_58%)] px-4 py-7 md:px-6">
              <div className="flex items-end justify-center gap-3 md:gap-4">
              {PODIUM_ORDER.map((idx, displayIndex) => {
                const entry = leaderboard[idx]
                const rank = idx + 1
                return (
                  <Link
                    key={entry.userId}
                    to={`/users/${entry.userId}`}
                    className={`flex flex-1 max-w-[150px] flex-col items-center justify-end rounded-[28px] border px-4 pb-4 pt-3 text-center transition-all duration-200 hover:-translate-y-1 hover:border-amber-300 hover:shadow-[0_24px_60px_-30px_rgba(249,115,22,0.42)] ${PODIUM_STYLES[displayIndex]}`}
                  >
                    <span className="mb-2 text-xl">{MEDALS[rank - 1]}</span>
                    <UserAvatar
                      name={entry.displayName}
                      avatarUrl={entry.avatarUrl}
                      className={PODIUM_AVATARS[displayIndex]}
                      textClassName="text-xs"
                    />
                    <p className="mt-2 text-sm font-semibold text-slate-900 truncate w-full">{entry.displayName}</p>
                    <p className="mt-1 text-xs text-slate-500">{entry.points} pts</p>
                  </Link>
                )
              })}
              </div>
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
