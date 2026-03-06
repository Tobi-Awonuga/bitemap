import { Router } from 'express'

export const authRouter = Router()

// POST /api/auth/register
authRouter.post('/register', (_req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})

// POST /api/auth/login
authRouter.post('/login', (_req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})

// POST /api/auth/logout
authRouter.post('/logout', (_req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})
