import 'dotenv/config'
import path from 'node:path'
import express from 'express'
import cors from 'cors'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { healthRouter } from './modules/health/health.router'
import { authRouter } from './modules/auth/auth.router'
import { usersRouter } from './modules/users/users.router'
import { placesRouter } from './modules/places/places.router'
import { reviewsRouter } from './modules/reviews/reviews.router'
import { savesRouter } from './modules/saves/saves.router'
import { visitsRouter } from './modules/visits/visits.router'
import { tagsRouter } from './modules/tags/tags.router'
import { adminRouter } from './modules/admin/admin.router'
import { notificationsRouter } from './modules/notifications/notifications.router'
import * as schema from './db/schema'

const app = express()
const PORT = Number(process.env.PORT ?? 4000)
const SHOULD_RUN_MIGRATIONS = process.env.RUN_MIGRATIONS !== 'false'
const JWT_SECRET = process.env.JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL
const JSON_LIMIT = process.env.API_JSON_LIMIT ?? '256kb'

function getAllowedOrigins(): Set<string> {
  const allowed = new Set<string>()
  const frontendUrl = process.env.FRONTEND_URL?.trim()
  if (frontendUrl) {
    allowed.add(frontendUrl)
  }

  const configuredOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  for (const origin of configuredOrigins) {
    allowed.add(origin)
  }

  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:5173')
    allowed.add('http://127.0.0.1:5173')
  }

  return allowed
}

function assertRuntimeConfig(): void {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required')
  }
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required')
  }
  if (process.env.NODE_ENV !== 'development' && JWT_SECRET === 'change_me_in_production') {
    throw new Error('JWT_SECRET must be changed outside development')
  }
  if ((process.env.PLACES_PROVIDER ?? 'local').toLowerCase() === 'google' && !process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY is required when PLACES_PROVIDER=google')
  }
}

const allowedOrigins = getAllowedOrigins()

app.disable('x-powered-by')
app.use((_, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  next()
})
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true)
      return
    }
    callback(new Error('Origin not allowed by CORS'))
  },
}))
app.use(express.json({ limit: JSON_LIMIT }))

app.use('/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/places', placesRouter)
app.use('/api/reviews', reviewsRouter)
app.use('/api/saves', savesRouter)
app.use('/api/visits', visitsRouter)
app.use('/api/tags', tagsRouter)
app.use('/api/admin', adminRouter)
app.use('/api/notifications', notificationsRouter)

app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof Error && err.message.includes('CORS')) {
    res.status(403).json({ error: 'Origin not allowed' })
    return
  }
  console.error('Unhandled API error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

async function runMigrations(): Promise<void> {
  if (!SHOULD_RUN_MIGRATIONS) {
    console.log('Skipping automatic database migrations')
    return
  }

  const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 })
  const migrationDb = drizzle(migrationClient, { schema })

  console.log('Running database migrations...')
  await migrate(migrationDb, { migrationsFolder: path.join(__dirname, '../drizzle') })
  await migrationClient.end()
  console.log('Database migrations complete')
}

async function bootstrap(): Promise<void> {
  try {
    assertRuntimeConfig()
    await runMigrations()
  } catch (err) {
    console.error('Failed to run database migrations:', err)
    process.exit(1)
  }

  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`)
  })
}

void bootstrap()
