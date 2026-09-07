import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  createJourney,
  fetchCurrentUser,
  listJourneys,
  type JourneyResponse,
} from '../api/client'
import { AuthProvider } from '../auth/AuthContext'
import { RequireAuth } from '../auth/RequireAuth'
import { clearAccessToken, setAccessToken } from '../auth/token'
import { JourneyCreatePage } from './JourneyCreatePage'
import { JourneysPage } from './JourneysPage'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    fetchCurrentUser: vi.fn(),
    listJourneys: vi.fn(),
    createJourney: vi.fn(),
  }
})

const mockedFetchCurrentUser = vi.mocked(fetchCurrentUser)
const mockedListJourneys = vi.mocked(listJourneys)
const mockedCreateJourney = vi.mocked(createJourney)

const alice = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  firstName: null,
  lastName: null,
  location: null,
  description: null,
  role: 'TRAVELLER',
  active: true,
}

const sampleJourney: JourneyResponse = {
  id: 10,
  title: 'South Island',
  description: 'Road trip',
  startDate: '2026-01-10',
  endDate: '2026-01-20',
  visibility: 'PRIVATE',
  createdAt: '2026-09-07T00:00:00Z',
  updatedAt: '2026-09-07T00:00:00Z',
}

function renderCreate() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/journeys/new']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/journeys"
              element={
                <RequireAuth>
                  <JourneysPage />
                </RequireAuth>
              }
            />
            <Route
              path="/journeys/new"
              element={
                <RequireAuth>
                  <JourneyCreatePage />
                </RequireAuth>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('JourneyCreatePage', () => {
  beforeEach(() => {
    mockedFetchCurrentUser.mockReset()
    mockedListJourneys.mockReset()
    mockedCreateJourney.mockReset()
    clearAccessToken()
  })

  it('creates a journey and returns to the list', async () => {
    const user = userEvent.setup()
    setAccessToken('token-123')
    mockedFetchCurrentUser.mockResolvedValue(alice)
    mockedListJourneys.mockResolvedValue([sampleJourney])
    mockedCreateJourney.mockResolvedValue(sampleJourney)

    renderCreate()

    await screen.findByRole('heading', { name: 'Create a trip' })
    await user.type(screen.getByLabelText(/Title/i), 'South Island')
    await user.type(screen.getByLabelText(/Description/i), 'Road trip')
    await user.click(screen.getByRole('button', { name: 'Create journey' }))

    await waitFor(() => {
      expect(mockedCreateJourney).toHaveBeenCalledWith('token-123', {
        title: 'South Island',
        description: 'Road trip',
        startDate: null,
        endDate: null,
        visibility: 'PRIVATE',
      })
    })
    expect(await screen.findByRole('heading', { name: 'Journeys' })).toBeInTheDocument()
    expect(await screen.findByText('South Island')).toBeInTheDocument()
  })

  it('blocks empty title on create', async () => {
    const user = userEvent.setup()
    setAccessToken('token-123')
    mockedFetchCurrentUser.mockResolvedValue(alice)

    renderCreate()

    await screen.findByRole('heading', { name: 'Create a trip' })
    await user.click(screen.getByRole('button', { name: 'Create journey' }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(mockedCreateJourney).not.toHaveBeenCalled()
  })

  it('limits end date to on or after start date', async () => {
    const user = userEvent.setup()
    setAccessToken('token-123')
    mockedFetchCurrentUser.mockResolvedValue(alice)

    renderCreate()

    await screen.findByRole('heading', { name: 'Create a trip' })
    await user.type(screen.getByLabelText(/Start date/i), '2026-09-06')

    expect(screen.getByLabelText(/End date/i)).toHaveAttribute('min', '2026-09-06')
  })

  it('shows API validation errors', async () => {
    const user = userEvent.setup()
    setAccessToken('token-123')
    mockedFetchCurrentUser.mockResolvedValue(alice)
    mockedCreateJourney.mockRejectedValue(
      new ApiError({
        status: 400,
        error: 'Bad Request',
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        details: { title: 'Title must not be blank' },
      }),
    )

    renderCreate()

    await screen.findByRole('heading', { name: 'Create a trip' })
    await user.type(screen.getByLabelText(/Title/i), 'x')
    await user.click(screen.getByRole('button', { name: 'Create journey' }))

    expect(await screen.findByText('Title must not be blank')).toBeInTheDocument()
  })
})
