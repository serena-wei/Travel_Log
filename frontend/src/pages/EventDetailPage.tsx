import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, deleteEvent, getEvent, updateEvent } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useAuth } from '../auth/useAuth'
import { toDatetimeLocalValue } from './datetimeLocal'

type FieldErrors = Partial<Record<'title' | 'startAt' | 'endAt', string>>

export function EventDetailPage() {
  const { journeyId: journeyIdParam, eventId: eventIdParam } = useParams()
  const journeyId = Number(journeyIdParam)
  const eventId = Number(eventIdParam)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { accessToken, logout } = useAuth()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isFormReady, setIsFormReady] = useState(false)

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

  useEffect(() => {
    if (!eventQuery.data || isFormReady) {
      return
    }
    setTitle(eventQuery.data.title)
    setDescription(eventQuery.data.description ?? '')
    setStartAt(toDatetimeLocalValue(eventQuery.data.startAt))
    setEndAt(toDatetimeLocalValue(eventQuery.data.endAt))
    setIsFormReady(true)
  }, [eventQuery.data, isFormReady])

  const updateMutation = useMutation({
    mutationFn: () =>
      updateEvent(accessToken!, journeyId, eventId, {
        title: title.trim(),
        description: description.trim() || null,
        startAt,
        endAt: endAt || null,
      }),
    onMutate: () => {
      setFieldErrors({})
      setFormError(null)
    },
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.events.all(journeyId) })
      queryClient.setQueryData(queryKeys.events.detail(journeyId, eventId), updated)
      setIsFormReady(true)
    },
    onError: (error: Error) => {
      if (error instanceof ApiError) {
        if (error.code === 'VALIDATION_FAILED' && Object.keys(error.details).length > 0) {
          const next: FieldErrors = {}
          for (const [key, message] of Object.entries(error.details)) {
            if (key === 'title' || key === 'startAt' || key === 'endAt') {
              next[key] = message
            } else if (key === 'timeRangeValid') {
              next.endAt = message
            } else {
              setFormError(message)
            }
          }
          setFieldErrors(next)
          return
        }
        setFormError(error.message)
        return
      }
      setFormError('Unable to save event right now. Please try again.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteEvent(accessToken!, journeyId, eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.events.all(journeyId) })
      queryClient.removeQueries({ queryKey: queryKeys.events.detail(journeyId, eventId) })
      void navigate(`/journeys/${journeyId}`, { replace: true })
    },
    onError: (error: Error) => {
      setFormError(error instanceof ApiError ? error.message : 'Unable to delete event right now.')
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const localErrors: FieldErrors = {}
    if (!title.trim()) {
      localErrors.title = 'Title is required'
    }
    if (!startAt) {
      localErrors.startAt = 'Start is required'
    }
    if (startAt && endAt && endAt < startAt) {
      localErrors.endAt = 'End must be on or after start'
    }
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors)
      setFormError(null)
      return
    }

    updateMutation.mutate()
  }

  function handleDelete() {
    if (!window.confirm('Delete this event? This cannot be undone.')) {
      return
    }
    deleteMutation.mutate()
  }

  function handleLogout() {
    logout()
    void navigate('/', { replace: true })
  }

  return (
    <div className="min-h-svh bg-[var(--color-fog)]">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-paper)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-5 sm:px-10">
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

      <main className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
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

        {!invalidIds && eventQuery.data && isFormReady && (
          <>
            <div>
              <p className="mb-3 text-[11px] font-medium tracking-[0.28em] text-[var(--color-gold)] uppercase">
                Edit event
              </p>
              <div className="flex items-baseline justify-between gap-4">
                <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-wide text-[var(--color-ink)] sm:text-5xl">
                  {eventQuery.data.title}
                </h1>
                <Link
                  to={`/journeys/${journeyId}`}
                  className="shrink-0 text-[11px] font-medium tracking-[0.2em] text-[var(--color-sea)] uppercase transition hover:text-[var(--color-sea-deep)]"
                >
                  ← Journey
                </Link>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="mt-10 border border-[var(--color-line)] bg-[var(--color-paper)] p-6 shadow-[var(--shadow-form)] sm:p-8"
            >
              <Field
                id="title"
                label="Title"
                value={title}
                error={fieldErrors.title}
                onChange={setTitle}
                required
              />
              <div className="mb-4">
                <label
                  htmlFor="description"
                  className="mb-1.5 block text-[11px] font-medium tracking-[0.18em] text-[var(--color-stone)] uppercase"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="w-full resize-y border border-[var(--color-line)] bg-[var(--color-fog)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-sea)] focus:bg-white"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="startAt"
                  label="Start"
                  type="datetime-local"
                  value={startAt}
                  max={endAt || undefined}
                  error={fieldErrors.startAt}
                  onChange={(value) => {
                    setStartAt(value)
                    setEndAt((current) => (current && value && current < value ? value : current))
                  }}
                  required
                />
                <Field
                  id="endAt"
                  label="End"
                  type="datetime-local"
                  value={endAt}
                  min={startAt || undefined}
                  error={fieldErrors.endAt}
                  onChange={setEndAt}
                />
              </div>

              {formError && (
                <p role="alert" className="mb-4 text-sm text-[var(--color-danger)]">
                  {formError}
                </p>
              )}

              {updateMutation.isSuccess && !updateMutation.isPending && !formError && (
                <p className="mb-4 text-sm text-[var(--color-sea)]" role="status">
                  Saved
                </p>
              )}

              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={updateMutation.isPending || deleteMutation.isPending}
                  className="bg-[var(--color-sea)] px-6 py-3.5 text-[11px] font-medium tracking-[0.2em] !text-white uppercase transition hover:bg-[var(--color-sea-deep)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updateMutation.isPending ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={updateMutation.isPending || deleteMutation.isPending}
                  className="border border-[var(--color-danger)] px-6 py-3.5 text-[11px] font-medium tracking-[0.2em] text-[var(--color-danger)] uppercase transition hover:bg-[color-mix(in_srgb,var(--color-danger)_8%,white)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  )
}

type FieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: 'text' | 'datetime-local'
  min?: string
  max?: string
  required?: boolean
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  min,
  max,
  required,
}: FieldProps) {
  return (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-medium tracking-[0.18em] text-[var(--color-stone)] uppercase"
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-[var(--color-danger)]" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        min={min}
        max={max}
        required={required}
        aria-required={required || undefined}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="w-full border border-[var(--color-line)] bg-[var(--color-fog)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-sea)] focus:bg-white"
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  )
}
