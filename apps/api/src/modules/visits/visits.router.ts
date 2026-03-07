import { Router } from 'express'
import { eq, and } from 'drizzle-orm'
import { db } from '../../db'
import { visits } from '../../db/schema'
import { requireAuth, type AuthRequest } from '../../middleware/auth.middleware'

export const visitsRouter = Router()

// GET /api/visits — all visits for the current user with place data
visitsRouter.get('/', requireAuth, async (req: AuthRequest, res) => {
  const userVisits = await db.query.visits.findMany({
    where: eq(visits.userId, req.user!.id),
    with: { place: true },
    orderBy: (visits, { desc }) => [desc(visits.visitedAt)],
  })

  res.json(userVisits)
})

// POST /api/visits — { placeId, visitedAt? }
visitsRouter.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { placeId, visitedAt } = req.body
  if (!placeId) {
    res.status(400).json({ error: 'placeId is required' })
    return
  }

  const [visit] = await db
    .insert(visits)
    .values({
      userId: req.user!.id,
      placeId,
      visitedAt: visitedAt ? new Date(visitedAt) : new Date(),
    })
    .returning()

  res.status(201).json(visit)
})

// DELETE /api/visits/:id
visitsRouter.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  await db
    .delete(visits)
    .where(and(eq(visits.id, String(req.params.id)), eq(visits.userId, req.user!.id)))

  res.status(204).send()
})

// GET /api/visits/check/:placeId — check if current user has visited a place
visitsRouter.get('/check/:placeId', requireAuth, async (req: AuthRequest, res) => {
  const visit = await db.query.visits.findFirst({
    where: and(eq(visits.userId, req.user!.id), eq(visits.placeId, String(req.params.placeId))),
  })

  res.json({ visited: !!visit, visitId: visit?.id ?? null })
})
