import { Router } from 'express'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '../../db'
import { follows, reviews, saves, users, visits } from '../../db/schema'
import { requireAuth, type AuthRequest } from '../../middleware/auth.middleware'

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
        place: { columns: { id: true, name: true, cuisine: true, imageUrl: true } },
      },
      orderBy: (table) => [desc(table.createdAt)],
      limit: 25,
    }),
    db.query.visits.findMany({
      where: inArray(visits.userId, followingIds),
      with: {
        user: { columns: { id: true, displayName: true, avatarUrl: true } },
        place: { columns: { id: true, name: true, cuisine: true, imageUrl: true } },
      },
      orderBy: (table) => [desc(table.visitedAt)],
      limit: 25,
    }),
  ])

  const reviewItems = recentReviews.map((row) => ({
    type: 'review' as const,
    id: row.id,
    createdAt: row.createdAt,
    user: row.user,
    place: {
      ...row.place,
      imageUrl: serializeImageUrl(row.place.id, row.place.imageUrl),
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
    },
  }))

  const merged = [...reviewItems, ...visitItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 40)

  res.json({ data: merged })
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
    await db.insert(follows).values({ followerId: req.user!.id, followingId: targetUserId })
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
