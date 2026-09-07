import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError, fetchCurrentUser, loginUser, type UserResponse } from '../api/client'
import { AuthContext, type AuthContextValue } from './context'
import { clearIntentionalLogout, markIntentionalLogout } from './logoutFlag'
import { clearAccessToken, getAccessToken, setAccessToken } from './token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAccessToken())
  const [user, setUser] = useState<UserResponse | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(() => Boolean(getAccessToken()))

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const existing = getAccessToken()
      if (!existing) {
        setIsBootstrapping(false)
        return
      }

      try {
        const currentUser = await fetchCurrentUser(existing)
        if (!cancelled) {
          setToken(existing)
          setUser(currentUser)
        }
      } catch (error) {
        clearAccessToken()
        if (!cancelled) {
          setToken(null)
          setUser(null)
          if (!(error instanceof ApiError && error.status === 401)) {
            console.error(error)
          }
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false)
        }
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isBootstrapping,
      async login(username: string, password: string) {
        const response = await loginUser({ username, password })
        clearIntentionalLogout()
        setAccessToken(response.accessToken)
        setToken(response.accessToken)
        setUser(response.user)
      },
      logout() {
        markIntentionalLogout()
        clearAccessToken()
        setToken(null)
        setUser(null)
      },
    }),
    [user, token, isBootstrapping],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
