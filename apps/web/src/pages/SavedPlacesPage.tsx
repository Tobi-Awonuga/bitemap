import { Bookmark, Search } from 'lucide-react'
import PlaceCard, { type Place } from '../components/ui/PlaceCard'

const SAVED_PLACES: Place[] = [
  {
    id: '2',
    name: 'Sketch',
    cuisine: 'Contemporary',
    address: '9 Conduit Street, Mayfair',
    rating: 4.7,
    reviewCount: 1204,
    gradient: 'from-pink-400 to-rose-500',
    saved: true,
  },
  {
    id: '4',
    name: 'The Clove Club',
    cuisine: 'British',
    address: 'Shoreditch Town Hall, EC1V',
    rating: 4.6,
    reviewCount: 567,
    gradient: 'from-emerald-400 to-teal-600',
    saved: true,
  },
  {
    id: '3',
    name: 'Dishoom',
    cuisine: 'Indian',
    address: "12 Upper St Martin's Lane",
    rating: 4.9,
    reviewCount: 3401,
    gradient: 'from-amber-500 to-orange-600',
    saved: true,
  },
]

export default function SavedPlacesPage() {
  const isEmpty = false

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Saved Places</h1>
          <p className="text-slate-500 text-sm mt-1">
            {SAVED_PLACES.length} place{SAVED_PLACES.length !== 1 ? 's' : ''} saved
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 w-full sm:w-60">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search saved..."
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {isEmpty ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
            <Bookmark className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No saved places yet</h2>
          <p className="text-slate-500 text-sm max-w-xs mb-6">
            Tap the bookmark icon on any place to save it here for later.
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
          {SAVED_PLACES.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      )}
    </div>
  )
}
