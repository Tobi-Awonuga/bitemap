import { Router } from 'express'
import { eq, count, sql, desc } from 'drizzle-orm'
import { db } from '../../db'
import { users, places, reviews, saves, visits } from '../../db/schema'
import { requireAuth, requireAdmin, AuthRequest } from '../../middleware/auth.middleware'

export const adminRouter = Router()

// All admin routes require authentication + admin role
adminRouter.use(requireAuth, requireAdmin)

// GET /api/admin/stats — dashboard stats
adminRouter.get('/stats', async (_req, res) => {
  const [[{ totalUsers }], [{ totalPlaces }], [{ totalReviews }], [{ totalSaves }], [{ totalVisits }]] =
    await Promise.all([
      db.select({ totalUsers: count() }).from(users),
      db.select({ totalPlaces: count() }).from(places),
      db.select({ totalReviews: count() }).from(reviews),
      db.select({ totalSaves: count() }).from(saves),
      db.select({ totalVisits: count() }).from(visits),
    ])

  const recentReviews = await db.query.reviews.findMany({
    with: { user: true, place: true },
    orderBy: (r, { desc }) => [desc(r.createdAt)],
    limit: 5,
  })

  res.json({
    totalUsers,
    totalPlaces,
    totalReviews,
    totalSaves,
    totalVisits,
    recentReviews: recentReviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt,
      user: { id: r.user.id, displayName: r.user.displayName },
      place: { id: r.place.id, name: r.place.name },
    })),
  })
})

// GET /api/admin/users — all users
adminRouter.get('/users', async (_req, res) => {
  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      role: users.role,
      createdAt: users.createdAt,
      saveCount: sql<number>`COUNT(DISTINCT ${saves.id})`.as('save_count'),
      visitCount: sql<number>`COUNT(DISTINCT ${visits.id})`.as('visit_count'),
      reviewCount: sql<number>`COUNT(DISTINCT ${reviews.id})`.as('review_count'),
    })
    .from(users)
    .leftJoin(saves, eq(saves.userId, users.id))
    .leftJoin(visits, eq(visits.userId, users.id))
    .leftJoin(reviews, eq(reviews.userId, users.id))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt))

  res.json(allUsers)
})

// PATCH /api/admin/users/:id — update user role
adminRouter.patch('/users/:id', async (req: AuthRequest, res) => {
  const userId = String(req.params.id)
  const { role } = req.body

  if (!['user', 'admin'].includes(role)) {
    res.status(400).json({ error: 'Invalid role' })
    return
  }

  const [updated] = await db
    .update(users)
    .set({ role })
    .where(eq(users.id, userId))
    .returning({ id: users.id, email: users.email, displayName: users.displayName, role: users.role })

  if (!updated) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  res.json(updated)
})

// DELETE /api/admin/users/:id — remove user
adminRouter.delete('/users/:id', async (req: AuthRequest, res) => {
  const userId = String(req.params.id)

  // Prevent deleting yourself
  if (userId === req.user!.id) {
    res.status(400).json({ error: 'Cannot delete your own account' })
    return
  }

  const [deleted] = await db.delete(users).where(eq(users.id, userId)).returning()

  if (!deleted) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  res.status(204).send()
})

// GET /api/admin/places — all places with stats
adminRouter.get('/places', async (_req, res) => {
  const allPlaces = await db
    .select({
      id: places.id,
      name: places.name,
      cuisine: places.cuisine,
      address: places.address,
      latitude: places.latitude,
      longitude: places.longitude,
      priceLevel: places.priceLevel,
      imageUrl: places.imageUrl,
      createdAt: places.createdAt,
      avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`.as('avg_rating'),
      reviewCount: sql<number>`COUNT(DISTINCT ${reviews.id})`.as('review_count'),
      saveCount: sql<number>`COUNT(DISTINCT ${saves.id})`.as('save_count'),
    })
    .from(places)
    .leftJoin(reviews, eq(reviews.placeId, places.id))
    .leftJoin(saves, eq(saves.placeId, places.id))
    .groupBy(places.id)
    .orderBy(desc(places.createdAt))

  res.json(allPlaces)
})

// DELETE /api/admin/places/:id
adminRouter.delete('/places/:id', async (req: AuthRequest, res) => {
  const placeId = String(req.params.id)
  const [deleted] = await db.delete(places).where(eq(places.id, placeId)).returning()

  if (!deleted) {
    res.status(404).json({ error: 'Place not found' })
    return
  }

  res.status(204).send()
})

// GET /api/admin/reviews — all reviews
adminRouter.get('/reviews', async (_req, res) => {
  const allReviews = await db.query.reviews.findMany({
    with: { user: true, place: true },
    orderBy: (r, { desc }) => [desc(r.createdAt)],
  })

  res.json(
    allReviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt,
      user: { id: r.user.id, displayName: r.user.displayName, email: r.user.email },
      place: { id: r.place.id, name: r.place.name, address: r.place.address },
    })),
  )
})

// DELETE /api/admin/reviews/:id
adminRouter.delete('/reviews/:id', async (req: AuthRequest, res) => {
  const reviewId = String(req.params.id)
  const [deleted] = await db.delete(reviews).where(eq(reviews.id, reviewId)).returning()

  if (!deleted) {
    res.status(404).json({ error: 'Review not found' })
    return
  }

  res.status(204).send()
})
