import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, deleteJourney, listJourneys } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useAuth } from '../auth/useAuth'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function JourneysPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, accessToken, logout } = useAuth()
  const [pendingDelete, setPendingDelete] = useState<{ id: number; title: string } | null>(null)

  const journeysQuery = useQuery({
    queryKey: queryKeys.journeys.all,
    queryFn: () => listJourneys(accessToken!),
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
            <Link
              to="/explore"
              className="text-[11px] font-medium tracking-[0.2em] text-[var(--color-sea)] uppercase transition hover:text-[var(--color-sea-deep)]"
            >
              Explore
            </Link>
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
              Your journal
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-wide text-[var(--color-ink)] sm:text-5xl">
              Journeys
            </h1>
            <p className="mt-3 max-w-xl font-light text-[var(--color-stone)]">
              Open a trip to see its timeline, or edit details anytime.
            </p>
          </div>
          <Link
            to="/journeys/new"
            className="shrink-0 bg-[var(--color-sea)] px-5 py-3 text-[11px] font-medium tracking-[0.2em] !text-white uppercase transition hover:bg-[var(--color-sea-deep)]"
          >
            New journey
          </Link>
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

          {journeysQuery.data && journeysQuery.data.length === 0 && (
            <p className="text-sm font-light text-[var(--color-stone)]">
              No journeys yet.{' '}
              <Link
                to="/journeys/new"
                className="font-medium text-[var(--color-sea)] underline-offset-4 hover:underline"
              >
                Create your first one
              </Link>
              .
            </p>
          )}

          {journeysQuery.data && journeysQuery.data.length > 0 && (
            <ul className="divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
              {journeysQuery.data.map((journey) => (
                <li
                  key={journey.id}
                  className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                >
                  <Link
                    to={`/journeys/${journey.id}`}
                    className="min-w-0 flex-1 transition hover:opacity-80"
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
                      <span>{journey.visibility === 'PRIVATE' ? 'Private' : 'Public'}</span>
                      {formatDateRange(journey.startDate, journey.endDate) && (
                        <span className="ml-3">
                          {formatDateRange(journey.startDate, journey.endDate)}
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-3">
                    <Link
                      to={`/journeys/${journey.id}/edit`}
                      className="border border-[var(--color-line)] px-4 py-2 text-[11px] font-medium tracking-[0.2em] text-[var(--color-ink)] uppercase transition hover:border-[var(--color-sea)]"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPendingDelete({ id: journey.id, title: journey.title })}
                      disabled={deleteMutation.isPending}
                      className="border border-[var(--color-danger)] px-4 py-2 text-[11px] font-medium tracking-[0.2em] text-[var(--color-danger)] uppercase transition hover:bg-[color-mix(in_srgb,var(--color-danger)_8%,white)] disabled:cursor-not-allowed disabled:opacity-60"
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
