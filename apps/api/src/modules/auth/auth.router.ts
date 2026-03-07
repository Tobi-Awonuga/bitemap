import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { eq, count } from 'drizzle-orm'
import { db } from '../../db'
import { users } from '../../db/schema'
import { registerSchema, loginSchema } from '@bitemap/shared'

export const authRouter = Router()
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 8
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

function getClientKey(ip: string | undefined, email: string): string {
  return `${ip ?? 'unknown'}:${email}`
}

function canAttemptLogin(key: string): boolean {
  const now = Date.now()
  const current = loginAttempts.get(key)
  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
    return true
  }
  if (current.count >= LOGIN_MAX_ATTEMPTS) {
    return false
  }
  current.count += 1
  loginAttempts.set(key, current)
  return true
}

function clearLoginAttempts(key: string): void {
  loginAttempts.delete(key)
}

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }

  const { email, password, displayName } = parsed.data

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (existing) {
    res.status(409).json({ error: 'Email already in use' })
    return
  }

  // First user ever registered becomes admin
  const [{ value: userCount }] = await db.select({ value: count() }).from(users)
  const role = userCount === 0 ? 'admin' : 'user'

  const passwordHash = await bcrypt.hash(password, 12)
  let user: {
    id: string
    email: string
    displayName: string
    avatarUrl: string | null
    role: 'admin' | 'user'
    createdAt: Date
  }
  try {
    ;[user] = await db
      .insert(users)
      .values({ email, passwordHash, displayName, role })
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        createdAt: users.createdAt,
      })
  } catch {
    res.status(409).json({ error: 'Email already in use' })
    return
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET!, {
    expiresIn: '7d',
  })

  res.status(201).json({ token, user })
})

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }

  const { email, password } = parsed.data
  const clientKey = getClientKey(req.ip, email)
  if (!canAttemptLogin(clientKey)) {
    res.status(429).json({ error: 'Too many login attempts. Try again later.' })
    return
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }
  clearLoginAttempts(clientKey)

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET!, {
    expiresIn: '7d',
  })

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
    },
  })
})

// POST /api/auth/logout — token is cleared client-side; endpoint for completeness
authRouter.post('/logout', (_req, res) => {
  res.status(204).send()
})
