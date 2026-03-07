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
import * as schema from './db/schema'

const app = express()
const PORT = Number(process.env.PORT ?? 4000)
const SHOULD_RUN_MIGRATIONS = process.env.RUN_MIGRATIONS !== 'false'

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
app.use('/api/admin', adminRouter)

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
