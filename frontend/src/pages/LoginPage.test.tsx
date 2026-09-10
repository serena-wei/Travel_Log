import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, loginUser } from '../api/client'
import { AuthProvider } from '../auth/AuthContext'
import { RequireAuth } from '../auth/RequireAuth'
import { clearAccessToken } from '../auth/token'
import { clearIntentionalLogout } from '../auth/intentionalLogout'
import { DashboardPage } from './DashboardPage'
import { LoginPage } from './LoginPage'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    loginUser: vi.fn(),
    fetchCurrentUser: vi.fn(),
  }
})

const mockedLoginUser = vi.mocked(loginUser)

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
              path="/dashboard"
              element={
                <RequireAuth>
                  <DashboardPage />
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
    clearAccessToken()
    clearIntentionalLogout()
  })

  it('signs in and navigates to the dashboard', async () => {
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
        avatarUrl: null,
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
    expect(await screen.findByRole('heading', { name: 'Your dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Hi, alice.')).toBeInTheDocument()
  })

  it('shows invalid credentials from the API', async () => {
    const user = userEvent.setup()
    mockedLoginUser.mockRejectedValue(
      new ApiError({
        status: 401,
        reasonPhrase: 'Unauthorized',
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
})
