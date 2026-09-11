import { useEffect, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
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
  const query = (searchParams.get('query') ?? '').trim()
  const [draftQuery, setDraftQuery] = useState(query)

  useEffect(() => {
    setDraftQuery(query)
  }, [query])

  const journeysQuery = useQuery({
    queryKey: queryKeys.journeys.publicPage(page, query),
    queryFn: () =>
      listPublicJourneys(accessToken!, {
        page,
        size: PUBLIC_JOURNEYS_PAGE_SIZE,
        query,
      }),
    enabled: Boolean(accessToken),
    placeholderData: keepPreviousData,
  })

  const pageData = journeysQuery.data
  const journeys = pageData?.content ?? []
  const totalPages = pageData?.totalPages ?? 0
  const canGoPrevious = page > 0
  const canGoNext = totalPages > 0 && page < totalPages - 1

  function applySearchParams(nextQuery: string, nextPage: number) {
    const params = new URLSearchParams()
    const trimmedQuery = nextQuery.trim()
    if (trimmedQuery) {
      params.set('query', trimmedQuery)
    }
    if (nextPage > 0) {
      params.set('page', String(nextPage))
    }
    setSearchParams(params, { replace: false })
  }

  function runSearch(rawQuery: string) {
    const nextQuery = rawQuery.trim()
    setDraftQuery(nextQuery)

    if (nextQuery === query && page === 0) {
      void journeysQuery.refetch()
      return
    }

    applySearchParams(nextQuery, 0)
  }

  function goToPage(nextPage: number) {
    applySearchParams(query, nextPage)
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    runSearch(draftQuery)
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') {
      return
    }
    event.preventDefault()
    runSearch(event.currentTarget.value)
  }

  function clearSearch() {
    setDraftQuery('')
    if (!query && page === 0) {
      void journeysQuery.refetch()
      return
    }
    applySearchParams('', 0)
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="page-intro flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
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

          <form
            onSubmit={handleSearchSubmit}
            className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end"
            role="search"
          >
            <label htmlFor="explore-query" className="sr-only">
              Search journeys
            </label>
            <input
              id="explore-query"
              name="query"
              type="text"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="search by place"
              autoComplete="off"
              className="w-full min-w-[12rem] border border-[var(--color-line)] bg-[var(--color-paper)] px-3.5 py-2.5 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-sea)] sm:w-56"
            />
            <button
              type="submit"
              className="border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-2.5 text-[11px] font-medium tracking-[0.2em] text-[var(--color-ink)] uppercase transition hover:border-[var(--color-sea)]"
            >
              Search
            </button>
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="px-2 text-sm font-light text-[var(--color-stone)] transition hover:text-[var(--color-ink)]"
              >
                Clear
              </button>
            )}
          </form>
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
              {query
                ? `No public journeys match “${query}”.`
                : 'No public journeys yet. Share one of yours to appear here.'}
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
