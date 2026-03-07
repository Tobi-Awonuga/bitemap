import { useState, useEffect, useCallback } from 'react'
import { Search, MapPin, TrendingUp, Sparkles, Loader2 } from 'lucide-react'
import PlaceCard, { type Place } from '../components/ui/PlaceCard'
import { api } from '../lib/api'
import { useGeolocation } from '../hooks/useGeolocation'

const CUISINE_TAGS = [
  'All', 'Italian', 'Japanese', 'Burgers', 'Vegan', 'Indian', 'Brunch', 'Cocktail Bars', 'Fine Dining', 'British',
]

export default function HomePage() {
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTag, setActiveTag] = useState('All')
  const { coords } = useGeolocation()

  const fetchPlaces = useCallback(async (q?: string, tag?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      const query = q ?? ''
      const cuisine = tag && tag !== 'All' ? tag : ''
      if (query) params.set('q', query)
      else if (cuisine) params.set('q', cuisine)
      params.set('limit', '24')
      if (coords) {
        params.set('lat', String(coords.lat))
        params.set('lng', String(coords.lng))
      }
      const endpoint = coords ? '/api/places/nearby' : '/api/places'
      const data = await api.get<Place[]>(`${endpoint}?${params}`)
      setPlaces(data)
    } catch {
      setPlaces([])
    } finally {
      setLoading(false)
    }
  }, [coords])

  useEffect(() => {
    fetchPlaces(searchQuery, activeTag)
  }, [coords, fetchPlaces])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchPlaces(searchQuery, activeTag)
  }

  const handleTagChange = (tag: string) => {
    setActiveTag(tag)
    fetchPlaces(searchQuery, tag)
  }

  const topRated = [...places].sort((a, b) => b.avgRating - a.avgRating).slice(0, 6)
  const newest = [...places].slice(0, 3)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Hero */}
      <section className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 overflow-hidden px-8 py-12 md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/25 via-transparent to-transparent" />
        <div className="relative max-w-xl">
          <div className="flex items-center gap-2 text-orange-400 text-sm font-medium mb-4">
            <MapPin className="w-4 h-4" />
            <span>{coords ? 'Near you' : 'London, UK'}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-6">
            What are you<br />
            <span className="text-orange-400">craving today?</span>
          </h1>

          <form onSubmit={handleSearch} className="flex items-center gap-2 bg-white rounded-2xl p-1.5 shadow-xl shadow-black/20">
            <div className="flex-1 flex items-center gap-2 px-3">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search places, cuisines, dishes..."
                className="w-full text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none py-2"
              />
            </div>
            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shrink-0"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Cuisine filter tags */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-orange-500" />
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Browse by Cuisine</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {CUISINE_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagChange(tag)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTag === tag
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-300 hover:text-orange-500'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : places.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No places found</h2>
          <p className="text-slate-500 text-sm max-w-xs">
            Try a different search or ask an admin to add places.
          </p>
        </div>
      ) : (
        <>
          {/* Top rated */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <h2 className="text-lg font-bold text-slate-900">
                  {coords ? 'Near You' : 'Top Rated'}
                </h2>
              </div>
              <span className="text-sm text-slate-400">{places.length} places</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {topRated.map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          </section>

          {/* Recently added */}
          {newest.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-900">Recently Added</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {newest.map((place) => (
                  <PlaceCard key={place.id} place={place} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
