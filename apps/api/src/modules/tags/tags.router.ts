import { Router } from 'express'
import { asc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import { places, placeTags, tags } from '../../db/schema'
import { requireAuth, requireAdmin, type AuthRequest } from '../../middleware/auth.middleware'

export const tagsRouter = Router()

const tagNameSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long').transform((s) => s.trim()),
})

const placeTagSchema = z.object({
  tagId: z.string().uuid('Invalid tag ID'),
})

// GET /api/tags - list all tags
tagsRouter.get('/', async (_req, res) => {
  const rows = await db.select({ id: tags.id, name: tags.name }).from(tags).orderBy(asc(tags.name))
  res.json({ data: rows })
})

// POST /api/tags - create tag (admin only)
tagsRouter.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const parsed = tagNameSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }

  const { name } = parsed.data

  // Check for case-insensitive duplicate
  const [existing] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(sql`lower(${tags.name}) = lower(${name})`)
    .limit(1)

  if (existing) {
    res.status(409).json({ error: 'A tag with that name already exists' })
    return
  }

  const [created] = await db.insert(tags).values({ name }).returning({ id: tags.id, name: tags.name })
  res.status(201).json({ data: created })
})

// GET /api/tags/places/:id/tags - get tags for a place
tagsRouter.get('/places/:id/tags', async (req, res) => {
  const placeId = String(req.params.id)

  const place = await db.query.places.findFirst({
    where: eq(places.id, placeId),
    columns: { id: true },
  })
  if (!place) {
    res.status(404).json({ error: 'Place not found' })
    return
  }

  const rows = await db
    .select({ id: tags.id, name: tags.name })
    .from(placeTags)
    .innerJoin(tags, eq(tags.id, placeTags.tagId))
    .where(eq(placeTags.placeId, placeId))
    .orderBy(asc(tags.name))

  res.json({ data: rows })
})

// POST /api/tags/places/:id/tags - add tag to a place (admin only)
tagsRouter.post('/places/:id/tags', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const placeId = String(req.params.id)

  const parsed = placeTagSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }

  const { tagId } = parsed.data

  const [place, tag] = await Promise.all([
    db.query.places.findFirst({ where: eq(places.id, placeId), columns: { id: true } }),
    db.query.tags.findFirst({ where: eq(tags.id, tagId), columns: { id: true } }),
  ])

  if (!place) {
    res.status(404).json({ error: 'Place not found' })
    return
  }
  if (!tag) {
    res.status(404).json({ error: 'Tag not found' })
    return
  }

  await db.insert(placeTags).values({ placeId, tagId }).onConflictDoNothing()
  res.status(201).json({ message: 'Tag added' })
})

// DELETE /api/tags/places/:id/tags/:tagId - remove tag from place (admin only)
tagsRouter.delete('/places/:id/tags/:tagId', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const placeId = String(req.params.id)
  const tagId = String(req.params.tagId)

  await db.delete(placeTags).where(
    sql`${placeTags.placeId} = ${placeId} AND ${placeTags.tagId} = ${tagId}`,
  )

  res.json({ message: 'Tag removed' })
})
