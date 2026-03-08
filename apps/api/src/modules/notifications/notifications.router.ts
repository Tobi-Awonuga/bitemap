import { Router } from 'express'
import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '../../db'
import { notifications } from '../../db/schema'
import { requireAuth, type AuthRequest } from '../../middleware/auth.middleware'

export const notificationsRouter = Router()

notificationsRouter.use(requireAuth)

// GET /api/notifications?limit=20
notificationsRouter.get('/', async (req: AuthRequest, res) => {
  const limitRaw = Number.parseInt(String(req.query.limit ?? '20'), 10)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20

  const rows = await db.query.notifications.findMany({
    where: eq(notifications.userId, req.user!.id),
    with: {
      actor: { columns: { id: true, displayName: true, avatarUrl: true } },
    },
    orderBy: (table) => [desc(table.createdAt)],
    limit,
  })

  res.json({
    data: rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      link: row.link,
      isRead: row.isRead,
      readAt: row.readAt,
      createdAt: row.createdAt,
      actor: row.actor
        ? {
            id: row.actor.id,
            displayName: row.actor.displayName,
            avatarUrl: row.actor.avatarUrl,
          }
        : null,
    })),
  })
})

// GET /api/notifications/unread-count
notificationsRouter.get('/unread-count', async (req: AuthRequest, res) => {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, req.user!.id), eq(notifications.isRead, false)))

  res.json({ data: { count: Number(row?.count ?? 0) } })
})

// PATCH /api/notifications/:id/read
notificationsRouter.patch('/:id/read', async (req: AuthRequest, res) => {
  const notificationId = String(req.params.id)
  const [updated] = await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, req.user!.id)))
    .returning({ id: notifications.id })

  if (!updated) {
    res.status(404).json({ error: 'Notification not found' })
    return
  }

  res.json({ data: { id: updated.id } })
})

// PATCH /api/notifications/read-all
notificationsRouter.patch('/read-all', async (req: AuthRequest, res) => {
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.userId, req.user!.id), eq(notifications.isRead, false)))

  res.json({ data: { success: true } })
})
