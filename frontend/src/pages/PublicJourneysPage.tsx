import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  ApiError,
  listPublicJourneys,
  PUBLIC_JOURNEYS_PAGE_SIZE,
  type JourneyResponse,
} from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useAuth } from '../auth/useAuth'
import { AppShell } from '../components/AppShell'

export function PublicJourneysPage() {
  const { accessToken } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePageParam(searchParams.get('page'))

  const journeysQuery = useQuery({
    queryKey: queryKeys.journeys.publicPage(page),
    queryFn: () =>
      listPublicJourneys(accessToken!, { page, size: PUBLIC_JOURNEYS_PAGE_SIZE }),
    enabled: Boolean(accessToken),
    placeholderData: keepPreviousData,
  })

  const pageData = journeysQuery.data
  const journeys = pageData?.content ?? []
  const totalPages = pageData?.totalPages ?? 0
  const canGoPrevious = page > 0
  const canGoNext = totalPages > 0 && page < totalPages - 1

  function goToPage(nextPage: number) {
    setSearchParams(nextPage <= 0 ? {} : { page: String(nextPage) }, { replace: false })
  }

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

          {pageData && pageData.totalElements === 0 && (
            <p className="text-sm font-light text-[var(--color-stone)]">
              No public journeys yet. Share one of yours to appear here.
            </p>
          )}

          {pageData && journeys.length > 0 && (
            <>
              <ul className="space-y-3">
                {journeys.map((journey) => (
                  <li key={journey.id}>
                    <Link
                      to={`/explore/${journey.id}`}
                      className="interactive-entry flex gap-4 border border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-paper)_82%,transparent)] p-3 sm:gap-5 sm:p-4"
                    >
                      <CoverThumb journey={journey} />
                      <span className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
                        <p className="interactive-entry-title font-[family-name:var(--font-display)] text-xl font-medium tracking-wide text-[var(--color-ink)] transition-colors sm:text-2xl">
                          {journey.title}
                        </p>
                        {journey.description && (
                          <p className="mt-1.5 max-w-3xl text-sm font-light leading-relaxed text-[var(--color-stone)] line-clamp-2">
                            {journey.description}
                          </p>
                        )}
                        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--color-stone)]">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="font-light">by</span>
                            <OwnerChip
                              username={journey.ownerUsername}
                              avatarUrl={journey.ownerAvatarUrl}
                            />
                          </span>
                          {formatDateRange(journey.startDate, journey.endDate) && (
                            <>
                              <span aria-hidden="true" className="text-[var(--color-line)]">
                                ·
                              </span>
                              <span className="font-light tracking-wide">
                                {formatDateRange(journey.startDate, journey.endDate)}
                              </span>
                            </>
                          )}
                          <span className="interactive-entry-open ml-auto hidden text-[11px] font-medium tracking-[0.2em] uppercase sm:inline">
                            Open →
                          </span>
                        </p>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              <nav
                aria-label="Explore pagination"
                className="mt-8 flex items-center justify-center gap-4"
              >
                {totalPages > 1 && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={!canGoPrevious || journeysQuery.isFetching}
                      onClick={() => goToPage(page - 1)}
                      className="px-2 text-sm font-light text-[var(--color-stone)] transition hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      ←
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, index) => {
                        const isCurrent = index === page
                        return (
                          <button
                            key={index}
                            type="button"
                            aria-label={`Page ${index + 1}`}
                            aria-current={isCurrent ? 'page' : undefined}
                            disabled={journeysQuery.isFetching}
                            onClick={() => goToPage(index)}
                            className={
                              isCurrent
                                ? 'flex h-8 min-w-8 items-center justify-center bg-[var(--color-sea)] px-2 text-sm text-white'
                                : 'flex h-8 min-w-8 items-center justify-center px-2 text-sm font-light text-[var(--color-stone)] transition hover:text-[var(--color-ink)] disabled:opacity-40'
                            }
                          >
                            {index + 1}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      type="button"
                      disabled={!canGoNext || journeysQuery.isFetching}
                      onClick={() => goToPage(page + 1)}
                      className="px-2 text-sm font-light text-[var(--color-stone)] transition hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      →
                    </button>
                  </div>
                )}
                <p className="text-xs font-light tracking-wide text-[var(--color-stone)]">
                  {pageData.totalElements} journeys
                </p>
              </nav>
            </>
          )}
        </section>
      </main>
    </AppShell>
  )
}

function parsePageParam(value: string | null): number {
  if (value == null || value === '') {
    return 0
  }
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }
  return parsed
}

function CoverThumb({ journey }: { journey: JourneyResponse }) {
  if (journey.coverImageUrl) {
    return (
      <img
        src={journey.coverImageUrl}
        alt=""
        className="h-24 w-28 shrink-0 object-cover sm:h-28 sm:w-36"
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className="journey-mark flex h-24 w-28 shrink-0 items-end justify-center pb-2 sm:h-28 sm:w-36"
    >
      <span className="font-[family-name:var(--font-display)] text-3xl leading-none text-white/90">
        {journeyInitial(journey.title)}
      </span>
    </span>
  )
}

function OwnerChip({
  username,
  avatarUrl,
}: {
  username: string
  avatarUrl: string | null
}) {
  const initial = username.trim().charAt(0).toUpperCase() || '?'

  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-sea)]">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-5 w-5 shrink-0 rounded-full object-cover outline outline-1 outline-[var(--color-line)]"
        />
      ) : (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-sea-soft)] text-[10px] font-medium text-[var(--color-sea)] outline outline-1 outline-[var(--color-line)]">
          {initial}
        </span>
      )}
      {username}
    </span>
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
