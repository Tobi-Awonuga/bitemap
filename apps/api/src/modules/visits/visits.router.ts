import { Router } from 'express'

export const visitsRouter = Router()

// GET /api/visits
visitsRouter.get('/', (_req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})

// POST /api/visits
visitsRouter.post('/', (_req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})

// DELETE /api/visits/:id
visitsRouter.delete('/:id', (_req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})
