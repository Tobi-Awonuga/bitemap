import { Router } from 'express'
import { eq, and } from 'drizzle-orm'
import { db } from '../../db'
import { visits } from '../../db/schema'
import { requireAuth, type AuthRequest } from '../../middleware/auth.middleware'
import { visitSchema } from '@bitemap/shared'

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
  const parsed = visitSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }
  const { placeId, visitedAt } = parsed.data

  try {
    const [visit] = await db
      .insert(visits)
      .values({
        userId: req.user!.id,
        placeId,
        visitedAt: visitedAt ? new Date(visitedAt) : new Date(),
      })
      .returning()

    res.status(201).json(visit)
  } catch {
    const existing = await db.query.visits.findFirst({
      where: and(eq(visits.userId, req.user!.id), eq(visits.placeId, placeId)),
    })
    if (!existing) {
      res.status(500).json({ error: 'Could not create visit' })
      return
    }
    res.status(200).json(existing)
  }
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
