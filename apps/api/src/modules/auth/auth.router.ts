import { Router } from 'express'
import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { and, count, eq, gt, isNull } from 'drizzle-orm'
import { db } from '../../db'
import { passwordResets, users } from '../../db/schema'
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '@bitemap/shared'
import { emailEnabled, sendPasswordResetEmail } from '../../lib/email'

export const authRouter = Router()
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 8
const REGISTER_WINDOW_MS = 15 * 60 * 1000
const REGISTER_MAX_ATTEMPTS = 5
const FORGOT_WINDOW_MS = 15 * 60 * 1000
const FORGOT_MAX_ATTEMPTS = 6
const RESET_WINDOW_MS = 15 * 60 * 1000
const RESET_MAX_ATTEMPTS = 10
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000
const MAX_RATE_LIMIT_KEYS = 5000
type AttemptStore = Map<string, { count: number; resetAt: number }>
const loginAttempts: AttemptStore = new Map()
const registerAttempts: AttemptStore = new Map()
const forgotPasswordAttempts: AttemptStore = new Map()
const resetPasswordAttempts: AttemptStore = new Map()

function getClientKey(ip: string | undefined, email: string): string {
  return `${ip ?? 'unknown'}:${email}`
}

function trimAttemptStore(store: AttemptStore, now: number): void {
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key)
    }
  }

  const overflow = store.size - MAX_RATE_LIMIT_KEYS
  if (overflow <= 0) {
    return
  }

  const oldestKeys = Array.from(store.keys()).slice(0, overflow)
  for (const key of oldestKeys) {
    store.delete(key)
  }
}

function canAttempt(store: AttemptStore, key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now()
  trimAttemptStore(store, now)
  const current = store.get(key)
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (current.count >= maxAttempts) {
    return false
  }
  current.count += 1
  store.set(key, current)
  return true
}

function clearLoginAttempts(key: string): void {
  loginAttempts.delete(key)
}

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }

  const { email, password, displayName } = parsed.data
  const ipKey = req.ip ?? 'unknown'
  if (!canAttempt(registerAttempts, ipKey, REGISTER_MAX_ATTEMPTS, REGISTER_WINDOW_MS)) {
    res.status(429).json({ error: 'Too many registration attempts. Try again later.' })
    return
  }

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
    isActive: boolean
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
        isActive: users.isActive,
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
  if (!canAttempt(loginAttempts, clientKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS)) {
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
  if (!user.isActive) {
    res.status(403).json({ error: 'Account is deactivated. Contact support.' })
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

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }

  const { email } = parsed.data
  const forgotKey = getClientKey(req.ip, email)
  if (!canAttempt(forgotPasswordAttempts, forgotKey, FORGOT_MAX_ATTEMPTS, FORGOT_WINDOW_MS)) {
    res.status(429).json({ error: 'Too many password reset requests. Try again later.' })
    return
  }
  const user = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (!user) {
    res.status(200).json({ message: 'If an account exists, a reset link has been sent.' })
    return
  }

  const token = randomBytes(32).toString('hex')
  const tokenHash = hashResetToken(token)
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS)

  await db.delete(passwordResets).where(eq(passwordResets.userId, user.id))
  await db.insert(passwordResets).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  })

  const frontendBaseUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
  const resetUrl = `${frontendBaseUrl.replace(/\/$/, '')}/reset-password?token=${token}`
  let sentEmail = false
  let delivery: 'email' | 'dev-link' | 'unavailable' = 'unavailable'
  let hint: string | undefined
  try {
    sentEmail = await sendPasswordResetEmail({
      to: user.email,
      displayName: user.displayName,
      resetUrl,
    })
  } catch (err) {
    console.error('Failed to send password reset email:', err)
    if (process.env.NODE_ENV === 'production') {
      res.status(503).json({ error: 'Password reset is temporarily unavailable' })
      return
    }
  }

  if (!sentEmail) {
    if (process.env.NODE_ENV === 'production' && emailEnabled()) {
      res.status(503).json({ error: 'Password reset is temporarily unavailable' })
      return
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[dev] Password reset URL for ${user.email}: ${resetUrl}`)
      delivery = 'dev-link'
      hint = emailEnabled()
        ? 'Email delivery failed in development, so a direct reset link is provided below.'
        : 'SMTP is not configured, so no email is sent in development. Use the direct reset link below.'
    }
  } else {
    delivery = 'email'
    hint = 'If this email exists, a reset link has been sent. Check spam/junk if it does not appear.'
  }

  res.status(200).json({
    message: 'If an account exists, a reset link has been sent.',
    delivery,
    ...(hint ? { hint } : {}),
    ...(process.env.NODE_ENV !== 'production' ? { resetUrl } : {}),
  })
})

// POST /api/auth/reset-password
authRouter.post('/reset-password', async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }

  const { token, password } = parsed.data
  const resetKey = req.ip ?? 'unknown'
  if (!canAttempt(resetPasswordAttempts, resetKey, RESET_MAX_ATTEMPTS, RESET_WINDOW_MS)) {
    res.status(429).json({ error: 'Too many password reset attempts. Try again later.' })
    return
  }
  const tokenHash = hashResetToken(token)
  const now = new Date()

  const resetEntry = await db.query.passwordResets.findFirst({
    where: and(
      eq(passwordResets.tokenHash, tokenHash),
      gt(passwordResets.expiresAt, now),
      isNull(passwordResets.usedAt),
    ),
  })

  if (!resetEntry) {
    res.status(400).json({ error: 'Reset token is invalid or expired' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, resetEntry.userId))

  await db
    .update(passwordResets)
    .set({ usedAt: now })
    .where(eq(passwordResets.userId, resetEntry.userId))

  res.status(200).json({ message: 'Password reset successful' })
})
