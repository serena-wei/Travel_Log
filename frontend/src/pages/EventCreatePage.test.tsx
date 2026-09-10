import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEvent, fetchCurrentUser, uploadEventPhoto } from '../api/client'
import { AuthProvider } from '../auth/AuthContext'
import { clearIntentionalLogout } from '../auth/intentionalLogout'
import { RequireAuth } from '../auth/RequireAuth'
import { clearAccessToken, setAccessToken } from '../auth/token'
import { EventCreatePage } from './EventCreatePage'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    fetchCurrentUser: vi.fn(),
    createEvent: vi.fn(),
    uploadEventPhoto: vi.fn(),
    getJourney: vi.fn().mockResolvedValue({
      id: 10,
      ownerId: 1,
      ownerUsername: 'alice',
      ownerAvatarUrl: null,
      coverImageUrl: null,
      title: 'South Island',
      description: null,
      startDate: null,
      endDate: null,
      visibility: 'PRIVATE',
      createdAt: '2026-09-07T00:00:00Z',
      updatedAt: '2026-09-07T00:00:00Z',
    }),
  }
})

const mockedFetchCurrentUser = vi.mocked(fetchCurrentUser)
const mockedCreateEvent = vi.mocked(createEvent)
const mockedUploadEventPhoto = vi.mocked(uploadEventPhoto)

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

const createdEvent = {
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

function renderCreate() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/journeys/10/events/new']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/journeys/:journeyId/events/new"
              element={
                <RequireAuth>
                  <EventCreatePage />
                </RequireAuth>
              }
            />
            <Route
              path="/journeys/:journeyId/events/:eventId/edit"
              element={
                <RequireAuth>
                  <div>Event edit page</div>
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

describe('EventCreatePage', () => {
  beforeEach(() => {
    mockedFetchCurrentUser.mockReset()
    mockedCreateEvent.mockReset()
    mockedUploadEventPhoto.mockReset()
    clearAccessToken()
    clearIntentionalLogout()
  })

  it('creates an event and returns to the journey', async () => {
    const user = userEvent.setup()
    setAccessToken('token-123')
    mockedFetchCurrentUser.mockResolvedValue(alice)
    mockedCreateEvent.mockResolvedValue(createdEvent)

    renderCreate()

    expect(await screen.findByRole('heading', { name: 'Add event' })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Title/i), 'Flight NZ5373')
    await user.type(screen.getByLabelText(/^Description/i), 'Wellington to Christchurch')
    await user.type(screen.getByLabelText(/^Start/i), '2026-03-01T09:00')
    await user.type(screen.getByLabelText(/^End/i), '2026-03-01T10:20')
    await user.click(screen.getByRole('button', { name: 'Create event' }))

    await waitFor(() => {
      expect(mockedCreateEvent).toHaveBeenCalledWith('token-123', 10, {
        title: 'Flight NZ5373',
        description: 'Wellington to Christchurch',
        startAt: '2026-03-01T09:00',
        endAt: '2026-03-01T10:20',
      })
    })
    expect(await screen.findByText('Journey detail')).toBeInTheDocument()
  })

  it('opens edit when the event is created but photo upload fails', async () => {
    const user = userEvent.setup()
    setAccessToken('token-123')
    mockedFetchCurrentUser.mockResolvedValue(alice)
    mockedCreateEvent.mockResolvedValue(createdEvent)
    mockedUploadEventPhoto.mockRejectedValue(new Error('upload failed'))

    renderCreate()

    expect(await screen.findByRole('heading', { name: 'Add event' })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Title/i), 'Flight NZ5373')
    await user.type(screen.getByLabelText(/^Start/i), '2026-03-01T09:00')

    const file = new File([new Uint8Array([1, 2, 3])], 'flight.jpg', { type: 'image/jpeg' })
    const input = document.querySelector('input[type="file"]')
    expect(input).toBeTruthy()
    await user.upload(input as HTMLInputElement, file)

    await user.click(screen.getByRole('button', { name: 'Create event' }))

    await waitFor(() => {
      expect(mockedCreateEvent).toHaveBeenCalled()
      expect(mockedUploadEventPhoto).toHaveBeenCalled()
    })
    expect(await screen.findByText('Event edit page')).toBeInTheDocument()
  })
})
