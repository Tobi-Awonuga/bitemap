export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  role: 'user' | 'admin'
  createdAt: string
}

export interface Place {
  id: string
  name: string
  cuisine?: string
  description?: string
  address: string
  latitude: number
  longitude: number
  priceLevel?: number
  imageUrl?: string
  googlePlaceId?: string
  createdAt: string
}

export interface PlaceWithStats extends Place {
  avgRating: number
  reviewCount: number
  isSaved?: boolean
  isVisited?: boolean
  visitId?: string | null
}

export interface ReviewUser {
  id: string
  displayName: string
  avatarUrl?: string | null
}

export interface Review {
  id: string
  userId: string
  placeId: string
  visitId?: string
  rating: number
  body?: string
  createdAt: string
}

export interface ReviewWithUser extends Review {
  user: ReviewUser
}

export interface Save {
  id: string
  userId: string
  placeId: string
  createdAt: string
}

export interface Visit {
  id: string
  userId: string
  placeId: string
  visitedAt: string
}

export interface AuthResponse {
  token: string
  user: Pick<User, 'id' | 'email' | 'displayName' | 'avatarUrl' | 'role' | 'createdAt'>
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  status: number
}

export interface AdminStats {
  totalUsers: number
  totalPlaces: number
  totalReviews: number
  totalSaves: number
  totalVisits: number
  recentReviews: Array<{
    id: string
    rating: number
    body?: string
    createdAt: string
    user: { id: string; displayName: string }
    place: { id: string; name: string }
  }>
}

export interface AdminInsights {
  topSavedPlaces: Array<{
    id: string
    name: string
    cuisine?: string | null
    saveCount: number
  }>
  topCuisines: Array<{
    cuisine: string
    placeCount: number
    saveCount: number
  }>
}
