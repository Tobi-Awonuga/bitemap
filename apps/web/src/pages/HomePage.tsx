import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Search, MapPin, TrendingUp, Sparkles, Loader2, UserPlus, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import PlaceCard, { type Place } from '../components/ui/PlaceCard'
import { api } from '../lib/api'
import { useGeolocation } from '../hooks/useGeolocation'
import { useAuth } from '../context/AuthContext'
import UserAvatar from '../components/ui/UserAvatar'

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

type SuggestedUser = {
  id: string
  displayName: string
  avatarUrl?: string | null
  reviewCount: number
  followerCount: number
}

type RecommendedPlace = Place & { reason?: string }
type Recommendations = {
  forYou: RecommendedPlace[]
  friendsLoved: RecommendedPlace[]
  trendingNow: RecommendedPlace[]
}

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

function recommendationReasonFor(place: Place | RecommendedPlace): string | undefined {
  const reason = (place as RecommendedPlace).reason
  return typeof reason === 'string' ? reason : undefined
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

function fillSection<T extends Place>(primary: T[], fallback: T[], limit: number): T[] {
  const selected: T[] = []
  const seen = new Set<string>()

  for (const place of [...primary, ...fallback]) {
    if (seen.has(place.id)) continue
    seen.add(place.id)
    selected.push(place)
    if (selected.length >= limit) break
  }

  return selected
}

function extractCityFromAddress(address: string | undefined): string | null {
  if (!address) return null
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return null

  const provinceOrPostal = /^[A-Z]{2}(?:\s+[A-Z]\d[A-Z]\s?\d[A-Z]\d)?$/i
  const countryTokens = new Set(['canada', 'united states', 'usa'])
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i]
    const lower = part.toLowerCase()
    if (countryTokens.has(lower)) continue
    if (provinceOrPostal.test(part)) continue
    if (/\d/.test(part)) continue
    if (part.length < 2) continue
    return part
  }
  return null
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
  const [priceFilter, setPriceFilter] = useState<number | null>(null)
  const [searchSort, setSearchSort] = useState<'relevance' | 'rating' | 'reviews'>('relevance')
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
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [followPendingId, setFollowPendingId] = useState<string | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [recommendations, setRecommendations] = useState<Recommendations>({
    forYou: [],
    friendsLoved: [],
    trendingNow: [],
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
        setPriceFilter(null)
        return
      }
      const parsed = JSON.parse(raw) as { searchQuery?: string; activeTag?: string; priceFilter?: number | null }
      const nextSearch = typeof parsed.searchQuery === 'string' ? parsed.searchQuery : ''
      const nextTag = typeof parsed.activeTag === 'string' ? parsed.activeTag : 'All'
      const nextPriceFilter =
        parsed.priceFilter === null
          ? null
          : Number.isFinite(parsed.priceFilter) && Number(parsed.priceFilter) >= 1 && Number(parsed.priceFilter) <= 4
            ? Number(parsed.priceFilter)
            : null
      setSearchQuery(nextSearch)
      setDebouncedSearch(nextSearch.trim())
      setActiveTag(nextTag)
      setPriceFilter(nextPriceFilter)
    } catch {
      setSearchQuery('')
      setDebouncedSearch('')
      setActiveTag('All')
      setPriceFilter(null)
    }
  }, [discoverStateKey])

  useEffect(() => {
    try {
      sessionStorage.setItem(discoverStateKey, JSON.stringify({ searchQuery, activeTag, priceFilter }))
    } catch {
      // ignore storage errors
    }
  }, [activeTag, discoverStateKey, priceFilter, searchQuery])

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
    if (priceFilter !== null) params.set('priceLevel', String(priceFilter))
    params.set('limit', '24')
    if (coords) {
      params.set('lat', String(coords.lat))
      params.set('lng', String(coords.lng))
    }
    const endpoint = coords ? '/api/places/nearby' : '/api/places'
    return `${endpoint}?${params}`
  }, [activeTag, coords, debouncedSearch, priceFilter])

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

  useEffect(() => {
    api
      .get<{ data: Recommendations }>('/api/users/recommendations?limit=6')
      .then((res) => setRecommendations(res.data))
      .catch(() => setRecommendations({ forYou: [], friendsLoved: [], trendingNow: [] }))
  }, [user?.id])

  useEffect(() => {
    setSuggestionsLoading(true)
    api
      .get<{ data: SuggestedUser[] }>('/api/users/suggestions?limit=6')
      .then((res) => setSuggestions(res.data))
      .catch(() => setSuggestions([]))
      .finally(() => setSuggestionsLoading(false))
  }, [user?.id])

  const activeCity = useMemo(() => {
    const fromRecommendations = [recommendations.forYou, recommendations.trendingNow, recommendations.friendsLoved]
      .flat()
      .map((place) => extractCityFromAddress(place.address))
      .find((city): city is string => !!city)
    if (fromRecommendations) return fromRecommendations
    return places
      .map((place) => extractCityFromAddress(place.address))
      .find((city): city is string => !!city) ?? null
  }, [places, recommendations])

  useEffect(() => {
    setLeaderboardLoading(true)
    const params = new URLSearchParams({ limit: '5' })
    if (activeCity) params.set('city', activeCity)
    api
      .get<{ data: LeaderboardUser[] }>(`/api/users/leaderboard?${params.toString()}`)
      .then((res) => setLeaderboard(res.data))
      .catch(() => setLeaderboard([]))
      .finally(() => setLeaderboardLoading(false))
  }, [activeCity, user?.id])

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

  const handleFollowSuggestion = async (targetUserId: string) => {
    if (followPendingId) return
    setFollowPendingId(targetUserId)
    try {
      await api.post(`/api/users/${targetUserId}/follow`)
      setSuggestions((prev) => prev.filter((userRow) => userRow.id !== targetUserId))
    } finally {
      setFollowPendingId(null)
    }
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

  const applyPriceFilter = <T extends Place>(arr: T[]): T[] =>
    priceFilter === null ? arr : arr.filter((p) => p.priceLevel != null && Number(p.priceLevel) === priceFilter)

  const sortSearchResults = (arr: Place[]): Place[] => {
    if (searchSort === 'rating') return [...arr].sort((a, b) => b.avgRating - a.avgRating)
    if (searchSort === 'reviews') return [...arr].sort((a, b) => b.reviewCount - a.reviewCount)
    return arr
  }

  const fallbackForYou = recommendations.forYou.length > 0
    ? fillSection(recommendations.forYou, curated.topRated, 6)
    : curated.topRated
  const fallbackNearYou = fillSection(curated.nearYou, curated.trending, 6)

  const forYouPlaces = applyPriceFilter(fallbackForYou)
  const trendingPlaces = applyPriceFilter(recommendations.trendingNow.length > 0 ? recommendations.trendingNow : curated.trending)
  const friendsLovedPlaces = applyPriceFilter(recommendations.friendsLoved.length > 0 ? recommendations.friendsLoved : followingPicks)
  const nearYouPlaces = applyPriceFilter(fallbackNearYou)
  const searchResults = debouncedSearch ? sortSearchResults(applyPriceFilter(places)) : []
  const hasFeaturedResults =
    nearYouPlaces.length > 0 || forYouPlaces.length > 0 || trendingPlaces.length > 0 || friendsLovedPlaces.length > 0

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

        {/* Price level filter */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
          <span className="text-xs text-slate-400 shrink-0">Price:</span>
          {([null, 1, 2, 3, 4] as Array<number | null>).map((level) => (
            <button
              key={level ?? 'all'}
              onClick={() => setPriceFilter(level)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                priceFilter === level
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-300 hover:text-orange-500'
              }`}
            >
              {level === null ? 'Any' : ['$', '$$', '$$$', '$$$$'][level - 1]}
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
        <div className="space-y-12">
          {/* Search results mode */}
          {debouncedSearch && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-slate-900">
                  Results
                  {searchResults.length > 0 && (
                    <span className="text-slate-400 font-normal ml-2 text-base">({searchResults.length})</span>
                  )}
                </h2>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400 mr-1">Sort:</span>
                  {(['relevance', 'rating', 'reviews'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSearchSort(opt)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                        searchSort === opt ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-orange-500'
                      }`}
                    >
                      {opt === 'relevance' ? 'Relevance' : opt === 'rating' ? 'Rating' : 'Most Reviewed'}
                    </button>
                  ))}
                </div>
              </div>
              {searchResults.length === 0 ? (
                <p className="text-sm text-slate-500 py-10 text-center">No places match your search.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {searchResults.map((place) => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </div>
              )}
            </section>
          )}

          {!debouncedSearch && !hasFeaturedResults && (
            <div className="bg-white border border-slate-200 rounded-2xl px-6 py-12 text-center">
              <h2 className="text-lg font-semibold text-slate-900">No places found</h2>
              <p className="text-sm text-slate-500 mt-2">Try a different cuisine or clear the price filter.</p>
            </div>
          )}

          {!debouncedSearch && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  <h2 className="text-xl font-bold text-slate-900">Near You</h2>
                </div>
                <span className="text-sm text-slate-400">
                  {refreshing ? 'Refreshing...' : `${places.length} places`}
                </span>
              </div>
              {nearYouPlaces.length === 0 ? (
                <p className="text-sm text-slate-500 py-6">No places found.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {nearYouPlaces.map((place) => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </div>
              )}
            </section>
          )}

          {!debouncedSearch && forYouPlaces.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-slate-900">For You</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {forYouPlaces.map((place) => (
                  <PlaceCard key={place.id} place={place} recommendationReason={recommendationReasonFor(place)} />
                ))}
              </div>
            </section>
          )}

          {!debouncedSearch && trendingPlaces.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-slate-900">Trending Now</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {trendingPlaces.map((place) => (
                  <PlaceCard key={place.id} place={place} recommendationReason={recommendationReasonFor(place)} />
                ))}
              </div>
            </section>
          )}

          {/* Leaderboard strip — full width, horizontal */}
          {!debouncedSearch && (
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Top Foodies{activeCity ? ` in ${activeCity}` : ''}
                  </h2>
                </div>
                <Link to="/leaderboard" className="text-xs text-orange-500 hover:text-orange-600 font-semibold">
                  Full leaderboard →
                </Link>
              </div>
              {leaderboardLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                </div>
              ) : leaderboard.length === 0 ? (
                <p className="text-xs text-slate-400 text-center px-4 py-8">
                  No rankings yet — write the first review to claim the top spot!
                </p>
              ) : (
                <div className="flex overflow-x-auto scrollbar-hide gap-0 divide-x divide-slate-100">
                  {leaderboard.map((entry, index) => {
                    const topStat = entry.reviews > 0
                      ? `${entry.reviews} review${entry.reviews !== 1 ? 's' : ''}`
                      : entry.visits > 0
                      ? `${entry.visits} visit${entry.visits !== 1 ? 's' : ''}`
                      : entry.saves > 0
                      ? `${entry.saves} saved`
                      : 'New member'
                    return (
                      <Link
                        key={entry.userId}
                        to={`/users/${entry.userId}`}
                        className="flex flex-col items-center gap-2 px-6 py-5 hover:bg-slate-50 transition-colors shrink-0 min-w-[130px]"
                      >
                        <span className="text-lg">{index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`}</span>
                        <UserAvatar
                          name={entry.displayName}
                          avatarUrl={entry.avatarUrl}
                          className="w-11 h-11"
                          textClassName="text-sm"
                        />
                        <div className="text-center">
                          <p className="text-xs font-semibold text-slate-900 truncate max-w-[100px]">{entry.displayName}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{topStat}</p>
                          <p className="text-[11px] font-semibold text-orange-600">{entry.points} pts</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {!debouncedSearch && friendsLovedPlaces.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-slate-900">From People You Follow</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {friendsLovedPlaces.map((place) => (
                  <PlaceCard key={`follow-${place.id}`} place={place} recommendationReason={recommendationReasonFor(place)} />
                ))}
              </div>
            </section>
          )}

          {/* People You May Know — horizontal row */}
          {!debouncedSearch && suggestions.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-900 mb-4">People You May Know</h2>
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
                {suggestions.map((suggestedUser) => (
                  <div key={suggestedUser.id} className="flex flex-col items-center gap-2 shrink-0 w-28">
                    <Link to={`/users/${suggestedUser.id}`}>
                      <UserAvatar
                        name={suggestedUser.displayName}
                        avatarUrl={suggestedUser.avatarUrl}
                        className="w-14 h-14"
                        textClassName="text-base"
                      />
                    </Link>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-slate-900 truncate w-full">{suggestedUser.displayName}</p>
                      <p className="text-[11px] text-slate-400">{suggestedUser.followerCount} followers</p>
                    </div>
                    <button
                      onClick={() => handleFollowSuggestion(suggestedUser.id)}
                      disabled={followPendingId === suggestedUser.id}
                      className="w-full inline-flex items-center justify-center gap-1 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-60 px-2 py-1.5 rounded-lg transition-colors"
                    >
                      {followPendingId === suggestedUser.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <UserPlus className="w-3 h-3" />
                      )}
                      Follow
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
