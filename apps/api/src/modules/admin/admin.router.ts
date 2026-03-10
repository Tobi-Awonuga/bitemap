import { Router } from 'express'
import { eq, count, sql, desc, ilike, or, and } from 'drizzle-orm'
import { db } from '../../db'
import { users, places, reviewReports, reviews, saves, visits } from '../../db/schema'
import { requireAuth, requireAdmin, AuthRequest } from '../../middleware/auth.middleware'
import { fetchUserLeaderboard } from '../users/leaderboard.service'

export const adminRouter = Router()

// All admin routes require authentication + admin role
adminRouter.use(requireAuth, requireAdmin)

// GET /api/admin/stats — dashboard stats
adminRouter.get('/stats', async (_req, res) => {
  const [
    [{ totalUsers }],
    [{ totalPlaces }],
    [{ totalReviews }],
    [{ totalSaves }],
    [{ totalVisits }],
    [{ openReviewReports }],
    [{ deactivatedUsers }],
  ] =
    await Promise.all([
      db.select({ totalUsers: count() }).from(users),
      db.select({ totalPlaces: count() }).from(places),
      db.select({ totalReviews: count() }).from(reviews),
      db.select({ totalSaves: count() }).from(saves),
      db.select({ totalVisits: count() }).from(visits),
      db.select({ openReviewReports: count() }).from(reviewReports).where(eq(reviewReports.status, 'open')),
      db.select({ deactivatedUsers: count() }).from(users).where(eq(users.isActive, false)),
    ])

  const recentReviews = await db.query.reviews.findMany({
    with: { user: true, place: true },
    orderBy: (r, { desc }) => [desc(r.createdAt)],
    limit: 5,
  })

  res.json({
    totalUsers: Number(totalUsers),
    totalPlaces: Number(totalPlaces),
    totalReviews: Number(totalReviews),
    totalSaves: Number(totalSaves),
    totalVisits: Number(totalVisits),
    openReviewReports: Number(openReviewReports),
    deactivatedUsers: Number(deactivatedUsers),
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

// GET /api/admin/leaderboard?limit=10 - operational ranking of power users
adminRouter.get('/leaderboard', async (req, res) => {
  const limitRaw = Number.parseInt(String(req.query.limit ?? '10'), 10)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 25) : 10
  res.json(await fetchUserLeaderboard(limit))
})

// GET /api/admin/insights — ranked operational insights
adminRouter.get('/insights', async (_req, res) => {
  const savesCountExpr = sql<number>`COUNT(DISTINCT ${saves.id})`
  const placesCountExpr = sql<number>`COUNT(DISTINCT ${places.id})`

  const [topSavedPlaces, cuisineRows] = await Promise.all([
    db
      .select({
        id: places.id,
        name: places.name,
        cuisine: places.cuisine,
        saveCount: savesCountExpr.as('save_count'),
      })
      .from(places)
      .leftJoin(saves, eq(saves.placeId, places.id))
      .groupBy(places.id)
      .orderBy(desc(savesCountExpr), desc(places.createdAt))
      .limit(5),
    db
      .select({
        cuisine: places.cuisine,
        placeCount: placesCountExpr.as('place_count'),
        saveCount: savesCountExpr.as('save_count'),
      })
      .from(places)
      .leftJoin(saves, eq(saves.placeId, places.id))
      .where(sql`${places.cuisine} IS NOT NULL`)
      .groupBy(places.cuisine)
      .orderBy(desc(savesCountExpr), desc(placesCountExpr))
      .limit(6),
  ])

  res.json({
    topSavedPlaces: topSavedPlaces.map((place) => ({
      id: place.id,
      name: place.name,
      cuisine: place.cuisine,
      saveCount: Number(place.saveCount),
    })),
    topCuisines: cuisineRows
      .filter((row) => row.cuisine)
      .map((row) => ({
        cuisine: row.cuisine as string,
        placeCount: Number(row.placeCount),
        saveCount: Number(row.saveCount),
      })),
  })
})

// GET /api/admin/users — all users
adminRouter.get('/users', async (req, res) => {
  const limitRaw = Number.parseInt(String(req.query.limit ?? '25'), 10)
  const offsetRaw = Number.parseInt(String(req.query.offset ?? '0'), 10)
  const query = String(req.query.q ?? '').trim()
  const roleRaw = String(req.query.role ?? 'all')
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 25
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0
  const roleFilter = roleRaw === 'admin' || roleRaw === 'user' ? roleRaw : 'all'
  const whereClause = and(
    roleFilter === 'all' ? undefined : eq(users.role, roleFilter),
    query
      ? or(
          ilike(users.displayName, `%${query}%`),
          ilike(users.email, `%${query}%`),
        )
      : undefined,
  )

  const [allUsers, [{ total }]] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
        deactivatedAt: users.deactivatedAt,
        createdAt: users.createdAt,
        saveCount: sql<number>`COUNT(DISTINCT ${saves.id})`.as('save_count'),
        visitCount: sql<number>`COUNT(DISTINCT ${visits.id})`.as('visit_count'),
        reviewCount: sql<number>`COUNT(DISTINCT ${reviews.id})`.as('review_count'),
      })
      .from(users)
      .where(whereClause)
      .leftJoin(saves, eq(saves.userId, users.id))
      .leftJoin(visits, eq(visits.userId, users.id))
      .leftJoin(reviews, eq(reviews.userId, users.id))
      .groupBy(users.id)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(users).where(whereClause),
  ])

  res.json({
    data: allUsers.map((user) => ({
      ...user,
      saveCount: Number(user.saveCount),
      visitCount: Number(user.visitCount),
      reviewCount: Number(user.reviewCount),
    })),
    pagination: {
      total: Number(total),
      limit,
      offset,
      hasMore: offset + limit < Number(total),
    },
  })
})

// PATCH /api/admin/users/:id — update user role
adminRouter.patch('/users/:id', async (req: AuthRequest, res) => {
  const userId = String(req.params.id)
  const { role, isActive } = req.body

  if (role !== undefined && !['user', 'admin'].includes(role)) {
    res.status(400).json({ error: 'Invalid role' })
    return
  }
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    res.status(400).json({ error: 'Invalid isActive value' })
    return
  }
  if (userId === req.user!.id && isActive === false) {
    res.status(400).json({ error: 'Cannot deactivate your own account' })
    return
  }

  if (role === undefined && isActive === undefined) {
    res.status(400).json({ error: 'No valid fields to update' })
    return
  }

  const [updated] = await db
    .update(users)
    .set({
      ...(role !== undefined ? { role } : {}),
      ...(isActive !== undefined ? { isActive, deactivatedAt: isActive ? null : new Date() } : {}),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      isActive: users.isActive,
      deactivatedAt: users.deactivatedAt,
    })

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

// GET /api/admin/places?limit=25&offset=0 — paginated places with stats
adminRouter.get('/places', async (req, res) => {
  const limitRaw = Number.parseInt(String(req.query.limit ?? '25'), 10)
  const offsetRaw = Number.parseInt(String(req.query.offset ?? '0'), 10)
  const query = String(req.query.q ?? '').trim()
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 25
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0
  const whereClause = query
    ? or(
        ilike(places.name, `%${query}%`),
        ilike(places.address, `%${query}%`),
        sql`coalesce(${places.cuisine}, '') ilike ${`%${query}%`}`,
      )
    : undefined

  const [allPlaces, [{ total }]] = await Promise.all([
    db
      .select({
        id: places.id,
        name: places.name,
        cuisine: places.cuisine,
        address: places.address,
        latitude: places.latitude,
        longitude: places.longitude,
        priceLevel: places.priceLevel,
        imageUrl: places.imageUrl,
        isActive: places.isActive,
        status: places.status,
        closedAt: places.closedAt,
        supersededByPlaceId: places.supersededByPlaceId,
        source: places.source,
        providerLastSeenAt: places.providerLastSeenAt,
        createdAt: places.createdAt,
        avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`.as('avg_rating'),
        reviewCount: sql<number>`COUNT(DISTINCT ${reviews.id})`.as('review_count'),
        saveCount: sql<number>`COUNT(DISTINCT ${saves.id})`.as('save_count'),
      })
      .from(places)
      .where(whereClause)
      .leftJoin(reviews, eq(reviews.placeId, places.id))
      .leftJoin(saves, eq(saves.placeId, places.id))
      .groupBy(places.id)
      .orderBy(desc(places.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(places).where(whereClause),
  ])

  res.json({
    data: allPlaces.map((place) => ({
      ...place,
      avgRating: Number(place.avgRating),
      reviewCount: Number(place.reviewCount),
      saveCount: Number(place.saveCount),
    })),
    pagination: {
      total: Number(total),
      limit,
      offset,
      hasMore: offset + limit < Number(total),
    },
  })
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
adminRouter.get('/reviews', async (req, res) => {
  const limitRaw = Number.parseInt(String(req.query.limit ?? '25'), 10)
  const offsetRaw = Number.parseInt(String(req.query.offset ?? '0'), 10)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 25
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0

  const [allReviews, [{ total }]] = await Promise.all([
    db.query.reviews.findMany({
      with: { user: true, place: true },
      orderBy: (r, { desc: descOrder }) => [descOrder(r.createdAt)],
      limit,
      offset,
    }),
    db.select({ total: count() }).from(reviews),
  ])

  res.json({
    data: allReviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt,
      user: { id: r.user.id, displayName: r.user.displayName, email: r.user.email },
      place: { id: r.place.id, name: r.place.name, address: r.place.address },
    })),
    pagination: {
      total: Number(total),
      limit,
      offset,
      hasMore: offset + limit < Number(total),
    },
  })
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

// GET /api/admin/review-reports?status=open|resolved|dismissed
adminRouter.get('/review-reports', async (req, res) => {
  const statusRaw = String(req.query.status ?? 'open')
  const status = statusRaw === 'resolved' || statusRaw === 'dismissed' ? statusRaw : 'open'
  const limitRaw = Number.parseInt(String(req.query.limit ?? '25'), 10)
  const offsetRaw = Number.parseInt(String(req.query.offset ?? '0'), 10)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 25
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0

  const [reports, [{ total }]] = await Promise.all([
    db.query.reviewReports.findMany({
      where: eq(reviewReports.status, status),
      with: {
        reporter: { columns: { id: true, displayName: true, email: true } },
        resolver: { columns: { id: true, displayName: true, email: true } },
        review: {
          columns: { id: true, rating: true, body: true, createdAt: true },
          with: {
            user: { columns: { id: true, displayName: true, email: true } },
            place: { columns: { id: true, name: true, address: true } },
          },
        },
      },
      orderBy: (table, { desc: descOrder, asc }) => [
        status === 'open' ? asc(table.createdAt) : descOrder(table.createdAt),
      ],
      limit,
      offset,
    }),
    db.select({ total: count() }).from(reviewReports).where(eq(reviewReports.status, status)),
  ])

  res.json({
    data: reports.map((report) => ({
      id: report.id,
      reason: report.reason,
      details: report.details,
      status: report.status,
      createdAt: report.createdAt,
      resolvedAt: report.resolvedAt,
      reporter: report.reporter,
      resolver: report.resolver
        ? {
            id: report.resolver.id,
            displayName: report.resolver.displayName,
            email: report.resolver.email,
          }
        : null,
      review: {
        id: report.review.id,
        rating: report.review.rating,
        body: report.review.body,
        createdAt: report.review.createdAt,
        user: report.review.user,
        place: report.review.place,
      },
    })),
    pagination: {
      total: Number(total),
      limit,
      offset,
      hasMore: offset + limit < Number(total),
    },
  })
})

// PATCH /api/admin/review-reports/:id — resolve or dismiss a report
adminRouter.patch('/review-reports/:id', async (req: AuthRequest, res) => {
  const reportId = String(req.params.id)
  const status = req.body?.status

  if (status !== 'resolved' && status !== 'dismissed' && status !== 'open') {
    res.status(400).json({ error: 'Invalid status' })
    return
  }

  const [updated] = await db
    .update(reviewReports)
    .set({
      status,
      resolvedAt: status === 'open' ? null : new Date(),
      resolvedByUserId: status === 'open' ? null : req.user!.id,
    })
    .where(eq(reviewReports.id, reportId))
    .returning({
      id: reviewReports.id,
      status: reviewReports.status,
      resolvedAt: reviewReports.resolvedAt,
      resolvedByUserId: reviewReports.resolvedByUserId,
    })

  if (!updated) {
    res.status(404).json({ error: 'Review report not found' })
    return
  }

  res.json(updated)
})
