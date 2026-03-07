import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
    .regex(/[a-z]/, 'Password must include at least one lowercase letter')
    .regex(/[0-9]/, 'Password must include at least one number'),
  displayName: z.string().trim().min(1),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})

export const placeSchema = z.object({
  name: z.string().min(1),
  cuisine: z.string().optional(),
  description: z.string().optional(),
  address: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  priceLevel: z.number().int().min(1).max(4).optional(),
  imageUrl: z.string().url().optional(),
  googlePlaceId: z.string().optional(),
})

export const reviewSchema = z.object({
  placeId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  body: z.string().optional(),
})

export const saveSchema = z.object({
  placeId: z.string().uuid(),
})

export const visitSchema = z.object({
  placeId: z.string().uuid(),
  visitedAt: z.string().datetime().optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type PlaceInput = z.infer<typeof placeSchema>
export type ReviewInput = z.infer<typeof reviewSchema>
export type SaveInput = z.infer<typeof saveSchema>
export type VisitInput = z.infer<typeof visitSchema>
