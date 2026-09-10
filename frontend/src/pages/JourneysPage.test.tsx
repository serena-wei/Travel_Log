import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser, deleteJourney, listJourneys, type JourneyResponse } from '../api/client'
import { AuthProvider } from '../auth/AuthContext'
import { RequireAuth } from '../auth/RequireAuth'
import { clearAccessToken, setAccessToken } from '../auth/token'
import { JourneysPage } from './JourneysPage'
import { LoginPage } from './LoginPage'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    fetchCurrentUser: vi.fn(),
    listJourneys: vi.fn(),
    deleteJourney: vi.fn(),
    createJourney: vi.fn(),
    loginUser: vi.fn(),
  }
})

const mockedFetchCurrentUser = vi.mocked(fetchCurrentUser)
const mockedListJourneys = vi.mocked(listJourneys)
const mockedDeleteJourney = vi.mocked(deleteJourney)

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
            <Route path="/journeys/:id/edit" element={<div>Edit journey page</div>} />
            <Route path="/journeys/:id" element={<div>Journey detail page</div>} />
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
    mockedDeleteJourney.mockReset()
    clearAccessToken()
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

  it('opens detail from the title and supports edit and delete actions', async () => {
    const user = userEvent.setup()
    setAccessToken('token-123')
    mockedFetchCurrentUser.mockResolvedValue(alice)
    mockedListJourneys.mockResolvedValue([sampleJourney])
    mockedDeleteJourney.mockResolvedValue()

    renderJourneys()

    expect(await screen.findByText('South Island')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /South Island/i })).toHaveAttribute(
      'href',
      '/journeys/10',
    )
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/journeys/10/edit')

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => {
      expect(mockedDeleteJourney).toHaveBeenCalledWith('token-123', 10)
    })
  })
})
