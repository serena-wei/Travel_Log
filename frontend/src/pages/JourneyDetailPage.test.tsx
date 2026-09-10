import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchCurrentUser,
  getJourney,
  listEvents,
  loginUser,
  type JourneyResponse,
} from '../api/client'
import { AuthProvider } from '../auth/AuthContext'
import { clearIntentionalLogout } from '../auth/intentionalLogout'
import { RequireAuth } from '../auth/RequireAuth'
import { clearAccessToken, setAccessToken } from '../auth/token'
import { JourneyDetailPage } from './JourneyDetailPage'
import { DashboardPage } from './DashboardPage'
import { HomePage } from './HomePage'
import { LoginPage } from './LoginPage'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    fetchCurrentUser: vi.fn(),
    getJourney: vi.fn(),
    listEvents: vi.fn().mockResolvedValue([]),
    loginUser: vi.fn(),
  }
})

const mockedFetchCurrentUser = vi.mocked(fetchCurrentUser)
const mockedGetJourney = vi.mocked(getJourney)
const mockedListEvents = vi.mocked(listEvents)
const mockedLoginUser = vi.mocked(loginUser)

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

function renderDetail() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/journeys/10']}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <DashboardPage />
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

describe('JourneyDetailPage', () => {
  beforeEach(() => {
    mockedFetchCurrentUser.mockReset()
    mockedGetJourney.mockReset()
    mockedListEvents.mockReset()
    mockedListEvents.mockResolvedValue([])
    mockedLoginUser.mockReset()
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
    expect(screen.getByText('Road trip')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Title/i)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument()
    expect(screen.getByText('Timeline')).toBeInTheDocument()
    expect(screen.getByText('Flight NZ5373')).toBeInTheDocument()
    expect(screen.getByText('2026-03-01')).toBeInTheDocument()
    expect(screen.getByText('09:00')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Journeys' })).toHaveAttribute('href', '/journeys')
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/journeys/10/events/5/edit',
    )
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
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
    expect(screen.getByText('By alice')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Explore' })).toHaveAttribute('href', '/explore')
    expect(screen.getByRole('link', { name: /Day hike/i })).toHaveAttribute(
      'href',
      '/explore/10/events/5',
    )
    expect(screen.queryByRole('link', { name: 'New event' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('signs out to home, then logs in to the dashboard, not the detail page', async () => {
    const user = userEvent.setup()
    setAccessToken('token-123')
    mockedFetchCurrentUser.mockResolvedValue(alice)
    mockedGetJourney.mockResolvedValue(sampleJourney)
    mockedLoginUser.mockResolvedValue({
      accessToken: 'token-456',
      tokenType: 'Bearer',
      user: alice,
    })

    renderDetail()

    expect(await screen.findByRole('heading', { name: 'South Island' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'TravelLog' })).toBeInTheDocument()
    const [headerSignIn] = screen.getAllByRole('link', { name: 'Sign in' })
    await user.click(headerSignIn)

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Username/i), 'alice')
    await user.type(screen.getByLabelText(/^Password/i), 'Secret123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Your dashboard' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'South Island' })).not.toBeInTheDocument()
  })
})
