import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { HomePage } from '../pages/HomePage'

vi.mock('../api/client', () => ({
  fetchHealth: vi.fn().mockResolvedValue({
    status: 'UP',
    service: 'TravelLog',
    timestamp: '2026-09-06T00:00:00Z',
  }),
}))

describe('HomePage', () => {
  it('renders TravelLog brand and health status', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('heading', { name: 'TravelLog' })).toBeInTheDocument()
    expect(await screen.findByText('UP')).toBeInTheDocument()
    expect(screen.getByText('TravelLog', { selector: 'dd' })).toBeInTheDocument()
  })
})
