import { useEffect, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, deleteJourney, listJourneys } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useAuth } from '../auth/useAuth'
import { AppShell } from '../components/AppShell'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function JourneysPage() {
  const queryClient = useQueryClient()
  const { accessToken } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = (searchParams.get('query') ?? '').trim()
  const [draftQuery, setDraftQuery] = useState(query)
  const [pendingDelete, setPendingDelete] = useState<{ id: number; title: string } | null>(null)

  useEffect(() => {
    setDraftQuery(query)
  }, [query])

  const journeysQuery = useQuery({
    queryKey: queryKeys.journeys.mine(query),
    queryFn: () => listJourneys(accessToken!, { query }),
    enabled: Boolean(accessToken),
  })

  const deleteMutation = useMutation({
    mutationFn: (journeyId: number) => deleteJourney(accessToken!, journeyId),
    onSuccess: async (_void, journeyId) => {
      setPendingDelete(null)
      await queryClient.invalidateQueries({ queryKey: queryKeys.journeys.all })
      queryClient.removeQueries({ queryKey: queryKeys.journeys.detail(journeyId) })
      queryClient.removeQueries({ queryKey: queryKeys.events.all(journeyId) })
    },
  })

  function applySearchParams(nextQuery: string) {
    const params = new URLSearchParams()
    const trimmedQuery = nextQuery.trim()
    if (trimmedQuery) {
      params.set('query', trimmedQuery)
    }
    setSearchParams(params, { replace: false })
  }

  function runSearch(rawQuery: string) {
    const nextQuery = rawQuery.trim()
    setDraftQuery(nextQuery)
    if (nextQuery === query) {
      void journeysQuery.refetch()
      return
    }
    applySearchParams(nextQuery)
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
    if (!query) {
      void journeysQuery.refetch()
      return
    }
    applySearchParams('')
  }

  const journeys = journeysQuery.data ?? []

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="page-intro">
            <p className="mb-3 text-[11px] font-medium tracking-[0.28em] text-[var(--color-gold)] uppercase">
              Your journal
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-wide text-[var(--color-ink)] sm:text-5xl">
              Journeys
            </h1>
            <p className="mt-3 max-w-xl font-light text-[var(--color-stone)]">
              Open a trip to see its timeline, or edit details anytime.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-wrap items-center gap-2"
              role="search"
            >
              <label htmlFor="journeys-query" className="sr-only">
                Search journeys
              </label>
              <input
                id="journeys-query"
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
            <Link
              to="/journeys/new"
              className="bg-[var(--color-sea)] px-5 py-2.5 text-[11px] font-medium tracking-[0.2em] !text-white uppercase transition hover:bg-[var(--color-sea-deep)]"
            >
              New journey
            </Link>
          </div>
        </div>

        <section className="mt-12">
          {journeysQuery.isLoading && (
            <p className="text-sm font-light text-[var(--color-stone)]">Loading journeys…</p>
          )}

          {journeysQuery.isError && (
            <p role="alert" className="text-sm text-[var(--color-danger)]">
              {journeysQuery.error instanceof ApiError
                ? journeysQuery.error.message
                : 'Unable to load journeys right now.'}
            </p>
          )}

          {deleteMutation.isError && (
            <p role="alert" className="mb-4 text-sm text-[var(--color-danger)]">
              {deleteMutation.error instanceof ApiError
                ? deleteMutation.error.message
                : 'Unable to delete journey right now.'}
            </p>
          )}

          {journeysQuery.data && journeys.length === 0 && (
            <p className="text-sm font-light text-[var(--color-stone)]">
              {query ? (
                <>No journeys match “{query}”.</>
              ) : (
                <>
                  No journeys yet.{' '}
                  <Link
                    to="/journeys/new"
                    className="font-medium text-[var(--color-sea)] underline-offset-4 hover:underline"
                  >
                    Create your first one
                  </Link>
                  .
                </>
              )}
            </p>
          )}

          {journeys.length > 0 && (
            <ul className="space-y-3">
              {journeys.map((journey) => (
                <li
                  key={journey.id}
                  className="interactive-entry flex flex-col gap-3 border border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-paper)_82%,transparent)] p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5"
                >
                  <Link
                    to={`/journeys/${journey.id}`}
                    className="flex min-w-0 flex-1 gap-4"
                  >
                    {journey.coverImageUrl ? (
                      <img
                        src={journey.coverImageUrl}
                        alt=""
                        className="h-24 w-28 shrink-0 object-cover sm:h-28 sm:w-36"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="journey-mark flex h-24 w-28 shrink-0 items-end justify-center pb-2 sm:h-28 sm:w-36"
                      >
                        <span className="font-[family-name:var(--font-display)] text-3xl leading-none text-white/90">
                          {journeyInitial(journey.title)}
                        </span>
                      </span>
                    )}
                    <span className="min-w-0 flex-1 self-center">
                      <p className="interactive-entry-title font-[family-name:var(--font-display)] text-2xl font-medium tracking-wide text-[var(--color-ink)] transition-colors">
                        {journey.title}
                      </p>
                      {journey.description && (
                        <p className="mt-1 max-w-3xl text-sm font-light text-[var(--color-stone)] line-clamp-2">
                          {journey.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tracking-[0.16em] uppercase">
                        <span
                          className={
                            journey.visibility === 'PUBLIC'
                              ? 'text-[var(--color-gold)]'
                              : 'text-[var(--color-stone)]'
                          }
                        >
                          {journey.visibility === 'PRIVATE' ? 'Private' : 'Public'}
                        </span>
                        {formatDateRange(journey.startDate, journey.endDate) && (
                          <span className="text-[var(--color-stone)]">
                            {formatDateRange(journey.startDate, journey.endDate)}
                          </span>
                        )}
                      </div>
                    </span>
                    <span className="interactive-entry-open hidden shrink-0 self-center text-[11px] font-medium tracking-[0.2em] text-[var(--color-stone)] uppercase sm:inline">
                      Open →
                    </span>
                  </Link>
                  <div className="flex shrink-0 items-center gap-3">
                    <Link
                      to={`/journeys/${journey.id}/edit`}
                      className="border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-2 text-[11px] font-medium tracking-[0.2em] text-[var(--color-ink)] uppercase transition hover:border-[var(--color-sea)]"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPendingDelete({ id: journey.id, title: journey.title })}
                      disabled={deleteMutation.isPending}
                      className="border border-[var(--color-danger)] bg-[var(--color-paper)] px-4 py-2 text-[11px] font-medium tracking-[0.2em] text-[var(--color-danger)] uppercase transition hover:bg-[color-mix(in_srgb,var(--color-danger)_8%,white)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <ConfirmDialog
        open={pendingDelete != null}
        title={pendingDelete ? `Delete “${pendingDelete.title}”?` : 'Delete journey?'}
        description="This cannot be undone. Events and photos on this journey will be removed."
        busy={deleteMutation.isPending}
        onCancel={() => {
          if (!deleteMutation.isPending) {
            setPendingDelete(null)
          }
        }}
        onConfirm={() => {
          if (pendingDelete) {
            deleteMutation.mutate(pendingDelete.id)
          }
        }}
      />
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
