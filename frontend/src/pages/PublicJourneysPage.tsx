import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ApiError, listPublicJourneys } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useAuth } from '../auth/useAuth'
import { AppShell } from '../components/AppShell'

export function PublicJourneysPage() {
  const { accessToken } = useAuth()

  const journeysQuery = useQuery({
    queryKey: queryKeys.journeys.public,
    queryFn: () => listPublicJourneys(accessToken!),
    enabled: Boolean(accessToken),
  })

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="page-intro">
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
            <ul className="space-y-3">
              {journeysQuery.data.map((journey) => (
                <li key={journey.id}>
                  <Link
                    to={`/explore/${journey.id}`}
                    className="interactive-entry flex gap-4 border border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-paper)_82%,transparent)] p-4 sm:items-stretch sm:p-5"
                  >
                    <span
                      aria-hidden="true"
                      className="journey-mark hidden h-auto min-h-20 w-16 shrink-0 items-end justify-center pb-2 sm:flex"
                    >
                      <span className="font-[family-name:var(--font-display)] text-3xl leading-none text-white/90">
                        {journeyInitial(journey.title)}
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col justify-center sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                      <span className="min-w-0">
                        <p className="interactive-entry-title font-[family-name:var(--font-display)] text-2xl font-medium tracking-wide text-[var(--color-ink)] transition-colors">
                          {journey.title}
                        </p>
                        {journey.description && (
                          <p className="mt-1 max-w-3xl text-sm font-light text-[var(--color-stone)] line-clamp-2">
                            {journey.description}
                          </p>
                        )}
                      </span>
                      <span className="mt-3 flex shrink-0 items-center gap-6 text-[11px] tracking-[0.16em] text-[var(--color-stone)] uppercase sm:mt-0">
                        <span className="sm:text-right">
                          <span className="block text-[var(--color-gold)]">By {journey.ownerUsername}</span>
                          {formatDateRange(journey.startDate, journey.endDate) && (
                            <span className="mt-1 block">
                              {formatDateRange(journey.startDate, journey.endDate)}
                            </span>
                          )}
                        </span>
                        <span className="interactive-entry-open hidden font-medium tracking-[0.2em] sm:inline">
                          Open →
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  )
}

function journeyInitial(title: string): string {
  const trimmed = title.trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : '·'
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
