import { useEffect, useMemo, useState } from 'react'
import { Search, SlidersHorizontal, Star, MapPin, Loader2, LocateFixed } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useGeolocation } from '../hooks/useGeolocation'

type MapPlace = {
  id: string
  name: string
  cuisine?: string | null
  rating?: number
  avgRating: number
  address: string
  latitude: number
  longitude: number
}

function kmToMiles(km: number): number {
  return km * 0.621371
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function project(value: number, min: number, max: number): number {
  if (max === min) return 50
  return ((value - min) / (max - min)) * 80 + 10
}

export default function MapPage() {
  const [places, setPlaces] = useState<MapPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [radiusKm, setRadiusKm] = useState(8)
  const [activeCuisine, setActiveCuisine] = useState('All')
  const { coords, permission, error: geoError, requestLocation } = useGeolocation()

  useEffect(() => {
    const fetchPlaces = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (search.trim()) params.set('q', search.trim())
        if (coords) {
          params.set('lat', String(coords.lat))
          params.set('lng', String(coords.lng))
          params.set('radius', String(radiusKm))
        }
        const data = await api.get<MapPlace[]>(`/api/places/nearby?${params}`)
        setPlaces(data)
        setError(null)
      } catch (err) {
        setPlaces([])
        setError(err instanceof Error ? err.message : 'Failed to load map places')
      } finally {
        setLoading(false)
      }
    }
    void fetchPlaces()
  }, [coords, radiusKm, search])

  const cuisines = useMemo(() => {
    const values = new Set<string>()
    places.forEach((place) => {
      if (place.cuisine) values.add(place.cuisine)
    })
    return ['All', ...Array.from(values).sort((a, b) => a.localeCompare(b))]
  }, [places])

  const filteredPlaces = useMemo(() => {
    if (activeCuisine === 'All') return places
    return places.filter((place) => place.cuisine === activeCuisine)
  }, [activeCuisine, places])

  const placeBounds = useMemo(() => {
    if (filteredPlaces.length === 0) return null
    return {
      minLat: Math.min(...filteredPlaces.map((place) => place.latitude)),
      maxLat: Math.max(...filteredPlaces.map((place) => place.latitude)),
      minLng: Math.min(...filteredPlaces.map((place) => place.longitude)),
      maxLng: Math.max(...filteredPlaces.map((place) => place.longitude)),
    }
  }, [filteredPlaces])

  const listedPlaces = useMemo(() => {
    return filteredPlaces.map((place) => {
      if (!coords) return { ...place, distanceMiles: null as number | null }
      const km = haversineKm(coords.lat, coords.lng, place.latitude, place.longitude)
      return { ...place, distanceMiles: kmToMiles(km) }
    })
  }, [coords, filteredPlaces])

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full sm:w-80 lg:w-96 flex flex-col bg-white border-r border-slate-100 shrink-0 overflow-hidden">
        {/* Search + filter */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search on map..."
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={requestLocation}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              <LocateFixed className="w-3 h-3" />
              {coords ? 'Refresh location' : 'Use location'}
            </button>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg px-3 py-1.5">
              <SlidersHorizontal className="w-3 h-3" />
              <span>{radiusKm}km</span>
            </div>
          </div>
          <input
            type="range"
            min={2}
            max={25}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="w-full accent-orange-500"
          />
          <div className="flex items-center gap-2 overflow-x-auto">
            {cuisines.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveCuisine(tag)}
                className="text-xs font-medium text-slate-600 bg-slate-100 hover:bg-orange-50 hover:text-orange-500 rounded-lg px-3 py-1.5 transition-colors"
                data-active={activeCuisine === tag}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs text-slate-400 font-medium">
            <span className="text-slate-900 font-semibold">{listedPlaces.length}</span> places nearby
          </p>
          {permission === 'denied' && (
            <p className="text-xs text-amber-600 mt-1">Location blocked. Showing global results.</p>
          )}
          {geoError && <p className="text-xs text-red-500 mt-1">{geoError}</p>}
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        {/* Place list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
            </div>
          ) : listedPlaces.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-slate-500">No places match current filters.</p>
            </div>
          ) : (
            listedPlaces.map((place) => (
              <Link
                key={place.id}
                to={`/places/${place.id}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-orange-500 transition-colors truncate">
                    {place.name}
                  </p>
                  <p className="text-xs text-orange-500 font-medium">{place.cuisine ?? 'Uncategorized'}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-semibold text-slate-700">
                      {place.avgRating > 0 ? place.avgRating.toFixed(1) : '-'}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 text-xs text-slate-400">
                    <MapPin className="w-3 h-3" />
                    {place.distanceMiles !== null ? `${place.distanceMiles.toFixed(1)} mi` : 'unknown'}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </aside>

      {/* Map area */}
      <div className="flex-1 relative bg-slate-200 overflow-hidden hidden sm:block">
        {/* Grid pattern to simulate a map */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, #94a3b8 1px, transparent 1px),
              linear-gradient(to bottom, #94a3b8 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />

        {placeBounds && listedPlaces.length > 0 ? (
          listedPlaces.map((place) => {
            const left = project(place.longitude, placeBounds.minLng, placeBounds.maxLng)
            const top = 100 - project(place.latitude, placeBounds.minLat, placeBounds.maxLat)
            return (
              <div key={place.id} className="absolute" style={{ left: `${left}%`, top: `${top}%` }}>
                <Link to={`/places/${place.id}`} className="relative group block -translate-x-1/2 -translate-y-1/2">
                  <div className="bg-white rounded-full px-2.5 py-1 shadow-md flex items-center gap-1.5 hover:scale-105 transition-transform">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-xs font-semibold text-slate-800 truncate max-w-28">{place.name}</span>
                  </div>
                </Link>
              </div>
            )
          })
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-orange-200">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">No map points yet</p>
                <p className="text-sm text-slate-400 mt-1">Try broadening search or radius</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
