import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser, getEvent, updateEvent, type EventResponse } from '../api/client'
import { AuthProvider } from '../auth/AuthContext'
import { clearIntentionalLogout } from '../auth/intentionalLogout'
import { RequireAuth } from '../auth/RequireAuth'
import { clearAccessToken, setAccessToken } from '../auth/token'
import { EventEditPage } from './EventEditPage'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    fetchCurrentUser: vi.fn(),
    getEvent: vi.fn(),
    getJourney: vi.fn().mockResolvedValue({
      id: 10,
      title: 'South Island',
      description: null,
      startDate: null,
      endDate: null,
      visibility: 'PRIVATE',
      createdAt: '2026-09-07T00:00:00Z',
      updatedAt: '2026-09-07T00:00:00Z',
    }),
    updateEvent: vi.fn(),
  }
})

const mockedFetchCurrentUser = vi.mocked(fetchCurrentUser)
const mockedGetEvent = vi.mocked(getEvent)
const mockedUpdateEvent = vi.mocked(updateEvent)

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

function renderEdit() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/journeys/10/events/5/edit']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/journeys/:journeyId/events/:eventId/edit"
              element={
                <RequireAuth>
                  <EventEditPage />
                </RequireAuth>
              }
            />
            <Route path="/journeys/:id" element={<div>Journey detail</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EventEditPage', () => {
  beforeEach(() => {
    mockedFetchCurrentUser.mockReset()
    mockedGetEvent.mockReset()
    mockedUpdateEvent.mockReset()
    clearAccessToken()
    clearIntentionalLogout()
  })

  it('loads and saves event edits then returns to the journey', async () => {
    const user = userEvent.setup()
    setAccessToken('token-123')
    mockedFetchCurrentUser.mockResolvedValue(alice)
    mockedGetEvent.mockResolvedValue(sampleEvent)
    mockedUpdateEvent.mockResolvedValue({
      ...sampleEvent,
      title: 'Flight Updated',
      description: 'Updated notes',
    })

    renderEdit()

    expect(await screen.findByDisplayValue('Flight NZ5373')).toBeInTheDocument()
    await user.clear(screen.getByLabelText(/Title/i))
    await user.type(screen.getByLabelText(/Title/i), 'Flight Updated')
    await user.clear(screen.getByLabelText(/^Description/i))
    await user.type(screen.getByLabelText(/^Description/i), 'Updated notes')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(mockedUpdateEvent).toHaveBeenCalledWith('token-123', 10, 5, {
        title: 'Flight Updated',
        description: 'Updated notes',
        startAt: '2026-03-01T09:00',
        endAt: '2026-03-01T10:20',
      })
    })
    expect(await screen.findByText('Journey detail')).toBeInTheDocument()
  })
})
