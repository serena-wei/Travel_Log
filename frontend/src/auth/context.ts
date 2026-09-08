import { createContext } from 'react'
import type { UserResponse } from '../api/client'

export type AuthContextValue = {
  user: UserResponse | null
  accessToken: string | null
  isBootstrapping: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
