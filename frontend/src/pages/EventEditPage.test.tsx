import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteEventPhoto,
  fetchCurrentUser,
  getEvent,
  replaceEventPhoto,
  updateEvent,
  type EventResponse,
} from '../api/client'
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
    updateEvent: vi.fn(),
    replaceEventPhoto: vi.fn(),
    deleteEventPhoto: vi.fn(),
  }
})

const mockedFetchCurrentUser = vi.mocked(fetchCurrentUser)
const mockedGetEvent = vi.mocked(getEvent)
const mockedUpdateEvent = vi.mocked(updateEvent)
const mockedReplaceEventPhoto = vi.mocked(replaceEventPhoto)
const mockedDeleteEventPhoto = vi.mocked(deleteEventPhoto)

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

const sampleEvent: EventResponse = {
  id: 5,
  journeyId: 10,
  title: 'Flight NZ5373',
  description: 'Wellington to Christchurch',
  startAt: '2026-03-01T09:00:00',
  endAt: '2026-03-01T10:20:00',
  photos: [
    {
      id: 9,
      url: 'https://example.test/photo.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 1000,
      sortOrder: 0,
      createdAt: '2026-09-08T00:00:00Z',
    },
  ],
  createdAt: '2026-09-08T00:00:00Z',
  updatedAt: '2026-09-08T00:00:00Z',
}

function renderEdit(initialEntry: string | { pathname: string; state?: object } = '/journeys/10/events/5/edit') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
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
    mockedReplaceEventPhoto.mockReset()
    mockedDeleteEventPhoto.mockReset()
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
    expect(screen.getByRole('button', { name: 'Replace' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete selected' })).toBeInTheDocument()
    expect(screen.getByLabelText('Add photos')).toBeInTheDocument()
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

  it('replaces an existing photo immediately', async () => {
    const user = userEvent.setup()
    setAccessToken('token-123')
    mockedFetchCurrentUser.mockResolvedValue(alice)
    mockedGetEvent.mockResolvedValue(sampleEvent)
    mockedReplaceEventPhoto.mockResolvedValue({
      photoId: 9,
      uploadUrl: 'https://example.test/upload',
      objectKey: 'users/1/journeys/10/events/5/new.jpg',
      contentType: 'image/jpeg',
      sortOrder: 0,
    })

    renderEdit()

    await user.click(await screen.findByRole('button', { name: 'Replace' }))
    const file = new File(['new-bytes'], 'new.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByTestId('replace-photo-input'), file)

    await waitFor(() => {
      expect(mockedReplaceEventPhoto).toHaveBeenCalledWith('token-123', 10, 5, 9, file)
    })
  })

  it('shows a warning when opened after create photo upload failed', async () => {
    setAccessToken('token-123')
    mockedFetchCurrentUser.mockResolvedValue(alice)
    mockedGetEvent.mockResolvedValue({ ...sampleEvent, photos: [] })

    renderEdit({
      pathname: '/journeys/10/events/5/edit',
      state: {
        eventPhotoUploadWarning:
          'Event created, but photos could not be uploaded. You can add them on the edit page.',
      },
    })

    expect(
      await screen.findByText(
        'Event created, but photos could not be uploaded. You can add them on the edit page.',
      ),
    ).toBeInTheDocument()
  })

  it('deletes selected photos after confirm', async () => {
    const user = userEvent.setup()
    setAccessToken('token-123')
    mockedFetchCurrentUser.mockResolvedValue(alice)
    mockedGetEvent.mockResolvedValue({
      ...sampleEvent,
      photos: [
        sampleEvent.photos[0],
        {
          id: 10,
          url: 'https://example.test/photo-2.jpg',
          contentType: 'image/jpeg',
          sizeBytes: 1200,
          sortOrder: 1,
          createdAt: '2026-09-08T00:00:00Z',
        },
      ],
    })
    mockedDeleteEventPhoto.mockResolvedValue()

    renderEdit()

    await user.click(await screen.findByRole('button', { name: 'Select photo 9' }))
    await user.click(screen.getByRole('button', { name: 'Select photo 10' }))
    await user.click(screen.getByRole('button', { name: 'Delete selected (2)' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('Delete 2 photos?')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(mockedDeleteEventPhoto).toHaveBeenCalledWith('token-123', 10, 5, 9)
      expect(mockedDeleteEventPhoto).toHaveBeenCalledWith('token-123', 10, 5, 10)
    })
  })
})
