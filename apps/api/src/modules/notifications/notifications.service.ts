import { db } from '../../db'
import { notifications } from '../../db/schema'

type NotificationInput = {
  userId: string
  actorUserId?: string | null
  type: string
  title: string
  body?: string | null
  link?: string | null
  meta?: Record<string, unknown> | null
}

export async function createNotification(input: NotificationInput): Promise<void> {
  await db.insert(notifications).values({
    userId: input.userId,
    actorUserId: input.actorUserId ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    meta: input.meta ?? null,
  })
}
