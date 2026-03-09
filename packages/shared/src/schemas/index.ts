import { z } from 'zod'

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
  .regex(/[a-z]/, 'Password must include at least one lowercase letter')
  .regex(/[0-9]/, 'Password must include at least one number')

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
  displayName: z.string().trim().min(1),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(32),
  password: passwordSchema,
})

const dataImageSchema = z
  .string()
  .regex(
    /^data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\s]+$/,
    'Avatar data URL must be a base64 image',
  )

export const profileUpdateSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80).optional(),
    avatarUrl: z
      .union([z.string().trim().url(), dataImageSchema])
      .nullable()
      .optional(),
  })
  .refine((payload) => payload.displayName !== undefined || payload.avatarUrl !== undefined, {
    message: 'At least one field is required',
    path: ['displayName'],
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

export const reviewUpdateSchema = z.object({
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
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
export type PlaceInput = z.infer<typeof placeSchema>
export type ReviewInput = z.infer<typeof reviewSchema>
export type ReviewUpdateInput = z.infer<typeof reviewUpdateSchema>
export type SaveInput = z.infer<typeof saveSchema>
export type VisitInput = z.infer<typeof visitSchema>
