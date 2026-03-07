import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { users } from '../../db/schema'
import { registerSchema, loginSchema } from '@bitemap/shared'

export const authRouter = Router()

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

  const passwordHash = await bcrypt.hash(password, 12)
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, displayName })
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET!, {
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

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET!, {
    expiresIn: '7d',
  })

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
  })
})

// POST /api/auth/logout — token is cleared client-side; endpoint for completeness
authRouter.post('/logout', (_req, res) => {
  res.status(204).send()
})
