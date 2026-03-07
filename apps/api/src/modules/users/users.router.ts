import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { users } from '../../db/schema'
import { requireAuth, type AuthRequest } from '../../middleware/auth.middleware'

export const usersRouter = Router()

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
