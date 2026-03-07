import { useState, useEffect } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import PlaceCard, { type Place } from '../components/ui/PlaceCard'
import { api } from '../lib/api'

type VisitRow = {
  id: string
  placeId: string
  visitedAt: string
  place: Place
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function thisMonthCount(visits: VisitRow[]): number {
  const now = new Date()
  return visits.filter((v) => {
    const d = new Date(v.visitedAt)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length
}

function uniqueCuisines(visits: VisitRow[]): number {
  return new Set(visits.map((v) => v.place.cuisine).filter(Boolean)).size
}

export default function VisitedPlacesPage() {
  const [visits, setVisits] = useState<VisitRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<VisitRow[]>('/api/visits')
      .then(setVisits)
      .catch(() => setVisits([]))
      .finally(() => setLoading(false))
  }, [])

  const stats = [
    { label: 'Total Visits', value: visits.length },
    { label: 'This Month', value: thisMonthCount(visits) },
    { label: 'Cuisines Tried', value: uniqueCuisines(visits) },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Your Journey</h1>
        <p className="text-slate-500 text-sm mt-1">Places you've been to</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
            <p className="text-2xl font-bold text-slate-900">{loading ? '—' : value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : visits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No visits logged yet</h2>
          <p className="text-slate-500 text-sm max-w-xs mb-6">
            When you mark a place as visited, it will appear here with the date.
          </p>
          <Link
            to="/"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
          >
            Explore places
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visits.map((v) => (
            <PlaceCard
              key={v.id}
              place={v.place}
              showVisitedBadge
              visitedDate={formatDate(v.visitedAt)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
