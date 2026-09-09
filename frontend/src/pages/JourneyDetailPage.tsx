import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, deleteEvent, getJourney, listEvents } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useAuth } from '../auth/useAuth'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function JourneyDetailPage() {
  const { id } = useParams()
  const journeyId = Number(id)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { accessToken, logout } = useAuth()
  const [pendingDelete, setPendingDelete] = useState<{ id: number; title: string } | null>(null)

  const readOnly = location.pathname.startsWith('/explore')
  const backTo = readOnly ? '/explore' : '/journeys'
  const backLabel = readOnly ? '← Explore' : '← Journeys'
  const eventPath = (eventId: number) =>
    readOnly
      ? `/explore/${journeyId}/events/${eventId}`
      : `/journeys/${journeyId}/events/${eventId}`

  const journeyQuery = useQuery({
    queryKey: queryKeys.journeys.detail(journeyId),
    queryFn: () => getJourney(accessToken!, journeyId),
    enabled: Boolean(accessToken) && Number.isFinite(journeyId) && journeyId > 0,
  })

  const eventsQuery = useQuery({
    queryKey: queryKeys.events.all(journeyId),
    queryFn: () => listEvents(accessToken!, journeyId),
    enabled: Boolean(accessToken) && Number.isFinite(journeyId) && journeyId > 0,
  })

  const deleteMutation = useMutation({
    mutationFn: (eventId: number) => deleteEvent(accessToken!, journeyId, eventId),
    onSuccess: async (_void, eventId) => {
      setPendingDelete(null)
      await queryClient.invalidateQueries({ queryKey: queryKeys.events.all(journeyId) })
      queryClient.removeQueries({ queryKey: queryKeys.events.detail(journeyId, eventId) })
    },
  })

  function handleLogout() {
    logout()
    void navigate('/', { replace: true })
  }

  const invalidId = !Number.isFinite(journeyId) || journeyId <= 0
  const journey = journeyQuery.data

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
          <button
            type="button"
            onClick={handleLogout}
            className="border border-[var(--color-line)] px-4 py-2 text-[11px] font-medium tracking-[0.2em] text-[var(--color-ink)] uppercase transition hover:border-[var(--color-sea)]"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-16">
        {invalidId && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            Journey not found
          </p>
        )}

        {!invalidId && journeyQuery.isLoading && (
          <p className="text-sm font-light text-[var(--color-stone)]">Loading journey…</p>
        )}

        {!invalidId && journeyQuery.isError && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {journeyQuery.error instanceof ApiError
              ? journeyQuery.error.message
              : 'Unable to load this journey.'}
          </p>
        )}

        {!invalidId && journey && (
          <>
            <div>
              <p className="mb-3 text-[11px] font-medium tracking-[0.28em] text-[var(--color-gold)] uppercase">
                {readOnly ? 'Public journey' : 'Journey'}
              </p>
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-wide text-[var(--color-ink)] sm:text-5xl">
                  {journey.title}
                </h1>
                <div className="flex shrink-0 items-center gap-4">
                  <Link
                    to={backTo}
                    className="text-[11px] font-medium tracking-[0.2em] text-[var(--color-sea)] uppercase transition hover:text-[var(--color-sea-deep)]"
                  >
                    {backLabel}
                  </Link>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] tracking-[0.16em] text-[var(--color-stone)] uppercase">
                {readOnly ? (
                  <span>By {journey.ownerUsername}</span>
                ) : (
                  <span>{journey.visibility === 'PRIVATE' ? 'Private' : 'Public'}</span>
                )}
                {formatDateRange(journey.startDate, journey.endDate) && (
                  <span>{formatDateRange(journey.startDate, journey.endDate)}</span>
                )}
              </div>

              {journey.description && (
                <p className="mt-5 max-w-2xl font-light leading-relaxed text-[var(--color-stone)]">
                  {journey.description}
                </p>
              )}
            </div>

            <section className="mt-14">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-3 text-[11px] font-medium tracking-[0.28em] text-[var(--color-gold)] uppercase">
                    Timeline
                  </p>
                  <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium tracking-wide text-[var(--color-ink)] sm:text-4xl">
                    Events
                  </h2>
                </div>
                {!readOnly && (
                  <Link
                    to={`/journeys/${journeyId}/events/new`}
                    className="shrink-0 bg-[var(--color-sea)] px-5 py-3 text-[11px] font-medium tracking-[0.2em] !text-white uppercase transition hover:bg-[var(--color-sea-deep)]"
                  >
                    New event
                  </Link>
                )}
              </div>

              <div className="mt-8">
                {eventsQuery.isLoading && (
                  <p className="text-sm font-light text-[var(--color-stone)]">Loading events…</p>
                )}

                {eventsQuery.isError && (
                  <p role="alert" className="text-sm text-[var(--color-danger)]">
                    {eventsQuery.error instanceof ApiError
                      ? eventsQuery.error.message
                      : 'Unable to load events right now.'}
                  </p>
                )}

                {!readOnly && deleteMutation.isError && (
                  <p role="alert" className="mb-4 text-sm text-[var(--color-danger)]">
                    {deleteMutation.error instanceof ApiError
                      ? deleteMutation.error.message
                      : 'Unable to delete event right now.'}
                  </p>
                )}

                {eventsQuery.data && eventsQuery.data.length === 0 && (
                  <p className="text-sm font-light text-[var(--color-stone)]">
                    {readOnly ? (
                      'No events on this journey yet.'
                    ) : (
                      <>
                        No events yet.{' '}
                        <Link
                          to={`/journeys/${journeyId}/events/new`}
                          className="font-medium text-[var(--color-sea)] underline-offset-4 hover:underline"
                        >
                          Add the first one
                        </Link>
                        .
                      </>
                    )}
                  </p>
                )}

                {eventsQuery.data && eventsQuery.data.length > 0 && (
                  <ol className="mt-2">
                    {eventsQuery.data.map((eventItem, index) => {
                      const isLast = index === eventsQuery.data.length - 1
                      const { dateLabel, timeLabel } = splitEventWhen(
                        eventItem.startAt,
                        eventItem.endAt,
                      )
                      return (
                        <li
                          key={eventItem.id}
                          className="relative grid grid-cols-[4.5rem_1fr] gap-x-4 pb-10 last:pb-0 sm:grid-cols-[6.5rem_1fr] sm:gap-x-6"
                        >
                          <div className="text-right">
                            <p className="pt-0.5 text-[10px] font-medium tracking-[0.12em] text-[var(--color-stone)] uppercase sm:text-[11px] sm:tracking-[0.14em]">
                              {dateLabel}
                            </p>
                          </div>

                          <div className="relative min-w-0 pl-6 sm:pl-8">
                            {!isLast && (
                              <span
                                aria-hidden="true"
                                className="absolute top-3 bottom-[-2.5rem] left-[0.3125rem] w-px bg-[var(--color-line)] sm:left-[0.4375rem]"
                              />
                            )}
                            <span
                              aria-hidden="true"
                              className="absolute top-1.5 left-0 size-2.5 rounded-full border-2 border-[var(--color-sea)] bg-[var(--color-paper)] sm:size-3"
                            />

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                              <Link
                                to={eventPath(eventItem.id)}
                                className="min-w-0 flex-1 transition hover:opacity-80"
                              >
                                {timeLabel && (
                                  <p className="mb-1 text-[11px] tracking-[0.16em] text-[var(--color-gold)] uppercase">
                                    {timeLabel}
                                  </p>
                                )}
                                <p className="font-[family-name:var(--font-display)] text-2xl font-medium tracking-wide text-[var(--color-ink)]">
                                  {eventItem.title}
                                </p>
                                {eventItem.description && (
                                  <p className="mt-1 max-w-2xl text-sm font-light text-[var(--color-stone)] line-clamp-2">
                                    {eventItem.description}
                                  </p>
                                )}
                                {eventItem.photos.length > 0 && (
                                  <div className="mt-3 flex gap-2">
                                    {eventItem.photos.slice(0, 3).map((photo) => (
                                      <img
                                        key={photo.id}
                                        src={photo.url}
                                        alt=""
                                        className="h-14 w-14 object-cover border border-[var(--color-line)]"
                                      />
                                    ))}
                                    {eventItem.photos.length > 3 && (
                                      <span className="flex h-14 items-center text-xs text-[var(--color-stone)]">
                                        +{eventItem.photos.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </Link>
                              {!readOnly && (
                                <div className="flex shrink-0 items-center gap-3">
                                  <Link
                                    to={`/journeys/${journeyId}/events/${eventItem.id}/edit`}
                                    className="border border-[var(--color-line)] px-4 py-2 text-[11px] font-medium tracking-[0.2em] text-[var(--color-ink)] uppercase transition hover:border-[var(--color-sea)]"
                                  >
                                    Edit
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPendingDelete({
                                        id: eventItem.id,
                                        title: eventItem.title,
                                      })
                                    }
                                    disabled={deleteMutation.isPending}
                                    className="border border-[var(--color-danger)] px-4 py-2 text-[11px] font-medium tracking-[0.2em] text-[var(--color-danger)] uppercase transition hover:bg-[color-mix(in_srgb,var(--color-danger)_8%,white)] disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {!readOnly && (
        <ConfirmDialog
          open={pendingDelete != null}
          title={pendingDelete ? `Delete “${pendingDelete.title}”?` : 'Delete event?'}
          description="This cannot be undone. Photos on this event will be removed."
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
      )}
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

function splitEventWhen(
  startAt: string,
  endAt: string | null,
): { dateLabel: string; timeLabel: string | null } {
  const startDate = startAt.slice(0, 10)
  const startTime = startAt.includes('T') ? startAt.slice(11, 16) : null
  if (!endAt) {
    return {
      dateLabel: startDate,
      timeLabel: startTime,
    }
  }
  const endDate = endAt.slice(0, 10)
  const endTime = endAt.includes('T') ? endAt.slice(11, 16) : null
  if (startDate === endDate) {
    return {
      dateLabel: startDate,
      timeLabel:
        startTime && endTime ? `${startTime} – ${endTime}` : (startTime ?? endTime),
    }
  }
  return {
    dateLabel: startDate,
    timeLabel: `${startAt.replace('T', ' ').slice(0, 16)} → ${endAt.replace('T', ' ').slice(0, 16)}`,
  }
}
