import { Router } from 'express'

export const reviewsRouter = Router()

// GET /api/reviews?placeId=
reviewsRouter.get('/', (_req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})

// POST /api/reviews
reviewsRouter.post('/', (_req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})

// DELETE /api/reviews/:id
reviewsRouter.delete('/:id', (_req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})
