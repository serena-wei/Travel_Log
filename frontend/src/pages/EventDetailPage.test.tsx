import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser, getEvent, type EventResponse } from '../api/client'
import { AuthProvider } from '../auth/AuthContext'
import { clearIntentionalLogout } from '../auth/intentionalLogout'
import { RequireAuth } from '../auth/RequireAuth'
import { clearAccessToken, setAccessToken } from '../auth/token'
import { EventDetailPage } from './EventDetailPage'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    fetchCurrentUser: vi.fn(),
    getEvent: vi.fn(),
  }
})

const mockedFetchCurrentUser = vi.mocked(fetchCurrentUser)
const mockedGetEvent = vi.mocked(getEvent)

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

const sampleEvent: EventResponse = {
  id: 5,
  journeyId: 10,
  title: 'Flight NZ5373',
  description: 'Wellington to Christchurch',
  startAt: '2026-03-01T09:00:00',
  endAt: '2026-03-01T10:20:00',
  photos: [],
  createdAt: '2026-09-08T00:00:00Z',
  updatedAt: '2026-09-08T00:00:00Z',
}

function renderDetail() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/journeys/10/events/5']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/journeys/:journeyId/events/:eventId"
              element={
                <RequireAuth>
                  <EventDetailPage />
                </RequireAuth>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EventDetailPage', () => {
  beforeEach(() => {
    mockedFetchCurrentUser.mockReset()
    mockedGetEvent.mockReset()
    clearAccessToken()
    clearIntentionalLogout()
  })

  it('shows a read-only event with edit link', async () => {
    setAccessToken('token-123')
    mockedFetchCurrentUser.mockResolvedValue(alice)
    mockedGetEvent.mockResolvedValue(sampleEvent)

    renderDetail()

    expect(await screen.findByRole('heading', { name: 'Flight NZ5373' })).toBeInTheDocument()
    expect(screen.getByText('Wellington to Christchurch')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Title/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Journey' })).toHaveAttribute('href', '/journeys/10')
  })
})
