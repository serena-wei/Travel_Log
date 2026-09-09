import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from './AuthContext'
import { clearIntentionalLogout, markIntentionalLogout } from './intentionalLogout'
import { RequireAuth } from './RequireAuth'
import { clearAccessToken } from './token'

function renderProtected(initialPath = '/journeys') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<div>Marketing home</div>} />
          <Route path="/login" element={<div>Login page</div>} />
          <Route
            path="/journeys"
            element={
              <RequireAuth>
                <div>Journeys page</div>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('RequireAuth', () => {
  beforeEach(() => {
    clearAccessToken()
    clearIntentionalLogout()
  })

  it('sends intentional logout to the marketing home', async () => {
    markIntentionalLogout()
    renderProtected()

    expect(await screen.findByText('Marketing home')).toBeInTheDocument()
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
    expect(screen.queryByText('Journeys page')).not.toBeInTheDocument()
  })

  it('sends expired sessions to login with return path', async () => {
    renderProtected()

    expect(await screen.findByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Marketing home')).not.toBeInTheDocument()
  })
})
