import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { healthRouter } from './modules/health/health.router'
import { authRouter } from './modules/auth/auth.router'
import { usersRouter } from './modules/users/users.router'
import { placesRouter } from './modules/places/places.router'
import { reviewsRouter } from './modules/reviews/reviews.router'
import { savesRouter } from './modules/saves/saves.router'
import { visitsRouter } from './modules/visits/visits.router'
import { tagsRouter } from './modules/tags/tags.router'

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(cors())
app.use(express.json())

app.use('/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/places', placesRouter)
app.use('/api/reviews', reviewsRouter)
app.use('/api/saves', savesRouter)
app.use('/api/visits', visitsRouter)
app.use('/api/tags', tagsRouter)

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})
