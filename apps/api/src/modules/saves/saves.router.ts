import { Router } from 'express'
import { eq, and } from 'drizzle-orm'
import { db } from '../../db'
import { saves } from '../../db/schema'
import { requireAuth, type AuthRequest } from '../../middleware/auth.middleware'
import { saveSchema } from '@bitemap/shared'

export const savesRouter = Router()

// GET /api/saves — all saves for the current user with place data
savesRouter.get('/', requireAuth, async (req: AuthRequest, res) => {
  const userSaves = await db.query.saves.findMany({
    where: eq(saves.userId, req.user!.id),
    with: { place: true },
    orderBy: (saves, { desc }) => [desc(saves.createdAt)],
  })

  res.json(userSaves)
})

// POST /api/saves — { placeId }
savesRouter.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = saveSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }
  const { placeId } = parsed.data

  const existing = await db.query.saves.findFirst({
    where: and(eq(saves.userId, req.user!.id), eq(saves.placeId, placeId)),
  })
  if (existing) {
    res.status(409).json({ error: 'Already saved' })
    return
  }

  try {
    const [save] = await db
      .insert(saves)
      .values({ userId: req.user!.id, placeId })
      .returning()

    res.status(201).json(save)
  } catch {
    res.status(409).json({ error: 'Already saved' })
  }
})

// DELETE /api/saves/:placeId — unsave by place ID
savesRouter.delete('/:placeId', requireAuth, async (req: AuthRequest, res) => {
  await db
    .delete(saves)
    .where(and(eq(saves.userId, req.user!.id), eq(saves.placeId, String(req.params.placeId))))

  res.status(204).send()
})
