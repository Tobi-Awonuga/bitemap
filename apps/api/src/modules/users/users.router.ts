import { Router } from 'express'

export const usersRouter = Router()

// GET /api/users/me
usersRouter.get('/me', (_req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})

// PATCH /api/users/me
usersRouter.patch('/me', (_req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})
