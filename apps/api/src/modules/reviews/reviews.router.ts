import { Router } from 'express'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import { reviewHelpfulVotes, reviewReports, reviews, visits } from '../../db/schema'
import { requireAuth, type AuthRequest } from '../../middleware/auth.middleware'
import { reviewSchema, reviewUpdateSchema } from '@bitemap/shared'

export const reviewsRouter = Router()
const reviewReportSchema = z.object({
  reason: z.string().trim().min(2).max(80),
  details: z.string().trim().max(400).optional(),
})

// GET /api/reviews?placeId=
reviewsRouter.get('/', async (req, res) => {
  const { placeId } = req.query
  if (!placeId || typeof placeId !== 'string') {
    res.status(400).json({ error: 'placeId query param is required' })
    return
  }

  const placeReviews = await db.query.reviews.findMany({
    where: eq(reviews.placeId, placeId),
    with: {
      user: {
        columns: { id: true, displayName: true, avatarUrl: true },
      },
    },
    orderBy: (reviews, { desc }) => [desc(reviews.createdAt)],
  })

  res.json({ data: placeReviews })
})

// POST /api/reviews — requires a visit record for the place
reviewsRouter.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = reviewSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }

  const { placeId, rating, body } = parsed.data

  // Gate: user must have visited the place
  const visit = await db.query.visits.findFirst({
    where: and(eq(visits.userId, req.user!.id), eq(visits.placeId, placeId)),
  })
  if (!visit) {
    res.status(403).json({ error: 'You can only review places you have visited' })
    return
  }

  // One review per place per user
  const existing = await db.query.reviews.findFirst({
    where: and(eq(reviews.userId, req.user!.id), eq(reviews.placeId, placeId)),
  })
  if (existing) {
    res.status(409).json({ error: 'You have already reviewed this place' })
    return
  }

  let review: typeof reviews.$inferSelect
  try {
    ;[review] = await db
      .insert(reviews)
      .values({ userId: req.user!.id, placeId, visitId: visit.id, rating, body })
      .returning()
  } catch {
    res.status(409).json({ error: 'You have already reviewed this place' })
    return
  }

  res.status(201).json({ data: review })
})

// DELETE /api/reviews/:id — only the author can delete
reviewsRouter.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  await db
    .delete(reviews)
    .where(and(eq(reviews.id, String(req.params.id)), eq(reviews.userId, req.user!.id)))

  res.status(204).send()
})

// PATCH /api/reviews/:id — only the author can edit
reviewsRouter.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const parsed = reviewUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }

  const [updated] = await db
    .update(reviews)
    .set({
      rating: parsed.data.rating,
      body: parsed.data.body,
    })
    .where(and(eq(reviews.id, String(req.params.id)), eq(reviews.userId, req.user!.id)))
    .returning()

  if (!updated) {
    res.status(404).json({ error: 'Review not found' })
    return
  }

  res.json({ data: updated })
})

// POST /api/reviews/:id/helpful — mark review as helpful
reviewsRouter.post('/:id/helpful', requireAuth, async (req: AuthRequest, res) => {
  const reviewId = String(req.params.id)

  const review = await db.query.reviews.findFirst({
    where: eq(reviews.id, reviewId),
    columns: { id: true, userId: true },
  })
  if (!review) {
    res.status(404).json({ error: 'Review not found' })
    return
  }
  if (review.userId === req.user!.id) {
    res.status(400).json({ error: 'Cannot mark your own review as helpful' })
    return
  }

  const [vote] = await db
    .insert(reviewHelpfulVotes)
    .values({ reviewId, userId: req.user!.id })
    .onConflictDoNothing()
    .returning({ id: reviewHelpfulVotes.id })

  res.status(vote ? 201 : 200).json({ success: true })
})

// DELETE /api/reviews/:id/helpful — remove helpful vote
reviewsRouter.delete('/:id/helpful', requireAuth, async (req: AuthRequest, res) => {
  const reviewId = String(req.params.id)
  await db
    .delete(reviewHelpfulVotes)
    .where(and(eq(reviewHelpfulVotes.reviewId, reviewId), eq(reviewHelpfulVotes.userId, req.user!.id)))

  res.status(204).send()
})

// POST /api/reviews/:id/report — submit abuse report for a review
reviewsRouter.post('/:id/report', requireAuth, async (req: AuthRequest, res) => {
  const reviewId = String(req.params.id)
  const parsed = reviewReportSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }

  const review = await db.query.reviews.findFirst({
    where: eq(reviews.id, reviewId),
    columns: { id: true, userId: true },
  })
  if (!review) {
    res.status(404).json({ error: 'Review not found' })
    return
  }
  if (review.userId === req.user!.id) {
    res.status(400).json({ error: 'Cannot report your own review' })
    return
  }

  await db
    .insert(reviewReports)
    .values({
      reviewId,
      reporterUserId: req.user!.id,
      reason: parsed.data.reason,
      details: parsed.data.details || null,
    })
    .onConflictDoUpdate({
      target: [reviewReports.reviewId, reviewReports.reporterUserId],
      set: {
        reason: parsed.data.reason,
        details: parsed.data.details || null,
        status: 'open',
        resolvedAt: null,
        resolvedByUserId: null,
      },
    })

  res.status(201).json({ success: true })
})
