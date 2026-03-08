import { Router } from 'express'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '../../db'
import { places, reviews, saves, visits } from '../../db/schema'
import { requireAuth, requireAdmin, type AuthRequest } from '../../middleware/auth.middleware'
import { placeSchema } from '@bitemap/shared'

export const placesRouter = Router()

type ListQuery = {
  q?: string
  lat?: number
  lng?: number
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

  return {
    q: query.q?.trim() || undefined,
    lat: Number.isFinite(parsedLat) ? parsedLat : undefined,
    lng: Number.isFinite(parsedLng) ? parsedLng : undefined,
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
  const candidates = types
    .filter((type) => type.endsWith('_restaurant'))
    .map((type) => type.replace(/_restaurant$/, '').replace(/_/g, ' '))
    .find((type) => type !== 'restaurant')
  if (!candidates) return null
  return candidates
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
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

function serializePlaceRow(row: PlaceListRow): PlaceListRow {
  return {
    ...row,
    imageUrl: serializeImageUrl(row.id, row.imageUrl),
  }
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
      createdAt: places.createdAt,
      avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`.as('avg_rating'),
      reviewCount: sql<number>`COUNT(DISTINCT ${reviews.id})`.as('review_count'),
    })
    .from(places)
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
        'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.types,places.photos',
    },
    body: JSON.stringify({
      textQuery: parsed.q ? `${parsed.q} restaurants` : 'restaurants',
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
    const primaryPhotoName = providerPlace.photos?.find((photo) => !!photo.name)?.name
    const providerImageUrl = primaryPhotoName ? `${GOOGLE_PHOTO_PREFIX}${primaryPhotoName}` : null
    const updateSet: Partial<typeof places.$inferInsert> = {
      name: providerPlace.displayName!.text!,
      address: providerPlace.formattedAddress!,
      latitude: providerPlace.location!.latitude!,
      longitude: providerPlace.location!.longitude!,
      cuisine: inferCuisine(providerPlace.types),
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
        imageUrl: providerImageUrl,
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

  return decoratePlaceState(upsertedRows, userId)
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

// GET /api/places/:id/image - proxy Google photo resources so API keys are never exposed to the client
placesRouter.get('/:id/image', async (req, res) => {
  const placeId = String(req.params.id)
  const place = await db.query.places.findFirst({
    where: eq(places.id, placeId),
    columns: { imageUrl: true },
  })

  if (!place?.imageUrl) {
    res.status(404).json({ error: 'Image not found' })
    return
  }

  if (!place.imageUrl.startsWith(GOOGLE_PHOTO_PREFIX)) {
    res.redirect(place.imageUrl)
    return
  }

  if (!GOOGLE_MAPS_API_KEY) {
    res.status(503).json({ error: 'Image provider unavailable' })
    return
  }

  const photoName = place.imageUrl.slice(GOOGLE_PHOTO_PREFIX.length)
  if (!photoName) {
    res.status(404).json({ error: 'Image not found' })
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

  const [place] = await db.insert(places).values(parsed.data).returning()
  res.status(201).json(place)
})

// PATCH /api/places/:id — admin only
placesRouter.patch('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const placeId = String(req.params.id)
  const [updated] = await db
    .update(places)
    .set(req.body)
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
