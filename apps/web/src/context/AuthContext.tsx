import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api, setToken, clearToken } from '../lib/api'
import type { User, AuthResponse, ApiResponse } from '@bitemap/shared'

type AuthUser = Pick<User, 'id' | 'email' | 'displayName' | 'avatarUrl' | 'role' | 'createdAt'>

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (displayName: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('bm_token')
    if (!token) {
      setIsLoading(false)
      return
    }
    api
      .get<ApiResponse<AuthUser>>('/api/users/me')
      .then(({ data }) => setUser(data))
      .catch(() => clearToken())
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const { token, user } = await api.post<AuthResponse>('/api/auth/login', { email, password })
    setToken(token)
    setUser(user)
  }

  const register = async (displayName: string, email: string, password: string) => {
    const { token, user } = await api.post<AuthResponse>('/api/auth/register', {
      displayName,
      email,
      password,
    })
    setToken(token)
    setUser(user)
  }

  const logout = () => {
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
