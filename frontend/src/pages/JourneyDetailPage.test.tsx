import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteJourney,
  fetchCurrentUser,
  getJourney,
  listJourneys,
  loginUser,
  updateJourney,
  type JourneyResponse,
} from '../api/client'
import { AuthProvider } from '../auth/AuthContext'
import { clearIntentionalLogout } from '../auth/intentionalLogout'
import { RequireAuth } from '../auth/RequireAuth'
import { clearAccessToken, setAccessToken } from '../auth/token'
import { JourneyDetailPage } from './JourneyDetailPage'
import { JourneysPage } from './JourneysPage'
import { LoginPage } from './LoginPage'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    fetchCurrentUser: vi.fn(),
    getJourney: vi.fn(),
    updateJourney: vi.fn(),
    deleteJourney: vi.fn(),
    listJourneys: vi.fn().mockResolvedValue([]),
    loginUser: vi.fn(),
  }
})

const mockedFetchCurrentUser = vi.mocked(fetchCurrentUser)
const mockedGetJourney = vi.mocked(getJourney)
const mockedUpdateJourney = vi.mocked(updateJourney)
const mockedDeleteJourney = vi.mocked(deleteJourney)
const mockedListJourneys = vi.mocked(listJourneys)
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
    mockedUpdateJourney.mockReset()
    mockedDeleteJourney.mockReset()
    mockedListJourneys.mockReset()
    mockedListJourneys.mockResolvedValue([sampleJourney])
    mockedLoginUser.mockReset()
    clearAccessToken()
    clearIntentionalLogout()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('loads and saves journey edits', async () => {
    const user = userEvent.setup()
    setAccessToken('token-123')
    mockedFetchCurrentUser.mockResolvedValue(alice)
    mockedGetJourney.mockResolvedValue(sampleJourney)
    mockedUpdateJourney.mockResolvedValue({
      ...sampleJourney,
      title: 'Fiordland',
      description: 'Updated notes',
    })

    renderDetail()

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
    expect(await screen.findByRole('status')).toHaveTextContent('Saved')
  })

  it('deletes a journey and returns to the list', async () => {
    const user = userEvent.setup()
    setAccessToken('token-123')
    mockedFetchCurrentUser.mockResolvedValue(alice)
    mockedGetJourney.mockResolvedValue(sampleJourney)
    mockedDeleteJourney.mockResolvedValue()

    renderDetail()

    expect(await screen.findByDisplayValue('South Island')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(mockedDeleteJourney).toHaveBeenCalledWith('token-123', 10)
    })
    expect(await screen.findByRole('heading', { name: 'Journeys' })).toBeInTheDocument()
  })

  it('signs out then logs in to the journeys list, not the edit page', async () => {
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

    expect(await screen.findByDisplayValue('South Island')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Username/i), 'alice')
    await user.type(screen.getByLabelText(/^Password/i), 'Secret123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Journeys' })).toBeInTheDocument()
    expect(screen.queryByDisplayValue('South Island')).not.toBeInTheDocument()
  })
})
