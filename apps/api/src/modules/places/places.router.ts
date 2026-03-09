import { Router } from 'express'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '../../db'
import { places, reviews, reviewHelpfulVotes, reviewReports, saves, visits } from '../../db/schema'
import { requireAuth, requireAdmin, type AuthRequest } from '../../middleware/auth.middleware'
import { placeAdminUpdateSchema, placeSchema } from '@bitemap/shared'

export const placesRouter = Router()

type ListQuery = {
  q?: string
  lat?: number
  lng?: number
  priceLevel?: number
  radiusKm: number
  limit: number
  offset: number
}

type PlaceListRow = {
  id: string
  name: string
  cuisine: string | null
  description: string | null
  address: string
  latitude: number
  longitude: number
  priceLevel: number | null
  imageUrl: string | null
  googlePlaceId: string | null
  isActive?: boolean
  status?: 'active' | 'closed' | 'superseded'
  createdAt: Date
  avgRating: number
  reviewCount: number
  isSaved?: boolean
  isVisited?: boolean
  visitId?: string | null
}

type NearbyCacheEntry = {
  expiresAt: number
  data: PlaceListRow[]
}

type NearbyRateLimitEntry = {
  count: number
  resetAt: number
}

type GooglePlace = {
  id: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  rating?: number
  priceLevel?: number
  types?: string[]
  photos?: Array<{ name?: string }>
}

const FOOD_PLACE_TYPES = new Set([
  'restaurant',
  'cafe',
  'bar',
  'bakery',
  'meal_takeaway',
  'meal_delivery',
  'food',
])

const NON_FOOD_TYPES = new Set([
  'school',
  'veterinary_care',
  'pet_store',
  'gym',
  'hospital',
  'doctor',
  'shopping_mall',
  'car_dealer',
  'real_estate_agency',
  'lodging',
])

const CUISINE_TYPE_LABELS: Record<string, string> = {
  cafe: 'Cafe',
  coffee_shop: 'Cafe',
  bakery: 'Bakery',
  bar: 'Bar',
  meal_takeaway: 'Takeout',
  meal_delivery: 'Delivery',
}

const nearbyCache = new Map<string, NearbyCacheEntry>()
const nearbyRateLimit = new Map<string, NearbyRateLimitEntry>()
const PLACES_PROVIDER = (process.env.PLACES_PROVIDER ?? 'local').toLowerCase()
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? ''
const PLACES_CACHE_TTL_MS = Number(process.env.PLACES_CACHE_TTL_MS ?? 120000)
const PLACES_RATE_LIMIT_MAX = Number(process.env.PLACES_RATE_LIMIT_MAX ?? 60)
const PLACES_RATE_LIMIT_WINDOW_MS = 60 * 1000
const GOOGLE_PHOTO_PREFIX = 'gphoto:'

function nowMs(): number {
  return Date.now()
}

function getClientIp(req: AuthRequest): string {
  return req.ip || 'unknown'
}

function allowNearbyRequest(ip: string): boolean {
  const now = nowMs()
  const current = nearbyRateLimit.get(ip)
  if (!current || current.resetAt <= now) {
    nearbyRateLimit.set(ip, { count: 1, resetAt: now + PLACES_RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (current.count >= PLACES_RATE_LIMIT_MAX) return false
  current.count += 1
  nearbyRateLimit.set(ip, current)
  return true
}

function parseListQuery(query: Record<string, string | undefined>): ListQuery {
  const parsedLimit = Number.parseInt(query.limit ?? '50', 10)
  const parsedOffset = Number.parseInt(query.offset ?? '0', 10)
  const parsedRadius = Number.parseFloat(query.radius ?? '10')
  const parsedLat = query.lat !== undefined ? Number.parseFloat(query.lat) : undefined
  const parsedLng = query.lng !== undefined ? Number.parseFloat(query.lng) : undefined
  const parsedPriceLevel = query.priceLevel !== undefined ? Number.parseInt(query.priceLevel, 10) : undefined

  return {
    q: query.q?.trim() || undefined,
    lat: Number.isFinite(parsedLat) ? parsedLat : undefined,
    lng: Number.isFinite(parsedLng) ? parsedLng : undefined,
    priceLevel:
      Number.isFinite(parsedPriceLevel) && parsedPriceLevel! >= 1 && parsedPriceLevel! <= 4
        ? parsedPriceLevel
        : undefined,
    radiusKm: Number.isFinite(parsedRadius) ? Math.max(parsedRadius, 0.1) : 10,
    limit: Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50,
    offset: Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0,
  }
}

// Haversine distance in km
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function inferCuisine(types: string[] | undefined): string | null {
  if (!types || types.length === 0) return null
  const restaurantCuisine = types
    .filter((type) => type.endsWith('_restaurant'))
    .map((type) => type.replace(/_restaurant$/, '').replace(/_/g, ' '))
    .find((type) => type !== 'restaurant')
  if (restaurantCuisine) {
    return restaurantCuisine
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  const preferredTypeOrder = ['cafe', 'coffee_shop', 'bakery', 'bar', 'meal_takeaway', 'meal_delivery']
  for (const type of preferredTypeOrder) {
    if (!types.includes(type)) continue
    const mapped = CUISINE_TYPE_LABELS[type]
    if (mapped) return mapped
  }

  return null
}

function buildTextQuery(rawQuery: string | undefined): string {
  if (!rawQuery) return 'restaurants'
  const query = rawQuery.trim()
  if (query.length < 2) return 'restaurants'
  const lower = query.toLowerCase()

  // Preserve direct venue-name and cafe searches as typed.
  if (lower.includes('cafe') || lower.includes('coffee')) return query
  return `${query} restaurants`
}

function normalizePriceLevel(priceLevel: number | undefined): number | null {
  if (!Number.isFinite(priceLevel)) return null
  if (priceLevel! <= 0) return 1
  if (priceLevel! > 4) return 4
  return Math.round(priceLevel!)
}

function activePlaceFilter() {
  return and(eq(places.isActive, true), eq(places.status, 'active'))
}

function isFoodPlace(types: string[] | undefined): boolean {
  if (!types || types.length === 0) return false
  const includesFoodType = types.some((type) => FOOD_PLACE_TYPES.has(type))
  const includesBlockedType = types.some((type) => NON_FOOD_TYPES.has(type))
  return includesFoodType && !includesBlockedType
}

function serializeImageUrl(placeId: string, imageUrl: string | null): string | null {
  if (!imageUrl) return null
  if (imageUrl.startsWith(GOOGLE_PHOTO_PREFIX)) {
    return `/api/places/${placeId}/image`
  }
  return imageUrl
}

function buildPhotoProxyUrl(placeId: string, photoName: string): string {
  return `/api/places/${placeId}/image?photo=${encodeURIComponent(photoName)}`
}

function serializePlaceRow(row: PlaceListRow): PlaceListRow {
  return {
    ...row,
    imageUrl: serializeImageUrl(row.id, row.imageUrl),
  }
}

function extractCityRegionFromAddress(address: string | null | undefined): string | null {
  if (!address) return null
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return null

  const countryTokens = new Set(['canada', 'united states', 'usa'])
  const provinceOrPostal = /^[A-Z]{2}(?:\s+[A-Z]\d[A-Z]\s?\d[A-Z]\d)?$/i
  let city: string | null = null

  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i]
    const lower = part.toLowerCase()
    if (countryTokens.has(lower)) continue
    if (provinceOrPostal.test(part)) continue
    if (/\d/.test(part)) continue
    if (part.length < 2) continue
    city = part
    break
  }

  if (!city) return null
  const regionMatch = address.match(/\b([A-Z]{2})\b/)
  return regionMatch ? `${city}, ${regionMatch[1]}` : city
}

async function reverseGeocodeLabel(lat: number, lng: number): Promise<string | null> {
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=locality|administrative_area_level_1&key=${GOOGLE_MAPS_API_KEY}`,
      )
      if (response.ok) {
        const payload = (await response.json()) as {
          results?: Array<{
            address_components?: Array<{ long_name?: string; short_name?: string; types?: string[] }>
          }>
        }
        const components = payload.results?.[0]?.address_components ?? []
        const city =
          components.find((component) => component.types?.includes('locality'))?.long_name ??
          components.find((component) => component.types?.includes('administrative_area_level_2'))?.long_name
        const region = components.find((component) => component.types?.includes('administrative_area_level_1'))?.short_name
        if (city && region) return `${city}, ${region}`
        if (city) return city
      }
    } catch {
      // Fall through to nearest-place inference.
    }
  }

  const nearestPlace = await db.query.places.findMany({
    columns: { address: true, latitude: true, longitude: true },
    limit: 100,
  })

  let bestAddress: string | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const place of nearestPlace) {
    const distance = haversine(lat, lng, place.latitude, place.longitude)
    if (distance < bestDistance) {
      bestDistance = distance
      bestAddress = place.address
    }
  }

  return extractCityRegionFromAddress(bestAddress)
}

async function getLocalPlaces(parsed: ListQuery): Promise<PlaceListRow[]> {
  const rows = await db
    .select({
      id: places.id,
      name: places.name,
      cuisine: places.cuisine,
      description: places.description,
      address: places.address,
      latitude: places.latitude,
      longitude: places.longitude,
      priceLevel: places.priceLevel,
      imageUrl: places.imageUrl,
      googlePlaceId: places.googlePlaceId,
      isActive: places.isActive,
      status: places.status,
      createdAt: places.createdAt,
      avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`.as('avg_rating'),
      reviewCount: sql<number>`COUNT(DISTINCT ${reviews.id})`.as('review_count'),
    })
    .from(places)
    .where(activePlaceFilter())
    .leftJoin(reviews, eq(reviews.placeId, places.id))
    .groupBy(places.id)
    .limit(parsed.limit)
    .offset(parsed.offset)

  let filtered = rows
  if (parsed.q) {
    const lower = parsed.q.toLowerCase()
    filtered = filtered.filter(
      (place) =>
        place.name.toLowerCase().includes(lower) ||
        (place.cuisine?.toLowerCase().includes(lower) ?? false) ||
        place.address.toLowerCase().includes(lower),
    )
  }
  if (parsed.priceLevel !== undefined) {
    filtered = filtered.filter((place) => Number(place.priceLevel) === parsed.priceLevel)
  }

  if (parsed.lat !== undefined && parsed.lng !== undefined) {
    filtered = filtered
      .filter((place) => haversine(parsed.lat!, parsed.lng!, place.latitude, place.longitude) <= parsed.radiusKm)
      .sort(
        (a, b) =>
          haversine(parsed.lat!, parsed.lng!, a.latitude, a.longitude) -
          haversine(parsed.lat!, parsed.lng!, b.latitude, b.longitude),
      )
  } else {
    filtered.sort((a, b) => (Number(b.avgRating) ?? 0) - (Number(a.avgRating) ?? 0))
  }

  return filtered.map((row) =>
    serializePlaceRow({
      ...row,
      avgRating: Number(row.avgRating),
      reviewCount: Number(row.reviewCount),
    }),
  )
}

async function decoratePlaceState(rows: PlaceListRow[], userId: string): Promise<PlaceListRow[]> {
  if (rows.length === 0) return rows
  const placeIds = rows.map((row) => row.id)

  const [savedRows, visitedRows] = await Promise.all([
    db.query.saves.findMany({
      where: and(eq(saves.userId, userId), inArray(saves.placeId, placeIds)),
      columns: { placeId: true },
    }),
    db.query.visits.findMany({
      where: and(eq(visits.userId, userId), inArray(visits.placeId, placeIds)),
      columns: { placeId: true, id: true },
      orderBy: (table) => [desc(table.visitedAt)],
    }),
  ])

  const savedSet = new Set(savedRows.map((row) => row.placeId))
  const visitMap = new Map<string, string>()
  for (const row of visitedRows) {
    if (!visitMap.has(row.placeId)) visitMap.set(row.placeId, row.id)
  }

  return rows.map((row) =>
    serializePlaceRow({
      ...row,
      isSaved: savedSet.has(row.id),
      isVisited: visitMap.has(row.id),
      visitId: visitMap.get(row.id) ?? null,
    }),
  )
}

async function fetchGoogleNearby(parsed: ListQuery, userId: string): Promise<PlaceListRow[] | null> {
  if (PLACES_PROVIDER !== 'google' || !GOOGLE_MAPS_API_KEY) return null
  if (parsed.lat === undefined || parsed.lng === undefined) return null

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.types,places.photos',
    },
    body: JSON.stringify({
      textQuery: buildTextQuery(parsed.q),
      pageSize: parsed.limit,
      locationBias: {
        circle: {
          center: { latitude: parsed.lat, longitude: parsed.lng },
          radius: Math.round(parsed.radiusKm * 1000),
        },
      },
      rankPreference: 'DISTANCE',
    }),
  })

  if (!response.ok) {
    throw new Error(`Places provider failed: HTTP ${response.status}`)
  }

  const body = (await response.json()) as { places?: GooglePlace[] }
  const providerPlaces = (body.places ?? []).filter(
    (place): place is GooglePlace =>
      !!place.id &&
      !!place.displayName?.text &&
      !!place.formattedAddress &&
      Number.isFinite(place.location?.latitude) &&
      Number.isFinite(place.location?.longitude) &&
      isFoodPlace(place.types),
  )

  if (providerPlaces.length === 0) return []

  const upsertedRows: PlaceListRow[] = []
  for (const providerPlace of providerPlaces) {
    const normalizedPriceLevel = normalizePriceLevel(providerPlace.priceLevel)
    const primaryPhotoName = providerPlace.photos?.find((photo) => !!photo.name)?.name
    const providerImageUrl = primaryPhotoName ? `${GOOGLE_PHOTO_PREFIX}${primaryPhotoName}` : null
    const updateSet: Partial<typeof places.$inferInsert> = {
      name: providerPlace.displayName!.text!,
      address: providerPlace.formattedAddress!,
      latitude: providerPlace.location!.latitude!,
      longitude: providerPlace.location!.longitude!,
      cuisine: inferCuisine(providerPlace.types),
      source: 'google',
      providerLastSeenAt: new Date(),
      ...(normalizedPriceLevel ? { priceLevel: normalizedPriceLevel } : {}),
    }
    if (providerImageUrl) {
      updateSet.imageUrl = providerImageUrl
    }

    const [upserted] = await db
      .insert(places)
      .values({
        name: providerPlace.displayName!.text!,
        address: providerPlace.formattedAddress!,
        latitude: providerPlace.location!.latitude!,
        longitude: providerPlace.location!.longitude!,
        googlePlaceId: providerPlace.id,
        cuisine: inferCuisine(providerPlace.types),
        priceLevel: normalizedPriceLevel,
        imageUrl: providerImageUrl,
        source: 'google',
        providerLastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: places.googlePlaceId,
        set: updateSet,
      })
      .returning({
        id: places.id,
        name: places.name,
        cuisine: places.cuisine,
        description: places.description,
        address: places.address,
        latitude: places.latitude,
        longitude: places.longitude,
        priceLevel: places.priceLevel,
        imageUrl: places.imageUrl,
        googlePlaceId: places.googlePlaceId,
        isActive: places.isActive,
        status: places.status,
        createdAt: places.createdAt,
      })

    upsertedRows.push(
      serializePlaceRow({
        ...upserted,
        avgRating: providerPlace.rating ?? 0,
        reviewCount: 0,
      }),
    )
  }

  const filteredRows =
    parsed.priceLevel !== undefined
      ? upsertedRows.filter((row) => Number(row.priceLevel) === parsed.priceLevel)
      : upsertedRows

  return decoratePlaceState(
    filteredRows.filter((row) => row.isActive !== false && row.status !== 'closed' && row.status !== 'superseded'),
    userId,
  )
}

// GET /api/places â€” list with optional search + geo filter
placesRouter.get('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = parseListQuery(req.query as Record<string, string>)

  if ((req.query.lat && parsed.lat === undefined) || (req.query.lng && parsed.lng === undefined)) {
    res.status(400).json({ error: 'lat and lng must be valid numbers' })
    return
  }

  const rows = await getLocalPlaces(parsed)
  res.json(rows)
})

// GET /api/places/nearby — provider-backed nearby places with local fallback
placesRouter.get('/nearby', requireAuth, async (req: AuthRequest, res) => {
  const parsed = parseListQuery(req.query as Record<string, string>)
  if (parsed.lat === undefined || parsed.lng === undefined) {
    res.status(400).json({ error: 'lat and lng are required' })
    return
  }

  const ip = getClientIp(req)
  if (!allowNearbyRequest(ip)) {
    res.status(429).json({ error: 'Too many nearby place requests. Try again shortly.' })
    return
  }

  const cacheKey = JSON.stringify({
    userId: req.user!.id,
    q: parsed.q ?? '',
    priceLevel: parsed.priceLevel ?? null,
    lat: parsed.lat,
    lng: parsed.lng,
    radiusKm: parsed.radiusKm,
    limit: parsed.limit,
    offset: parsed.offset,
  })
  const cached = nearbyCache.get(cacheKey)
  if (cached && cached.expiresAt > nowMs()) {
    res.json(cached.data)
    return
  }

  let rows: PlaceListRow[]
  try {
    const providerRows = await fetchGoogleNearby(parsed, req.user!.id)
    rows = providerRows ?? (await getLocalPlaces(parsed))
  } catch {
    rows = await getLocalPlaces(parsed)
  }

  nearbyCache.set(cacheKey, {
    expiresAt: nowMs() + PLACES_CACHE_TTL_MS,
    data: rows,
  })
  res.json(rows)
})

// GET /api/places/reverse-geocode?lat=..&lng=..
placesRouter.get('/reverse-geocode', requireAuth, async (req: AuthRequest, res) => {
  const lat = Number.parseFloat(String(req.query.lat ?? ''))
  const lng = Number.parseFloat(String(req.query.lng ?? ''))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: 'lat and lng are required' })
    return
  }

  const label = await reverseGeocodeLabel(lat, lng)
  res.json({ data: { cityLabel: label } })
})

// GET /api/places/:id/photos - best-effort place photo gallery list
placesRouter.get('/:id/photos', requireAuth, async (req: AuthRequest, res) => {
  const placeId = String(req.params.id)
  const place = await db.query.places.findFirst({
    where: eq(places.id, placeId),
    columns: { googlePlaceId: true, imageUrl: true },
  })

  if (!place) {
    res.status(404).json({ error: 'Place not found' })
    return
  }

  const fallback = serializeImageUrl(placeId, place.imageUrl)
  if (!GOOGLE_MAPS_API_KEY || !place.googlePlaceId) {
    res.json({ data: fallback ? [fallback] : [] })
    return
  }

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${place.googlePlaceId}`, {
      headers: {
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'photos',
      },
    })
    if (!response.ok) {
      res.json({ data: fallback ? [fallback] : [] })
      return
    }
    const payload = (await response.json()) as { photos?: Array<{ name?: string }> }
    const photoUrls = (payload.photos ?? [])
      .map((photo) => photo.name)
      .filter((name): name is string => !!name)
      .slice(0, 8)
      .map((name) => buildPhotoProxyUrl(placeId, name))

    if (photoUrls.length === 0 && fallback) {
      res.json({ data: [fallback] })
      return
    }
    res.json({ data: photoUrls })
  } catch {
    res.json({ data: fallback ? [fallback] : [] })
  }
})

// GET /api/places/:id/image - proxy Google photo resources so API keys are never exposed to the client
placesRouter.get('/:id/image', async (req, res) => {
  const placeId = String(req.params.id)
  const place = await db.query.places.findFirst({
    where: eq(places.id, placeId),
    columns: { imageUrl: true },
  })

  const requestedPhoto = typeof req.query.photo === 'string' ? req.query.photo : null
  if (!place?.imageUrl && !requestedPhoto) {
    res.status(404).json({ error: 'Image not found' })
    return
  }

  const storedImageUrl = place?.imageUrl ?? null
  if (!requestedPhoto && storedImageUrl && !storedImageUrl.startsWith(GOOGLE_PHOTO_PREFIX)) {
    res.redirect(storedImageUrl)
    return
  }

  if (!GOOGLE_MAPS_API_KEY) {
    res.status(503).json({ error: 'Image provider unavailable' })
    return
  }

  const photoName = requestedPhoto || (storedImageUrl ? storedImageUrl.slice(GOOGLE_PHOTO_PREFIX.length) : '')
  if (!photoName) {
    res.status(404).json({ error: 'Image not found' })
    return
  }
  if (!photoName.startsWith('places/')) {
    res.status(400).json({ error: 'Invalid photo reference' })
    return
  }

  const response = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=480&key=${GOOGLE_MAPS_API_KEY}`,
  )

  if (!response.ok) {
    res.status(404).json({ error: 'Image not found' })
    return
  }

  const contentType = response.headers.get('content-type') ?? 'image/jpeg'
  const imageData = Buffer.from(await response.arrayBuffer())
  res.setHeader('Cache-Control', 'public, max-age=900')
  res.setHeader('Content-Type', contentType)
  res.status(200).send(imageData)
})
// GET /api/places/:id — single place with review stats + user context
placesRouter.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  const placeId = String(req.params.id)
  const userId = req.user!.id

  const place = await db.query.places.findFirst({
    where: eq(places.id, placeId),
  })

  if (!place) {
    res.status(404).json({ error: 'Place not found' })
    return
  }

  const [stats] = await db
    .select({
      avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
      reviewCount: sql<number>`COUNT(DISTINCT ${reviews.id})`,
    })
    .from(reviews)
    .where(eq(reviews.placeId, placeId))

  const placeReviews = await db.query.reviews.findMany({
    where: eq(reviews.placeId, placeId),
    with: { user: true },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  })
  const reviewIds = placeReviews.map((review) => review.id)

  const [helpfulCounts, myHelpfulVotes, myReports] = await Promise.all([
    reviewIds.length
      ? db
          .select({
            reviewId: reviewHelpfulVotes.reviewId,
            count: sql<number>`COUNT(*)`.as('count'),
          })
          .from(reviewHelpfulVotes)
          .where(inArray(reviewHelpfulVotes.reviewId, reviewIds))
          .groupBy(reviewHelpfulVotes.reviewId)
      : Promise.resolve([]),
    reviewIds.length
      ? db.query.reviewHelpfulVotes.findMany({
          where: and(eq(reviewHelpfulVotes.userId, userId), inArray(reviewHelpfulVotes.reviewId, reviewIds)),
          columns: { reviewId: true },
        })
      : Promise.resolve([]),
    reviewIds.length
      ? db.query.reviewReports.findMany({
          where: and(eq(reviewReports.reporterUserId, userId), inArray(reviewReports.reviewId, reviewIds)),
          columns: { reviewId: true },
        })
      : Promise.resolve([]),
  ])

  const helpfulCountMap = new Map(helpfulCounts.map((row) => [row.reviewId, Number(row.count)]))
  const myHelpfulSet = new Set(myHelpfulVotes.map((row) => row.reviewId))
  const myReportedSet = new Set(myReports.map((row) => row.reviewId))

  const saved = await db.query.saves.findFirst({
    where: and(eq(saves.userId, userId), eq(saves.placeId, placeId)),
  })

  const visit = await db.query.visits.findFirst({
    where: and(eq(visits.userId, userId), eq(visits.placeId, placeId)),
  })

  const userReview = await db.query.reviews.findFirst({
    where: and(eq(reviews.userId, userId), eq(reviews.placeId, placeId)),
  })

  res.json({
    ...place,
    imageUrl: serializeImageUrl(place.id, place.imageUrl),
    avgRating: Number(stats?.avgRating ?? 0),
    reviewCount: Number(stats?.reviewCount ?? 0),
    isSaved: !!saved,
    isVisited: !!visit,
    visitId: visit?.id ?? null,
    userReview: userReview ?? null,
    reviews: placeReviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      body: review.body,
      createdAt: review.createdAt,
      helpfulCount: helpfulCountMap.get(review.id) ?? 0,
      isHelpfulByMe: myHelpfulSet.has(review.id),
      isReportedByMe: myReportedSet.has(review.id),
      user: {
        id: review.user.id,
        displayName: review.user.displayName,
        avatarUrl: review.user.avatarUrl,
      },
    })),
  })
})

// POST /api/places — admin only
placesRouter.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const parsed = placeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }

  const [place] = await db.insert(places).values({ ...parsed.data, source: 'manual' }).returning()
  res.status(201).json(place)
})

// PATCH /api/places/:id — admin only
placesRouter.patch('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const placeId = String(req.params.id)
  const parsed = placeAdminUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }

  const nextValues = parsed.data
  const updatePayload: Partial<typeof places.$inferInsert> = {
    ...(nextValues.name !== undefined ? { name: nextValues.name } : {}),
    ...(nextValues.cuisine !== undefined ? { cuisine: nextValues.cuisine } : {}),
    ...(nextValues.description !== undefined ? { description: nextValues.description } : {}),
    ...(nextValues.address !== undefined ? { address: nextValues.address } : {}),
    ...(nextValues.latitude !== undefined ? { latitude: nextValues.latitude } : {}),
    ...(nextValues.longitude !== undefined ? { longitude: nextValues.longitude } : {}),
    ...(nextValues.priceLevel !== undefined ? { priceLevel: nextValues.priceLevel } : {}),
    ...(nextValues.imageUrl !== undefined ? { imageUrl: nextValues.imageUrl } : {}),
    ...(nextValues.googlePlaceId !== undefined ? { googlePlaceId: nextValues.googlePlaceId } : {}),
    ...(nextValues.isActive !== undefined ? { isActive: nextValues.isActive } : {}),
    ...(nextValues.status !== undefined ? { status: nextValues.status } : {}),
    ...(nextValues.source !== undefined ? { source: nextValues.source } : {}),
    ...(nextValues.supersededByPlaceId !== undefined ? { supersededByPlaceId: nextValues.supersededByPlaceId } : {}),
    ...(nextValues.providerLastSeenAt !== undefined
      ? { providerLastSeenAt: nextValues.providerLastSeenAt ? new Date(nextValues.providerLastSeenAt) : null }
      : {}),
  }

  if (nextValues.status !== undefined || nextValues.isActive !== undefined) {
    const nextStatus = nextValues.status
    const nextIsActive = nextValues.isActive

    if (nextStatus === 'active') {
      updatePayload.closedAt = null
      if (nextIsActive === undefined) updatePayload.isActive = true
    } else if (nextStatus === 'closed' || nextStatus === 'superseded') {
      updatePayload.closedAt = new Date()
      if (nextIsActive === undefined) updatePayload.isActive = false
    }

    if (nextIsActive === false && nextValues.status === undefined) {
      updatePayload.closedAt = new Date()
      if (updatePayload.status === undefined) updatePayload.status = 'closed'
    }

    if (nextIsActive === true && nextValues.status === undefined) {
      updatePayload.closedAt = null
      if (updatePayload.status === undefined) updatePayload.status = 'active'
    }
  }

  if (updatePayload.status === 'superseded' && !updatePayload.supersededByPlaceId) {
    res.status(400).json({ error: 'supersededByPlaceId is required when status is superseded' })
    return
  }

  const [updated] = await db
    .update(places)
    .set(updatePayload)
    .where(eq(places.id, placeId))
    .returning()

  if (!updated) {
    res.status(404).json({ error: 'Place not found' })
    return
  }

  res.json(updated)
})

// DELETE /api/places/:id — admin only
placesRouter.delete('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const placeId = String(req.params.id)
  const [deleted] = await db.delete(places).where(eq(places.id, placeId)).returning()

  if (!deleted) {
    res.status(404).json({ error: 'Place not found' })
    return
  }

  res.status(204).send()
})
