import type { ReactNode } from 'react'
import { AppHeader } from './AppHeader'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-canvas min-h-svh">
      <AppHeader />
      {children}
    </div>
  )
}
