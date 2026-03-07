import { Router } from 'express'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '../../db'
import { places, reviews, saves, visits } from '../../db/schema'
import { requireAuth, requireAdmin, AuthRequest } from '../../middleware/auth.middleware'
import { placeSchema } from '@bitemap/shared'

export const placesRouter = Router()

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

// GET /api/places — list with optional search + geo filter
placesRouter.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { q, lat, lng, radius = '10', limit = '50', offset = '0' } = req.query as Record<string, string>

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
    .limit(parseInt(limit))
    .offset(parseInt(offset))

  let filtered = rows

  // Filter by text search
  if (q) {
    const lower = q.toLowerCase()
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        (p.cuisine?.toLowerCase().includes(lower) ?? false) ||
        p.address.toLowerCase().includes(lower),
    )
  }

  // Filter by geo proximity and sort by distance
  if (lat && lng) {
    const userLat = parseFloat(lat)
    const userLng = parseFloat(lng)
    const radiusKm = parseFloat(radius)
    filtered = filtered
      .filter((p) => haversine(userLat, userLng, p.latitude, p.longitude) <= radiusKm)
      .sort(
        (a, b) =>
          haversine(userLat, userLng, a.latitude, a.longitude) -
          haversine(userLat, userLng, b.latitude, b.longitude),
      )
  } else {
    filtered.sort((a, b) => (Number(b.avgRating) ?? 0) - (Number(a.avgRating) ?? 0))
  }

  res.json(filtered)
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
    orderBy: (r, { desc }) => [desc(r.createdAt)],
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
    avgRating: Number(stats?.avgRating ?? 0),
    reviewCount: Number(stats?.reviewCount ?? 0),
    isSaved: !!saved,
    isVisited: !!visit,
    visitId: visit?.id ?? null,
    userReview: userReview ?? null,
    reviews: placeReviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt,
      user: {
        id: r.user.id,
        displayName: r.user.displayName,
        avatarUrl: r.user.avatarUrl,
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
