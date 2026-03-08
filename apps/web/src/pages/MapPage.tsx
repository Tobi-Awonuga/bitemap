import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, SlidersHorizontal, Star, MapPin, Loader2, LocateFixed } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '../lib/api'
import { useGeolocation } from '../hooks/useGeolocation'

type MapPlace = {
  id: string
  name: string
  cuisine?: string | null
  avgRating: number
  address: string
  latitude: number
  longitude: number
  imageUrl?: string | null
}

const DEFAULT_CENTER: [number, number] = [43.6532, -79.3832]

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

const FALLBACK_GRADIENTS = [
  'from-slate-700 to-slate-900',
  'from-pink-400 to-rose-500',
  'from-amber-500 to-orange-600',
  'from-emerald-400 to-teal-600',
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
]

function gradientFor(id: string): string {
  const sum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return FALLBACK_GRADIENTS[sum % FALLBACK_GRADIENTS.length]
}

function ViewportController({
  coords,
  places,
  radiusKm,
}: {
  coords: { lat: number; lng: number } | null
  places: MapPlace[]
  radiusKm: number
}) {
  const map = useMap()

  useEffect(() => {
    if (coords) {
      const bounds = L.latLngBounds([coords.lat, coords.lng], [coords.lat, coords.lng])
      places.forEach((place) => bounds.extend([place.latitude, place.longitude]))
      if (places.length > 0) {
        map.fitBounds(bounds.pad(0.2), { animate: true, duration: 0.5 })
      } else {
        map.setView([coords.lat, coords.lng], Math.max(12, 16 - Math.round(radiusKm / 3)))
      }
      return
    }
    if (places.length > 0) {
      const bounds = L.latLngBounds(
        places.map((place) => [place.latitude, place.longitude] as [number, number]),
      )
      map.fitBounds(bounds.pad(0.2), { animate: true, duration: 0.5 })
    }
  }, [coords, map, places, radiusKm])

  return null
}

export default function MapPage() {
  const [places, setPlaces] = useState<MapPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [radiusKm, setRadiusKm] = useState(8)
  const [activeCuisine, setActiveCuisine] = useState('All')
  const { coords, permission, error: geoError, requestLocation } = useGeolocation()
  const cacheRef = useRef(new Map<string, MapPlace[]>())

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(timer)
  }, [search])

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams()
    const query = debouncedSearch.trim()
    if (query.length >= 2) params.set('q', query)
    params.set('limit', '24')
    if (coords) {
      params.set('lat', String(coords.lat))
      params.set('lng', String(coords.lng))
      params.set('radius', String(radiusKm))
    }
    const endpoint = coords ? '/api/places/nearby' : '/api/places'
    return `${endpoint}?${params}`
  }, [coords, debouncedSearch, radiusKm])

  useEffect(() => {
    const fetchPlaces = async () => {
      const cached = cacheRef.current.get(requestUrl)
      if (cached) {
        setPlaces(cached)
        setLoading(false)
        setRefreshing(true)
      } else {
        setLoading(true)
        setRefreshing(false)
      }
      try {
        const data = await api.get<MapPlace[]>(requestUrl)
        cacheRef.current.set(requestUrl, data)
        setPlaces(data)
        setError(null)
      } catch (err) {
        if (!cached) setPlaces([])
        setError(err instanceof Error ? err.message : 'Failed to load map places')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    }
    void fetchPlaces()
  }, [requestUrl])

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

  const listedPlaces = useMemo(() => {
    return filteredPlaces.map((place) => {
      if (!coords) return { ...place, distanceMiles: null as number | null }
      const km = haversineKm(coords.lat, coords.lng, place.latitude, place.longitude)
      return { ...place, distanceMiles: kmToMiles(km) }
    })
  }, [coords, filteredPlaces])

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <aside className="w-full sm:w-80 lg:w-96 flex flex-col bg-white border-r border-slate-100 shrink-0 overflow-hidden">
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
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs text-slate-400 font-medium">
            <span className="text-slate-900 font-semibold">{listedPlaces.length}</span> places nearby
          </p>
          {refreshing && <p className="text-xs text-slate-500 mt-1">Refreshing nearby places...</p>}
          {permission === 'denied' && (
            <p className="text-xs text-amber-600 mt-1">Location blocked. Showing broader results.</p>
          )}
          {geoError && <p className="text-xs text-red-500 mt-1">{geoError}</p>}
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

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
                <div
                  className={`w-12 h-12 rounded-xl shrink-0 overflow-hidden ${!place.imageUrl ? `bg-gradient-to-br ${gradientFor(place.id)}` : 'bg-slate-200'}`}
                >
                  {place.imageUrl && (
                    <img src={place.imageUrl} alt={place.name} className="w-full h-full object-cover" />
                  )}
                </div>
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

      <div className="flex-1 relative overflow-hidden hidden sm:block">
        <MapContainer
          center={coords ? [coords.lat, coords.lng] : DEFAULT_CENTER}
          zoom={13}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ViewportController coords={coords} places={filteredPlaces} radiusKm={radiusKm} />

          {coords && (
            <>
              <Circle
                center={[coords.lat, coords.lng]}
                radius={radiusKm * 1000}
                pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.08 }}
              />
              <CircleMarker
                center={[coords.lat, coords.lng]}
                radius={8}
                pathOptions={{ color: '#1d4ed8', fillColor: '#2563eb', fillOpacity: 1, weight: 2 }}
              >
                <Popup>You are here</Popup>
              </CircleMarker>
            </>
          )}

          {filteredPlaces.map((place) => (
            <CircleMarker
              key={place.id}
              center={[place.latitude, place.longitude]}
              radius={6}
              pathOptions={{ color: '#ea580c', fillColor: '#f97316', fillOpacity: 0.95, weight: 1 }}
            >
              <Popup>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">{place.name}</p>
                  <p className="text-xs text-slate-500">{place.address}</p>
                  <Link to={`/places/${place.id}`} className="text-xs text-orange-600 font-medium">
                    Open details
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {!loading && filteredPlaces.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/95 rounded-2xl px-5 py-4 shadow-sm border border-slate-200 text-center">
              <p className="font-semibold text-slate-700">No map points yet</p>
              <p className="text-sm text-slate-500 mt-1">Try broadening search or radius</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
