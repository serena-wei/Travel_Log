import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ApiError, getEvent } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useAuth } from '../auth/useAuth'

export function EventDetailPage() {
  const { journeyId: journeyIdParam, eventId: eventIdParam } = useParams()
  const journeyId = Number(journeyIdParam)
  const eventId = Number(eventIdParam)
  const navigate = useNavigate()
  const { accessToken, logout } = useAuth()

  const invalidIds =
    !Number.isFinite(journeyId) ||
    journeyId <= 0 ||
    !Number.isFinite(eventId) ||
    eventId <= 0

  const eventQuery = useQuery({
    queryKey: queryKeys.events.detail(journeyId, eventId),
    queryFn: () => getEvent(accessToken!, journeyId, eventId),
    enabled: Boolean(accessToken) && !invalidIds,
  })

  function handleLogout() {
    logout()
    void navigate('/', { replace: true })
  }

  const event = eventQuery.data

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
        {invalidIds && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            Event not found
          </p>
        )}

        {!invalidIds && eventQuery.isLoading && (
          <p className="text-sm font-light text-[var(--color-stone)]">Loading event…</p>
        )}

        {!invalidIds && eventQuery.isError && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {eventQuery.error instanceof ApiError
              ? eventQuery.error.message
              : 'Unable to load this event.'}
          </p>
        )}

        {!invalidIds && event && (
          <>
            <div>
              <p className="mb-3 text-[11px] font-medium tracking-[0.28em] text-[var(--color-gold)] uppercase">
                Event
              </p>
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-wide text-[var(--color-ink)] sm:text-5xl">
                  {event.title}
                </h1>
                  <Link
                    to={`/journeys/${journeyId}`}
                    className="text-[11px] font-medium tracking-[0.2em] text-[var(--color-sea)] uppercase transition hover:text-[var(--color-sea-deep)]"
                  >
                    ← Journey
                  </Link>
              </div>

              {event.description && (
                <p className="mt-5 max-w-3xl font-light leading-relaxed text-[var(--color-stone)]">
                  {event.description}
                </p>
              )}

              <p className="mt-4 text-[11px] tracking-[0.16em] text-[var(--color-stone)] uppercase">
                {formatEventWhen(event.startAt, event.endAt)}
              </p>
            </div>

            {event.photos.length > 0 && (
              <section className="mt-14 border-t border-[var(--color-line)] pt-10">
                <p className="mb-4 text-[11px] font-medium tracking-[0.18em] text-[var(--color-stone)] uppercase">
                  Photos
                </p>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {event.photos.map((photo) => (
                    <li key={photo.id} className="overflow-hidden border border-[var(--color-line)]">
                      <img
                        src={photo.url}
                        alt=""
                        className="aspect-square w-full object-cover"
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function formatEventWhen(startAt: string, endAt: string | null): string {
  const start = startAt.replace('T', ' ').slice(0, 16)
  if (!endAt) {
    return start
  }
  return `${start} → ${endAt.replace('T', ' ').slice(0, 16)}`
}
