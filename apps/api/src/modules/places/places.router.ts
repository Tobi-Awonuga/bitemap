import { Router } from 'express'

export const placesRouter = Router()

// GET /api/places
placesRouter.get('/', (_req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})

// GET /api/places/:id
placesRouter.get('/:id', (_req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})

// POST /api/places
placesRouter.post('/', (_req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})
