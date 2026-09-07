import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser, listJourneys, type JourneyResponse } from '../api/client'
import { AuthProvider } from '../auth/AuthContext'
import { RequireAuth } from '../auth/RequireAuth'
import { clearAccessToken, setAccessToken } from '../auth/token'
import { JourneyCreatePage } from './JourneyCreatePage'
import { JourneysPage } from './JourneysPage'
import { LoginPage } from './LoginPage'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    fetchCurrentUser: vi.fn(),
    listJourneys: vi.fn(),
    createJourney: vi.fn(),
    loginUser: vi.fn(),
  }
})

const mockedFetchCurrentUser = vi.mocked(fetchCurrentUser)
const mockedListJourneys = vi.mocked(listJourneys)

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

function renderJourneys(initialPath = '/journeys') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
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

describe('JourneysPage', () => {
  beforeEach(() => {
    mockedFetchCurrentUser.mockReset()
    mockedListJourneys.mockReset()
    clearAccessToken()
  })

  it('redirects unauthenticated users to login', async () => {
    renderJourneys()

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })

  it('lists journeys for the signed-in user', async () => {
    setAccessToken('token-123')
    mockedFetchCurrentUser.mockResolvedValue(alice)
    mockedListJourneys.mockResolvedValue([sampleJourney])

    renderJourneys()

    expect(await screen.findByRole('heading', { name: 'Journeys' })).toBeInTheDocument()
    expect(await screen.findByText('South Island')).toBeInTheDocument()
    expect(screen.getByText('Road trip')).toBeInTheDocument()
    expect(mockedListJourneys).toHaveBeenCalledWith('token-123')
  })

  it('links to the create journey page', async () => {
    const user = userEvent.setup()
    setAccessToken('token-123')
    mockedFetchCurrentUser.mockResolvedValue(alice)
    mockedListJourneys.mockResolvedValue([])

    renderJourneys()

    await screen.findByRole('heading', { name: 'Journeys' })
    await user.click(screen.getByRole('link', { name: 'New journey' }))

    expect(await screen.findByRole('heading', { name: 'Create a trip' })).toBeInTheDocument()
  })
})
