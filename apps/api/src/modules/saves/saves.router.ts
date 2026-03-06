import { Router } from 'express'

export const savesRouter = Router()

// GET /api/saves
savesRouter.get('/', (_req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})

// POST /api/saves
savesRouter.post('/', (_req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})

// DELETE /api/saves/:id
savesRouter.delete('/:id', (_req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})
