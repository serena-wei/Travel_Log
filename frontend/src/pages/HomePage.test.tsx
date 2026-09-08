import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthContext'
import { HomePage } from '../pages/HomePage'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    fetchHealth: vi.fn().mockResolvedValue({
      status: 'UP',
      serviceName: 'TravelLog',
      timestamp: '2026-09-06T00:00:00Z',
    }),
  }
})

describe('HomePage', () => {
  it('renders TravelLog brand hero and login CTA', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AuthProvider>
            <HomePage />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('heading', { name: 'TravelLog' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start your journal' })).toHaveAttribute('href', '/login')
    expect(await screen.findByText('UP')).toBeInTheDocument()
  })
})
