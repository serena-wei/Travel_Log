import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isIntentionalLogout } from './logoutFlag'
import { useAuth } from './useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, token, isBootstrapping } = useAuth()
  const location = useLocation()

  if (isBootstrapping) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[var(--color-fog)] px-6">
        <p className="text-[11px] font-medium tracking-[0.28em] text-[var(--color-stone)] uppercase">
          Opening your journal…
        </p>
      </div>
    )
  }

  if (!user || !token) {
    if (isIntentionalLogout()) {
      return <Navigate to="/login" replace />
    }
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
