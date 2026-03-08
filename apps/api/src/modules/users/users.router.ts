import { Router } from 'express'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '../../db'
import { follows, places, reviews, saves, users, visits } from '../../db/schema'
import { requireAuth, type AuthRequest } from '../../middleware/auth.middleware'
import { createNotification } from '../notifications/notifications.service'

export const usersRouter = Router()
const GOOGLE_PHOTO_PREFIX = 'gphoto:'

function serializeImageUrl(placeId: string, imageUrl: string | null): string | null {
  if (!imageUrl) return null
  if (imageUrl.startsWith(GOOGLE_PHOTO_PREFIX)) {
    return `/api/places/${placeId}/image`
  }
  return imageUrl
}

async function getUserStats(userId: string) {
  const [saveCountRow, visitCountRow, reviewCountRow, followerCountRow, followingCountRow] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(saves).where(eq(saves.userId, userId)),
    db.select({ count: sql<number>`count(*)` }).from(visits).where(eq(visits.userId, userId)),
    db.select({ count: sql<number>`count(*)` }).from(reviews).where(eq(reviews.userId, userId)),
    db.select({ count: sql<number>`count(*)` }).from(follows).where(eq(follows.followingId, userId)),
    db.select({ count: sql<number>`count(*)` }).from(follows).where(eq(follows.followerId, userId)),
  ])

  return {
    saves: Number(saveCountRow[0]?.count ?? 0),
    visits: Number(visitCountRow[0]?.count ?? 0),
    reviews: Number(reviewCountRow[0]?.count ?? 0),
    followers: Number(followerCountRow[0]?.count ?? 0),
    following: Number(followingCountRow[0]?.count ?? 0),
  }
}

async function getPlaceReviewStats(placeIds: string[]) {
  if (placeIds.length === 0) return new Map<string, { avgRating: number; reviewCount: number }>()

  const rows = await db
    .select({
      placeId: reviews.placeId,
      avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`.as('avg_rating'),
      reviewCount: sql<number>`COUNT(*)`.as('review_count'),
    })
    .from(reviews)
    .where(inArray(reviews.placeId, placeIds))
    .groupBy(reviews.placeId)

  return new Map(
    rows.map((row) => [
      row.placeId,
      {
        avgRating: Number(row.avgRating),
        reviewCount: Number(row.reviewCount),
      },
    ]),
  )
}

type TasteVector = Map<string, number>

async function getTasteVector(userId: string): Promise<TasteVector> {
  const [reviewRows, visitRows] = await Promise.all([
    db
      .select({ cuisine: places.cuisine, rating: reviews.rating })
      .from(reviews)
      .innerJoin(places, eq(places.id, reviews.placeId))
      .where(eq(reviews.userId, userId)),
    db
      .select({ cuisine: places.cuisine })
      .from(visits)
      .innerJoin(places, eq(places.id, visits.placeId))
      .where(eq(visits.userId, userId)),
  ])

  const vector: TasteVector = new Map()
  for (const row of reviewRows) {
    if (!row.cuisine) continue
    const key = row.cuisine.toLowerCase()
    const current = vector.get(key) ?? 0
    vector.set(key, current + Number(row.rating))
  }
  for (const row of visitRows) {
    if (!row.cuisine) continue
    const key = row.cuisine.toLowerCase()
    const current = vector.get(key) ?? 0
    vector.set(key, current + 0.5)
  }
  return vector
}

function topTasteCuisines(vector: TasteVector, limit = 5): Array<{ cuisine: string; score: number }> {
  return Array.from(vector.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([cuisine, score]) => ({ cuisine, score: Number(score.toFixed(2)) }))
}

function tasteMatchPercent(a: TasteVector, b: TasteVector): number {
  if (a.size === 0 || b.size === 0) return 0
  const allKeys = new Set([...a.keys(), ...b.keys()])
  let dot = 0
  let magA = 0
  let magB = 0
  for (const key of allKeys) {
    const av = a.get(key) ?? 0
    const bv = b.get(key) ?? 0
    dot += av * bv
    magA += av * av
    magB += bv * bv
  }
  if (magA === 0 || magB === 0) return 0
  return Math.round((dot / (Math.sqrt(magA) * Math.sqrt(magB))) * 100)
}

type PlaceStatsRow = {
  id: string
  name: string
  cuisine: string | null
  address: string
  imageUrl: string | null
  avgRating: number
  reviewCount: number
}

async function getPlaceStats(limit = 300): Promise<PlaceStatsRow[]> {
  const rows = await db
    .select({
      id: places.id,
      name: places.name,
      cuisine: places.cuisine,
      address: places.address,
      imageUrl: places.imageUrl,
      avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`.as('avg_rating'),
      reviewCount: sql<number>`COUNT(DISTINCT ${reviews.id})`.as('review_count'),
    })
    .from(places)
    .leftJoin(reviews, eq(reviews.placeId, places.id))
    .groupBy(places.id)
    .orderBy(desc(places.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    ...row,
    imageUrl: serializeImageUrl(row.id, row.imageUrl),
    avgRating: Number(row.avgRating),
    reviewCount: Number(row.reviewCount),
  }))
}

// GET /api/users/me
usersRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, req.user!.id),
    columns: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
    },
  })

  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  res.json({ data: user })
})

// GET /api/users/me/stats
usersRouter.get('/me/stats', requireAuth, async (req: AuthRequest, res) => {
  const stats = await getUserStats(req.user!.id)
  res.json({ data: stats })
})

// GET /api/users/me/taste-profile
usersRouter.get('/me/taste-profile', requireAuth, async (req: AuthRequest, res) => {
  const vector = await getTasteVector(req.user!.id)
  res.json({
    data: {
      cuisines: topTasteCuisines(vector, 6),
      totalSignals: vector.size,
    },
  })
})

// GET /api/users/feed - recent activity from followed users
usersRouter.get('/feed', requireAuth, async (req: AuthRequest, res) => {
  const followingRows = await db.query.follows.findMany({
    where: eq(follows.followerId, req.user!.id),
    columns: { followingId: true },
  })
  const followingIds = followingRows.map((row) => row.followingId)
  if (followingIds.length === 0) {
    res.json({ data: [] })
    return
  }

  const [recentReviews, recentVisits] = await Promise.all([
    db.query.reviews.findMany({
      where: inArray(reviews.userId, followingIds),
      with: {
        user: { columns: { id: true, displayName: true, avatarUrl: true } },
        place: { columns: { id: true, name: true, cuisine: true, address: true, imageUrl: true } },
      },
      orderBy: (table) => [desc(table.createdAt)],
      limit: 25,
    }),
    db.query.visits.findMany({
      where: inArray(visits.userId, followingIds),
      with: {
        user: { columns: { id: true, displayName: true, avatarUrl: true } },
        place: { columns: { id: true, name: true, cuisine: true, address: true, imageUrl: true } },
      },
      orderBy: (table) => [desc(table.visitedAt)],
      limit: 25,
    }),
  ])

  const placeIds = Array.from(
    new Set([
      ...recentReviews.map((row) => row.place.id),
      ...recentVisits.map((row) => row.place.id),
    ]),
  )
  const placeStats = await getPlaceReviewStats(placeIds)

  const reviewItems = recentReviews.map((row) => ({
    type: 'review' as const,
    id: row.id,
    createdAt: row.createdAt,
    user: row.user,
    place: {
      ...row.place,
      imageUrl: serializeImageUrl(row.place.id, row.place.imageUrl),
      avgRating: placeStats.get(row.place.id)?.avgRating ?? 0,
      reviewCount: placeStats.get(row.place.id)?.reviewCount ?? 0,
    },
    review: { rating: row.rating, body: row.body },
  }))

  const visitItems = recentVisits.map((row) => ({
    type: 'visit' as const,
    id: row.id,
    createdAt: row.visitedAt,
    user: row.user,
    place: {
      ...row.place,
      imageUrl: serializeImageUrl(row.place.id, row.place.imageUrl),
      avgRating: placeStats.get(row.place.id)?.avgRating ?? 0,
      reviewCount: placeStats.get(row.place.id)?.reviewCount ?? 0,
    },
  }))

  const merged = [...reviewItems, ...visitItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 40)

  res.json({ data: merged })
})

// GET /api/users/recommendations?limit=6
usersRouter.get('/recommendations', requireAuth, async (req: AuthRequest, res) => {
  const limitRaw = Number.parseInt(String(req.query.limit ?? '6'), 10)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 12) : 6

  const [statsRows, meTaste, followingRows] = await Promise.all([
    getPlaceStats(400),
    getTasteVector(req.user!.id),
    db.query.follows.findMany({
      where: eq(follows.followerId, req.user!.id),
      columns: { followingId: true },
    }),
  ])
  const statsById = new Map(statsRows.map((row) => [row.id, row]))
  const taken = new Set<string>()

  const topCuisines = topTasteCuisines(meTaste, 3).map((row) => row.cuisine)

  const forYou = statsRows
    .filter((row) => row.cuisine && topCuisines.some((cuisine) => row.cuisine?.toLowerCase() === cuisine))
    .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount)
    .slice(0, limit)
    .map((row) => {
      taken.add(row.id)
      return {
        ...row,
        reason: `Because you like ${row.cuisine}`,
      }
    })

  const followingIds = followingRows.map((row) => row.followingId)
  const friendsLovedRows = followingIds.length
    ? await db
        .select({
          placeId: reviews.placeId,
          friendReviewCount: sql<number>`COUNT(*)`.as('friend_review_count'),
        })
        .from(reviews)
        .where(inArray(reviews.userId, followingIds))
        .groupBy(reviews.placeId)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(limit * 4)
    : []

  const friendsLoved = friendsLovedRows
    .map((row) => {
      const place = statsById.get(row.placeId)
      if (!place || taken.has(place.id)) return null
      return {
        ...place,
        reason: `Loved by ${Number(row.friendReviewCount)} people you follow`,
      }
    })
    .filter((row): row is NonNullable<typeof row> => !!row)
    .slice(0, limit)
  friendsLoved.forEach((row) => taken.add(row.id))

  const trendingRows = await db
    .select({
      placeId: reviews.placeId,
      recentReviewCount: sql<number>`COUNT(*)`.as('recent_review_count'),
    })
    .from(reviews)
    .where(sql`${reviews.createdAt} > now() - interval '7 days'`)
    .groupBy(reviews.placeId)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(limit * 5)

  const trendingNow = trendingRows
    .map((row) => {
      const place = statsById.get(row.placeId)
      if (!place || taken.has(place.id)) return null
      return {
        ...place,
        reason: `${Number(row.recentReviewCount)} new reviews this week`,
      }
    })
    .filter((row): row is NonNullable<typeof row> => !!row)
    .slice(0, limit)

  res.json({ data: { forYou, friendsLoved, trendingNow } })
})

// GET /api/users/suggestions?limit=6 - suggested users to follow
usersRouter.get('/suggestions', requireAuth, async (req: AuthRequest, res) => {
  const limitRaw = Number.parseInt(String(req.query.limit ?? '6'), 10)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 20) : 6

  const followingRows = await db.query.follows.findMany({
    where: eq(follows.followerId, req.user!.id),
    columns: { followingId: true },
  })
  const followingIds = new Set(followingRows.map((row) => row.followingId))

  const candidates = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
      reviewCount: sql<number>`(select count(*) from reviews r where r.user_id = ${users.id})`.as('review_count'),
      followerCount: sql<number>`(select count(*) from follows f where f.following_id = ${users.id})`.as('follower_count'),
    })
    .from(users)
    .where(and(eq(users.isActive, true)))
    .orderBy(desc(users.createdAt))
    .limit(50)

  const suggestions = candidates
    .filter((user) => user.id !== req.user!.id && !followingIds.has(user.id))
    .sort((a, b) => Number(b.reviewCount) - Number(a.reviewCount) || Number(b.followerCount) - Number(a.followerCount))
    .slice(0, limit)
    .map((user) => ({
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      reviewCount: Number(user.reviewCount),
      followerCount: Number(user.followerCount),
      createdAt: user.createdAt,
    }))

  res.json({ data: suggestions })
})

// GET /api/users/:id/match - cosine similarity taste match with current user
usersRouter.get('/:id/match', requireAuth, async (req: AuthRequest, res) => {
  const targetUserId = String(req.params.id)
  if (targetUserId === req.user!.id) {
    res.json({ data: { score: 100, overlap: [] } })
    return
  }

  const [meVector, otherVector] = await Promise.all([
    getTasteVector(req.user!.id),
    getTasteVector(targetUserId),
  ])

  const overlap = Array.from(meVector.keys())
    .filter((key) => otherVector.has(key))
    .slice(0, 5)

  res.json({
    data: {
      score: tasteMatchPercent(meVector, otherVector),
      overlap,
    },
  })
})

// GET /api/users/:id - public profile with follow context
usersRouter.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  const targetUserId = String(req.params.id)
  const user = await db.query.users.findFirst({
    where: eq(users.id, targetUserId),
    columns: {
      id: true,
      displayName: true,
      avatarUrl: true,
      createdAt: true,
      role: true,
    },
  })

  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  const [stats, existingFollow, recentReviews] = await Promise.all([
    getUserStats(targetUserId),
    db.query.follows.findFirst({
      where: and(eq(follows.followerId, req.user!.id), eq(follows.followingId, targetUserId)),
      columns: { id: true },
    }),
    db.query.reviews.findMany({
      where: eq(reviews.userId, targetUserId),
      with: {
        place: { columns: { id: true, name: true, cuisine: true, imageUrl: true } },
      },
      orderBy: (table) => [desc(table.createdAt)],
      limit: 8,
    }),
  ])

  res.json({
    data: {
      user,
      stats,
      isFollowing: !!existingFollow,
      recentReviews: recentReviews.map((row) => ({
        id: row.id,
        rating: row.rating,
        body: row.body,
        createdAt: row.createdAt,
        place: {
          ...row.place,
          imageUrl: serializeImageUrl(row.place.id, row.place.imageUrl),
        },
      })),
    },
  })
})

// PATCH /api/users/me
usersRouter.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const { displayName, avatarUrl } = req.body

  const [updated] = await db
    .update(users)
    .set({
      ...(displayName !== undefined && { displayName }),
      ...(avatarUrl !== undefined && { avatarUrl }),
    })
    .where(eq(users.id, req.user!.id))
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      role: users.role,
      createdAt: users.createdAt,
    })

  res.json({ data: updated })
})

// POST /api/users/:id/follow
usersRouter.post('/:id/follow', requireAuth, async (req: AuthRequest, res) => {
  const targetUserId = String(req.params.id)
  if (targetUserId === req.user!.id) {
    res.status(400).json({ error: 'You cannot follow yourself' })
    return
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, targetUserId),
    columns: { id: true },
  })
  if (!targetUser) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  try {
    const [created] = await db
      .insert(follows)
      .values({ followerId: req.user!.id, followingId: targetUserId })
      .onConflictDoNothing()
      .returning({ id: follows.id })

    if (created) {
      const actor = await db.query.users.findFirst({
        where: eq(users.id, req.user!.id),
        columns: { displayName: true },
      })
      try {
        await createNotification({
          userId: targetUserId,
          actorUserId: req.user!.id,
          type: 'follow',
          title: 'New follower',
          body: `${actor?.displayName ?? 'Someone'} started following you`,
          link: `/users/${req.user!.id}`,
        })
      } catch {
        // non-blocking side effect
      }
    }
  } catch {
    // Ignore conflicts for idempotent behavior
  }

  res.status(201).json({ data: { following: true } })
})

// DELETE /api/users/:id/follow
usersRouter.delete('/:id/follow', requireAuth, async (req: AuthRequest, res) => {
  const targetUserId = String(req.params.id)
  await db
    .delete(follows)
    .where(and(eq(follows.followerId, req.user!.id), eq(follows.followingId, targetUserId)))

  res.status(204).send()
})
