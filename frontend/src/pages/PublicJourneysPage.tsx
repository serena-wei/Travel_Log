import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ApiError, listPublicJourneys } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useAuth } from '../auth/useAuth'

export function PublicJourneysPage() {
  const navigate = useNavigate()
  const { user, accessToken, logout } = useAuth()

  const journeysQuery = useQuery({
    queryKey: queryKeys.journeys.public,
    queryFn: () => listPublicJourneys(accessToken!),
    enabled: Boolean(accessToken),
  })

  function handleLogout() {
    logout()
    void navigate('/', { replace: true })
  }

  return (
    <div className="min-h-svh bg-[var(--color-fog)]">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-paper)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5 sm:px-10">
          <Link
            to="/"
            className="font-[family-name:var(--font-display)] text-2xl font-medium tracking-[0.18em] uppercase"
          >
            TravelLog
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm tracking-wide text-[var(--color-stone)] sm:inline">
              {user?.username}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="border border-[var(--color-line)] px-4 py-2 text-[11px] font-medium tracking-[0.2em] text-[var(--color-ink)] uppercase transition hover:border-[var(--color-sea)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-3 text-[11px] font-medium tracking-[0.28em] text-[var(--color-gold)] uppercase">
              Community
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-wide text-[var(--color-ink)] sm:text-5xl">
              Explore
            </h1>
            <p className="mt-3 max-w-xl font-light text-[var(--color-stone)]">
              Browse public journeys, newest updates first. Editing stays in My journeys.
            </p>
          </div>
          <Link
            to="/journeys"
            className="shrink-0 border border-[var(--color-line)] px-5 py-3 text-[11px] font-medium tracking-[0.2em] text-[var(--color-ink)] uppercase transition hover:border-[var(--color-sea)]"
          >
            My journeys
          </Link>
        </div>

        <section className="mt-12">
          {journeysQuery.isLoading && (
            <p className="text-sm font-light text-[var(--color-stone)]">Loading public journeys…</p>
          )}

          {journeysQuery.isError && (
            <p role="alert" className="text-sm text-[var(--color-danger)]">
              {journeysQuery.error instanceof ApiError
                ? journeysQuery.error.message
                : 'Unable to load public journeys right now.'}
            </p>
          )}

          {journeysQuery.data && journeysQuery.data.length === 0 && (
            <p className="text-sm font-light text-[var(--color-stone)]">
              No public journeys yet. Share one of yours to appear here.
            </p>
          )}

          {journeysQuery.data && journeysQuery.data.length > 0 && (
            <ul className="divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
              {journeysQuery.data.map((journey) => (
                <li key={journey.id} className="py-5">
                  <Link
                    to={`/explore/${journey.id}`}
                    className="block min-w-0 transition hover:opacity-80"
                  >
                    <p className="font-[family-name:var(--font-display)] text-2xl font-medium tracking-wide text-[var(--color-ink)]">
                      {journey.title}
                    </p>
                    {journey.description && (
                      <p className="mt-1 max-w-2xl text-sm font-light text-[var(--color-stone)] line-clamp-2">
                        {journey.description}
                      </p>
                    )}
                    <div className="mt-2 text-[11px] tracking-[0.16em] text-[var(--color-stone)] uppercase">
                      <span>By {journey.ownerUsername}</span>
                      {formatDateRange(journey.startDate, journey.endDate) && (
                        <span className="ml-3">
                          {formatDateRange(journey.startDate, journey.endDate)}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

function formatDateRange(startDate: string | null, endDate: string | null): string | null {
  if (!startDate && !endDate) {
    return null
  }
  if (startDate && endDate) {
    return `${startDate} → ${endDate}`
  }
  return startDate ?? endDate
}
