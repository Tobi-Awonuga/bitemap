import { CheckCircle } from 'lucide-react'
import PlaceCard, { type Place } from '../components/ui/PlaceCard'

type VisitedPlace = Place & { visitedDate: string }

const VISITED_PLACES: VisitedPlace[] = [
  {
    id: '1',
    name: 'Nobu London',
    cuisine: 'Japanese',
    address: '19 Old Park Lane, Mayfair',
    rating: 4.8,
    reviewCount: 892,
    gradient: 'from-slate-700 to-slate-900',
    saved: false,
    visitedDate: 'Feb 14, 2026',
  },
  {
    id: '3',
    name: 'Dishoom',
    cuisine: 'Indian',
    address: "12 Upper St Martin's Lane",
    rating: 4.9,
    reviewCount: 3401,
    gradient: 'from-amber-500 to-orange-600',
    saved: false,
    visitedDate: 'Jan 28, 2026',
  },
  {
    id: '5',
    name: 'Brat',
    cuisine: 'Basque',
    address: '4 Redchurch Street, E2',
    rating: 4.8,
    reviewCount: 743,
    gradient: 'from-blue-500 to-indigo-600',
    saved: true,
    visitedDate: 'Dec 20, 2025',
  },
]

const STATS = [
  { label: 'Total Visits', value: VISITED_PLACES.length },
  { label: 'This Month', value: 1 },
  { label: 'Cuisines Tried', value: 3 },
]

export default function VisitedPlacesPage() {
  const isEmpty = false

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Your Journey</h1>
        <p className="text-slate-500 text-sm mt-1">Places you've been to</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {STATS.map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {isEmpty ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No visits logged yet</h2>
          <p className="text-slate-500 text-sm max-w-xs mb-6">
            When you mark a place as visited, it will appear here with the date.
          </p>
          <a
            href="/"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
          >
            Explore places
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {VISITED_PLACES.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              showVisitedBadge
              visitedDate={place.visitedDate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
