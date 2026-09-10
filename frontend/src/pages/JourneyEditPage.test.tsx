import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchCurrentUser,
  getJourney,
  listJourneys,
  updateJourney,
  type JourneyResponse,
} from '../api/client'
import { AuthProvider } from '../auth/AuthContext'
import { clearIntentionalLogout } from '../auth/intentionalLogout'
import { RequireAuth } from '../auth/RequireAuth'
import { clearAccessToken, setAccessToken } from '../auth/token'
import { JourneyDetailPage } from './JourneyDetailPage'
import { JourneyEditPage } from './JourneyEditPage'
import { JourneysPage } from './JourneysPage'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    fetchCurrentUser: vi.fn(),
    getJourney: vi.fn(),
    updateJourney: vi.fn(),
    listJourneys: vi.fn().mockResolvedValue([]),
    listEvents: vi.fn().mockResolvedValue([]),
  }
})

const mockedFetchCurrentUser = vi.mocked(fetchCurrentUser)
const mockedGetJourney = vi.mocked(getJourney)
const mockedUpdateJourney = vi.mocked(updateJourney)
const mockedListJourneys = vi.mocked(listJourneys)

const alice = {
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
}

const sampleJourney: JourneyResponse = {
  id: 10,
  ownerId: 1,
  ownerUsername: 'alice',
  title: 'South Island',
  description: 'Road trip',
  startDate: '2026-01-10',
  endDate: '2026-01-20',
  visibility: 'PRIVATE',
  createdAt: '2026-09-07T00:00:00Z',
  updatedAt: '2026-09-07T00:00:00Z',
}

function renderEdit() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/journeys/10/edit']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/journeys/:id/edit"
              element={
                <RequireAuth>
                  <JourneyEditPage />
                </RequireAuth>
              }
            />
            <Route
              path="/journeys"
              element={
                <RequireAuth>
                  <JourneysPage />
                </RequireAuth>
              }
            />
            <Route
              path="/journeys/:id"
              element={
                <RequireAuth>
                  <JourneyDetailPage />
                </RequireAuth>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('JourneyEditPage', () => {
  beforeEach(() => {
    mockedFetchCurrentUser.mockReset()
    mockedGetJourney.mockReset()
    mockedUpdateJourney.mockReset()
    mockedListJourneys.mockReset()
    mockedListJourneys.mockResolvedValue([])
    clearAccessToken()
    clearIntentionalLogout()
  })

  it('loads and saves journey edits then returns to the list', async () => {
    const user = userEvent.setup()
    setAccessToken('token-123')
    mockedFetchCurrentUser.mockResolvedValue(alice)
    mockedGetJourney.mockResolvedValue(sampleJourney)
    mockedListJourneys.mockResolvedValue([
      {
        ...sampleJourney,
        title: 'Fiordland',
        description: 'Updated notes',
      },
    ])
    mockedUpdateJourney.mockResolvedValue({
      ...sampleJourney,
      title: 'Fiordland',
      description: 'Updated notes',
    })

    renderEdit()

    expect(await screen.findByDisplayValue('South Island')).toBeInTheDocument()
    await user.clear(screen.getByLabelText(/Title/i))
    await user.type(screen.getByLabelText(/Title/i), 'Fiordland')
    await user.clear(screen.getByLabelText(/Description/i))
    await user.type(screen.getByLabelText(/Description/i), 'Updated notes')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(mockedUpdateJourney).toHaveBeenCalledWith('token-123', 10, {
        title: 'Fiordland',
        description: 'Updated notes',
        startDate: '2026-01-10',
        endDate: '2026-01-20',
        visibility: 'PRIVATE',
      })
    })
    expect(await screen.findByRole('heading', { name: 'Journeys' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/Title/i)).not.toBeInTheDocument()
  })
})
