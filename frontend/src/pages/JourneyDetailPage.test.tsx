import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchCurrentUser,
  getJourney,
  listEvents,
  type JourneyResponse,
} from '../api/client'
import { AuthProvider } from '../auth/AuthContext'
import { clearIntentionalLogout } from '../auth/intentionalLogout'
import { RequireAuth } from '../auth/RequireAuth'
import { clearAccessToken, setAccessToken } from '../auth/token'
import { JourneyDetailPage } from './JourneyDetailPage'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    fetchCurrentUser: vi.fn(),
    getJourney: vi.fn(),
    listEvents: vi.fn().mockResolvedValue([]),
  }
})

const mockedFetchCurrentUser = vi.mocked(fetchCurrentUser)
const mockedGetJourney = vi.mocked(getJourney)
const mockedListEvents = vi.mocked(listEvents)

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
  ownerAvatarUrl: null,
  coverImageUrl: null,
  title: 'South Island',
  description: 'Road trip',
  startDate: '2026-01-10',
  endDate: '2026-01-20',
  visibility: 'PRIVATE',
  createdAt: '2026-09-07T00:00:00Z',
  updatedAt: '2026-09-07T00:00:00Z',
}

function renderDetail() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/journeys/10']}>
        <AuthProvider>
          <Routes>
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

describe('JourneyDetailPage', () => {
  beforeEach(() => {
    mockedFetchCurrentUser.mockReset()
    mockedGetJourney.mockReset()
    mockedListEvents.mockReset()
    mockedListEvents.mockResolvedValue([])
    clearAccessToken()
    clearIntentionalLogout()
  })

  it('shows a read-only journey summary and events section', async () => {
    setAccessToken('token-123')
    mockedFetchCurrentUser.mockResolvedValue(alice)
    mockedGetJourney.mockResolvedValue(sampleJourney)
    mockedListEvents.mockResolvedValue([
      {
        id: 5,
        journeyId: 10,
        title: 'Flight NZ5373',
        description: null,
        startAt: '2026-03-01T09:00:00',
        endAt: null,
        photos: [],
        createdAt: '2026-09-08T00:00:00Z',
        updatedAt: '2026-09-08T00:00:00Z',
      },
    ])

    renderDetail()

    expect(await screen.findByRole('heading', { name: 'South Island' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/Title/i)).not.toBeInTheDocument()
    expect(screen.getByText('Flight NZ5373')).toBeInTheDocument()
  })

  it('hides edit controls on the explore route', async () => {
    setAccessToken('token-123')
    mockedFetchCurrentUser.mockResolvedValue(alice)
    mockedGetJourney.mockResolvedValue({ ...sampleJourney, visibility: 'PUBLIC' })
    mockedListEvents.mockResolvedValue([
      {
        id: 5,
        journeyId: 10,
        title: 'Day hike',
        description: null,
        startAt: '2026-01-12T09:00:00',
        endAt: null,
        photos: [],
        createdAt: '2026-09-08T00:00:00Z',
        updatedAt: '2026-09-08T00:00:00Z',
      },
    ])

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/explore/10']}>
          <AuthProvider>
            <Routes>
              <Route
                path="/explore/:id"
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

    expect(await screen.findByRole('heading', { name: 'South Island' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Day hike/i })).toHaveAttribute(
      'href',
      '/explore/10/events/5',
    )
    expect(screen.queryByRole('link', { name: 'New event' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })
})
