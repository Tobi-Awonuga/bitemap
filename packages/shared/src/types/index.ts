export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  createdAt: string
}

export interface Place {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  googlePlaceId?: string
  createdAt: string
}

export interface Review {
  id: string
  userId: string
  placeId: string
  rating: number
  body?: string
  createdAt: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  status: number
}
