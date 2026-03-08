import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Search, MapPin, TrendingUp, Sparkles, Loader2 } from 'lucide-react'
import PlaceCard, { type Place } from '../components/ui/PlaceCard'
import { api } from '../lib/api'
import { useGeolocation } from '../hooks/useGeolocation'
import { useAuth } from '../context/AuthContext'

const CUISINE_TAGS = [
  'All', 'Italian', 'Japanese', 'Burgers', 'Vegan', 'Indian', 'Brunch', 'Cocktail Bars', 'Fine Dining', 'British',
]
const DISCOVER_CACHE_KEY_PREFIX = 'bm_discover_cache'
const FOLLOWING_PICKS_CACHE_KEY_PREFIX = 'bm_following_picks'
const DISCOVER_STATE_KEY_PREFIX = 'bm_discover_state'

type FeedItem = {
  type: 'review' | 'visit'
  id: string
  createdAt: string
  place: Place
}

function pickUnique(places: Place[], excluded: Set<string>, limit: number): Place[] {
  const selected: Place[] = []
  for (const place of places) {
    if (excluded.has(place.id)) continue
    excluded.add(place.id)
    selected.push(place)
    if (selected.length >= limit) break
  }
  return selected
}

export default function HomePage() {
  const { user } = useAuth()
  const discoverCacheKey = `${DISCOVER_CACHE_KEY_PREFIX}:${user?.id ?? 'anon'}`
  const followingCacheKey = `${FOLLOWING_PICKS_CACHE_KEY_PREFIX}:${user?.id ?? 'anon'}`
  const discoverStateKey = `${DISCOVER_STATE_KEY_PREFIX}:${user?.id ?? 'anon'}`

  const [places, setPlaces] = useState<Place[]>(() => {
    try {
      const raw = sessionStorage.getItem(discoverCacheKey)
      if (!raw) return []
      const parsed = JSON.parse(raw) as Place[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(() => places.length === 0)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeTag, setActiveTag] = useState('All')
  const [followingFeed, setFollowingFeed] = useState<FeedItem[]>(() => {
    try {
      const raw = sessionStorage.getItem(followingCacheKey)
      if (!raw) return []
      const parsed = JSON.parse(raw) as FeedItem[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })
  const { coords, permission } = useGeolocation()
  const cacheRef = useRef(new Map<string, Place[]>())
  const requestIdRef = useRef(0)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(discoverCacheKey)
      const parsed = raw ? (JSON.parse(raw) as Place[]) : []
      if (Array.isArray(parsed) && parsed.length > 0) {
        setPlaces(parsed)
        setLoading(false)
      } else {
        setPlaces([])
        setLoading(true)
      }
    } catch {
      setPlaces([])
      setLoading(true)
    }
  }, [discoverCacheKey])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(followingCacheKey)
      const parsed = raw ? (JSON.parse(raw) as FeedItem[]) : []
      setFollowingFeed(Array.isArray(parsed) ? parsed : [])
    } catch {
      setFollowingFeed([])
    }
  }, [followingCacheKey])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(discoverStateKey)
      if (!raw) {
        setSearchQuery('')
        setDebouncedSearch('')
        setActiveTag('All')
        return
      }
      const parsed = JSON.parse(raw) as { searchQuery?: string; activeTag?: string }
      const nextSearch = typeof parsed.searchQuery === 'string' ? parsed.searchQuery : ''
      const nextTag = typeof parsed.activeTag === 'string' ? parsed.activeTag : 'All'
      setSearchQuery(nextSearch)
      setDebouncedSearch(nextSearch.trim())
      setActiveTag(nextTag)
    } catch {
      setSearchQuery('')
      setDebouncedSearch('')
      setActiveTag('All')
    }
  }, [discoverStateKey])

  useEffect(() => {
    try {
      sessionStorage.setItem(discoverStateKey, JSON.stringify({ searchQuery, activeTag }))
    } catch {
      // ignore storage errors
    }
  }, [activeTag, discoverStateKey, searchQuery])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams()
    const query = debouncedSearch.trim()
    const cuisine = activeTag !== 'All' ? activeTag : ''
    if (query.length >= 2) params.set('q', query)
    else if (cuisine) params.set('q', cuisine)
    params.set('limit', '24')
    if (coords) {
      params.set('lat', String(coords.lat))
      params.set('lng', String(coords.lng))
    }
    const endpoint = coords ? '/api/places/nearby' : '/api/places'
    return `${endpoint}?${params}`
  }, [activeTag, coords, debouncedSearch])

  const fetchPlaces = useCallback(async (url: string) => {
    const requestId = ++requestIdRef.current
    const cached = cacheRef.current.get(url)
    if (cached) {
      setPlaces(cached)
      setLoading(false)
      setRefreshing(true)
    } else {
      setRefreshing(false)
      setLoading(true)
    }
    try {
      const data = await api.get<Place[]>(url)
      if (requestId !== requestIdRef.current) return
      cacheRef.current.set(url, data)
      setPlaces(data)
      sessionStorage.setItem(discoverCacheKey, JSON.stringify(data))
    } catch {
      if (requestId !== requestIdRef.current) return
      if (!cached) setPlaces([])
    } finally {
      if (requestId !== requestIdRef.current) return
      setLoading(false)
      setRefreshing(false)
    }
  }, [discoverCacheKey])

  useEffect(() => {
    void fetchPlaces(requestUrl)
  }, [fetchPlaces, requestUrl])

  useEffect(() => {
    api
      .get<{ data: FeedItem[] }>('/api/users/feed')
      .then((res) => {
        setFollowingFeed(res.data)
        sessionStorage.setItem(followingCacheKey, JSON.stringify(res.data))
      })
      .catch(() => {
        setFollowingFeed((prev) => prev)
      })
  }, [followingCacheKey])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setDebouncedSearch(searchQuery.trim())
  }

  const handleTagChange = (tag: string) => {
    setActiveTag(tag)
    // Cuisine chip selection should act as its own filter context.
    setSearchQuery('')
    setDebouncedSearch('')
  }

  const curated = useMemo(() => {
    const excluded = new Set<string>()
    const nearYou = pickUnique([...places], excluded, 6)
    const trending = pickUnique(
      [...places]
        .filter((place) => place.reviewCount > 0)
        .sort((a, b) => b.reviewCount - a.reviewCount || b.avgRating - a.avgRating),
      excluded,
      6,
    )
    const topRated = pickUnique(
      [...places]
        .filter((place) => place.reviewCount >= 3 || place.avgRating >= 4.5)
        .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount),
      excluded,
      6,
    )
    return { nearYou, trending, topRated }
  }, [places])

  const followingPicks = useMemo(() => {
    const seen = new Set<string>()
    return followingFeed
      .map((item) => item.place)
      .filter((place) => {
        if (seen.has(place.id)) return false
        seen.add(place.id)
        return true
      })
      .slice(0, 6)
  }, [followingFeed])

  const locationLabel = useMemo(() => {
    if (coords) return 'Near you'
    if (permission === 'granted') return 'Locating...'
    if (permission === 'denied') return 'Location off'
    return 'Enable location for nearby spots'
  }, [coords, permission])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Hero */}
      <section className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 overflow-hidden px-8 py-12 md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/25 via-transparent to-transparent" />
        <div className="relative max-w-xl">
          <div className="flex items-center gap-2 text-orange-400 text-sm font-medium mb-4">
            <MapPin className="w-4 h-4" />
            <span>{locationLabel}</span>
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
          {/* Near you */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <h2 className="text-lg font-bold text-slate-900">Near You</h2>
              </div>
              <span className="text-sm text-slate-400">
                {refreshing ? 'Refreshing...' : `${places.length} places`}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {curated.nearYou.map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          </section>

          {/* Trending */}
          {curated.trending.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-900">Trending Now</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {curated.trending.map((place) => (
                  <PlaceCard key={place.id} place={place} />
                ))}
              </div>
            </section>
          )}

          {/* Top rated */}
          {curated.topRated.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-900">Top Rated</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {curated.topRated.map((place) => (
                  <PlaceCard key={place.id} place={place} />
                ))}
              </div>
            </section>
          )}

          {/* Following picks */}
          {followingPicks.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-900">From People You Follow</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {followingPicks.map((place) => (
                  <PlaceCard key={`follow-${place.id}`} place={place} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
