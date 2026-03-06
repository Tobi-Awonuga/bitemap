import { Router } from 'express'

export const tagsRouter = Router()

// GET /api/tags
tagsRouter.get('/', (_req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})

// POST /api/tags
tagsRouter.post('/', (_req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})
