import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, listJourneys, loginUser } from '../api/client'
import { AuthProvider } from '../auth/AuthContext'
import { RequireAuth } from '../auth/RequireAuth'
import { clearAccessToken } from '../auth/token'
import { clearIntentionalLogout } from '../auth/logoutFlag'
import { JourneysPage } from './JourneysPage'
import { LoginPage } from './LoginPage'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    loginUser: vi.fn(),
    fetchCurrentUser: vi.fn(),
    listJourneys: vi.fn().mockResolvedValue([]),
  }
})

const mockedLoginUser = vi.mocked(loginUser)
const mockedListJourneys = vi.mocked(listJourneys)

function renderLogin() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/journeys"
              element={
                <RequireAuth>
                  <JourneysPage />
                </RequireAuth>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockedLoginUser.mockReset()
    mockedListJourneys.mockReset()
    mockedListJourneys.mockResolvedValue([])
    clearAccessToken()
    clearIntentionalLogout()
  })

  it('signs in and navigates to journeys', async () => {
    const user = userEvent.setup()
    mockedLoginUser.mockResolvedValue({
      accessToken: 'token-123',
      tokenType: 'Bearer',
      user: {
        id: 1,
        username: 'alice',
        email: 'alice@example.com',
        firstName: null,
        lastName: null,
        location: null,
        description: null,
        role: 'TRAVELLER',
        active: true,
      },
    })

    renderLogin()

    await user.type(screen.getByLabelText(/Username/i), 'alice')
    await user.type(screen.getByLabelText(/^Password/i), 'Secret123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(mockedLoginUser).toHaveBeenCalledWith({
      username: 'alice',
      password: 'Secret123',
    })
    expect(await screen.findByRole('heading', { name: 'Journeys' })).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
  })

  it('shows invalid credentials from the API', async () => {
    const user = userEvent.setup()
    mockedLoginUser.mockRejectedValue(
      new ApiError({
        status: 401,
        error: 'Unauthorized',
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
      }),
    )

    renderLogin()

    await user.type(screen.getByLabelText(/Username/i), 'alice')
    await user.type(screen.getByLabelText(/^Password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password')
  })

  it('blocks empty submit', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Username is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(mockedLoginUser).not.toHaveBeenCalled()
  })
})
