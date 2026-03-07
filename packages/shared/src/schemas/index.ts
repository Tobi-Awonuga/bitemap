import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1),
})

export const loginSchema = z.object({
  email: z.string().email(),
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

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type PlaceInput = z.infer<typeof placeSchema>
export type ReviewInput = z.infer<typeof reviewSchema>
