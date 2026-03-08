import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; isActive: boolean }
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorised' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string
      email: string
      role: string
    }
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.id),
      columns: { id: true, email: true, role: true, isActive: true },
    })
    if (!user) {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }
    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated. Contact support.' })
      return
    }
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorised' })
    return
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }
  next()
}
