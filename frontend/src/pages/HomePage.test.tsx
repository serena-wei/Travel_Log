import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../auth/AuthContext'
import { HomePage } from '../pages/HomePage'

describe('HomePage', () => {
  it('renders a single-screen hero with register CTA', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <HomePage />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'TravelLog' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start your journal' })).toHaveAttribute(
      'href',
      '/register',
    )
    expect(
      screen.getByText(
        'Save your travel memories, share the journeys you love, and connect with a community of travellers.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Your trips, in one place' })).not.toBeInTheDocument()
    expect(screen.queryByText(/^API$/i)).not.toBeInTheDocument()
  })
})
