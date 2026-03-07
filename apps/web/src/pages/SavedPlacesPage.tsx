import { useState, useEffect } from 'react'
import { Bookmark, Search, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import PlaceCard, { type Place } from '../components/ui/PlaceCard'
import { api } from '../lib/api'

type SaveRow = {
  id: string
  placeId: string
  createdAt: string
  place: Place
}

export default function SavedPlacesPage() {
  const [saves, setSaves] = useState<SaveRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api
      .get<SaveRow[]>('/api/saves')
      .then(setSaves)
      .catch(() => setSaves([]))
      .finally(() => setLoading(false))
  }, [])

  const handleUnsave = (placeId: string, saved: boolean) => {
    if (!saved) setSaves((prev) => prev.filter((s) => s.placeId !== placeId))
  }

  const filtered = saves.filter((s) => {
    const q = search.toLowerCase()
    return (
      s.place.name.toLowerCase().includes(q) ||
      (s.place.cuisine?.toLowerCase().includes(q) ?? false) ||
      s.place.address.toLowerCase().includes(q)
    )
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Saved Places</h1>
          <p className="text-slate-500 text-sm mt-1">
            {loading ? 'Loading…' : `${saves.length} place${saves.length !== 1 ? 's' : ''} saved`}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 w-full sm:w-60">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved..."
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : saves.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
            <Bookmark className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No saved places yet</h2>
          <p className="text-slate-500 text-sm max-w-xs mb-6">
            Tap the bookmark icon on any place to save it here for later.
          </p>
          <Link
            to="/discover"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
          >
            Explore places
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-slate-500 py-12">No saved places match "{search}"</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((s) => (
            <PlaceCard
              key={s.id}
              place={{ ...s.place, isSaved: true }}
              onSaveChange={handleUnsave}
            />
          ))}
        </div>
      )}
    </div>
  )
}
