import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, registerUser } from '../api/client'
import { RegisterPage } from '../pages/RegisterPage'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    registerUser: vi.fn(),
  }
})

const mockedRegisterUser = vi.mocked(registerUser)

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RegisterPage', () => {
  beforeEach(() => {
    mockedRegisterUser.mockReset()
  })

  it('submits registration and shows success', async () => {
    const user = userEvent.setup()
    mockedRegisterUser.mockResolvedValue({
      id: 1,
      username: 'alice',
      email: 'alice@example.com',
      firstName: null,
      lastName: null,
      location: null,
      description: null,
      role: 'TRAVELLER',
      active: true,
    })

    renderPage()

    await user.type(screen.getByLabelText(/Username/i), 'alice')
    await user.type(screen.getByLabelText(/Email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/^Password/i), 'Secret123')
    await user.type(screen.getByLabelText(/Confirm password/i), 'Secret123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(mockedRegisterUser).toHaveBeenCalledWith({
      username: 'alice',
      email: 'alice@example.com',
      password: 'Secret123',
      confirmPassword: 'Secret123',
    })
    expect(await screen.findByRole('heading', { name: "You're in" })).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })

  it('shows conflict error from the API', async () => {
    const user = userEvent.setup()
    mockedRegisterUser.mockRejectedValue(
      new ApiError({
        status: 409,
        reasonPhrase: 'Conflict',
        code: 'USERNAME_TAKEN',
        message: 'Username is already taken',
      }),
    )

    renderPage()

    await user.type(screen.getByLabelText(/Username/i), 'alice')
    await user.type(screen.getByLabelText(/Email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/^Password/i), 'Secret123')
    await user.type(screen.getByLabelText(/Confirm password/i), 'Secret123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Username is already taken')
  })

  it('blocks submit when passwords do not match', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/Username/i), 'alice')
    await user.type(screen.getByLabelText(/Email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/^Password/i), 'Secret123')
    await user.type(screen.getByLabelText(/Confirm password/i), 'Other123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
    expect(mockedRegisterUser).not.toHaveBeenCalled()
  })
})
