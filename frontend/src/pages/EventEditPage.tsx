import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ApiError,
  deleteEventPhoto,
  getEvent,
  getJourney,
  replaceEventPhoto,
  updateEvent,
  uploadEventPhoto,
} from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useAuth } from '../auth/useAuth'
import {
  datePart,
  journeyDateTimeMax,
  journeyDateTimeMin,
  toDatetimeLocalValue,
} from './datetimeLocal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import {
  EVENT_PHOTO_UPLOAD_WARNING_STATE_KEY,
  type EventEditLocationState,
} from './eventCreateErrors'
import { EventPhotoReplaceList } from './EventPhotoReplaceList'

type FieldErrors = Partial<Record<'title' | 'startAt' | 'endAt', string>>

export function EventEditPage() {
  const { journeyId: journeyIdParam, eventId: eventIdParam } = useParams()
  const journeyId = Number(journeyIdParam)
  const eventId = Number(eventIdParam)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { accessToken, logout } = useAuth()

  const locationWarning = (location.state as EventEditLocationState | null)?.[
    EVENT_PHOTO_UPLOAD_WARNING_STATE_KEY
  ]

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(locationWarning ?? null)
  const [isFormReady, setIsFormReady] = useState(false)
  const [pendingPhotoDeleteIds, setPendingPhotoDeleteIds] = useState<number[]>([])

  useEffect(() => {
    if (!locationWarning) {
      return
    }
    setPhotoError(locationWarning)
    void navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, locationWarning, navigate])

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

  const journeyQuery = useQuery({
    queryKey: queryKeys.journeys.detail(journeyId),
    queryFn: () => getJourney(accessToken!, journeyId),
    enabled: Boolean(accessToken) && !invalidIds,
  })

  const journeyMin = journeyDateTimeMin(journeyQuery.data?.startDate)
  const journeyMax = journeyDateTimeMax(journeyQuery.data?.endDate)

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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.events.all(journeyId) })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(journeyId, eventId),
      })
      void navigate(`/journeys/${journeyId}`, { replace: true })
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

  async function invalidatePhotoQueries() {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.events.detail(journeyId, eventId),
    })
    await queryClient.invalidateQueries({ queryKey: queryKeys.events.all(journeyId) })
  }

  const replacePhotoMutation = useMutation({
    mutationFn: ({ photoId, file }: { photoId: number; file: File }) =>
      replaceEventPhoto(accessToken!, journeyId, eventId, photoId, file),
    onMutate: () => {
      setPhotoError(null)
    },
    onSuccess: async () => {
      await invalidatePhotoQueries()
    },
    onError: (error: Error) => {
      setPhotoError(
        error instanceof ApiError
          ? error.message
          : 'Unable to replace photo right now. Please try again.',
      )
    },
  })

  const addPhotosMutation = useMutation({
    mutationFn: async (files: File[]) => {
      await Promise.all(
        files.map((file) => uploadEventPhoto(accessToken!, journeyId, eventId, file)),
      )
    },
    onMutate: () => {
      setPhotoError(null)
    },
    onSuccess: async () => {
      await invalidatePhotoQueries()
    },
    onError: (error: Error) => {
      setPhotoError(
        error instanceof ApiError
          ? error.message
          : 'Unable to add photos right now. Please try again.',
      )
    },
  })

  const deletePhotosMutation = useMutation({
    mutationFn: async (photoIds: number[]) => {
      await Promise.all(
        photoIds.map((photoId) =>
          deleteEventPhoto(accessToken!, journeyId, eventId, photoId),
        ),
      )
    },
    onMutate: () => {
      setPhotoError(null)
    },
    onSuccess: async () => {
      setPendingPhotoDeleteIds([])
      await invalidatePhotoQueries()
    },
    onError: (error: Error) => {
      setPhotoError(
        error instanceof ApiError
          ? error.message
          : 'Unable to delete photos right now. Please try again.',
      )
    },
  })

  function handleDeleteSelected(photoIds: number[]) {
    setPendingPhotoDeleteIds(photoIds)
  }

  const photoBusy =
    replacePhotoMutation.isPending ||
    addPhotosMutation.isPending ||
    deletePhotosMutation.isPending

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
    const journeyStart = journeyQuery.data?.startDate
    const journeyEnd = journeyQuery.data?.endDate
    if (startAt && journeyStart && datePart(startAt) < journeyStart) {
      localErrors.startAt = 'Must be on or after the journey start date'
    }
    if (startAt && journeyEnd && datePart(startAt) > journeyEnd) {
      localErrors.startAt = 'Must be on or before the journey end date'
    }
    if (endAt && journeyStart && datePart(endAt) < journeyStart) {
      localErrors.endAt = 'Must be on or after the journey start date'
    }
    if (endAt && journeyEnd && datePart(endAt) > journeyEnd) {
      localErrors.endAt = 'Must be on or before the journey end date'
    }
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors)
      setFormError(null)
      return
    }

    updateMutation.mutate()
  }

  function handleLogout() {
    logout()
    void navigate('/', { replace: true })
  }

  const startMaxCandidates = [endAt || undefined, journeyMax].filter(Boolean) as string[]
  const startMax = startMaxCandidates.length > 0 ? startMaxCandidates.sort()[0] : undefined
  const endMinCandidates = [startAt || undefined, journeyMin].filter(Boolean) as string[]
  const endMin =
    endMinCandidates.length > 0 ? endMinCandidates.sort().at(-1) : undefined

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
                  min={journeyMin}
                  max={startMax}
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
                  min={endMin}
                  max={journeyMax}
                  error={fieldErrors.endAt}
                  onChange={setEndAt}
                />
              </div>

              <EventPhotoReplaceList
                photos={eventQuery.data.photos}
                disabled={updateMutation.isPending}
                replacingPhotoId={
                  replacePhotoMutation.isPending
                    ? (replacePhotoMutation.variables?.photoId ?? null)
                    : null
                }
                isAdding={addPhotosMutation.isPending}
                isDeleting={deletePhotosMutation.isPending}
                onReplace={(photoId, file) => replacePhotoMutation.mutate({ photoId, file })}
                onAdd={(files) => addPhotosMutation.mutate(files)}
                onDeleteSelected={handleDeleteSelected}
                error={photoError}
              />

              {formError && (
                <p role="alert" className="mb-4 text-sm text-[var(--color-danger)]">
                  {formError}
                </p>
              )}

              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={updateMutation.isPending || photoBusy}
                  className="bg-[var(--color-sea)] px-6 py-3.5 text-[11px] font-medium tracking-[0.2em] !text-white uppercase transition hover:bg-[var(--color-sea-deep)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updateMutation.isPending ? 'Saving…' : 'Save changes'}
                </button>
                <Link
                  to={`/journeys/${journeyId}`}
                  className="border border-[var(--color-line)] px-6 py-3.5 text-[11px] font-medium tracking-[0.2em] text-[var(--color-ink)] uppercase transition hover:border-[var(--color-sea)]"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </>
        )}
      </main>

      <ConfirmDialog
        open={pendingPhotoDeleteIds.length > 0}
        title={
          pendingPhotoDeleteIds.length === 1
            ? 'Delete this photo?'
            : `Delete ${pendingPhotoDeleteIds.length} photos?`
        }
        description="This cannot be undone. Selected images will be removed from this event."
        busy={deletePhotosMutation.isPending}
        onCancel={() => {
          if (!deletePhotosMutation.isPending) {
            setPendingPhotoDeleteIds([])
          }
        }}
        onConfirm={() => {
          if (pendingPhotoDeleteIds.length > 0) {
            deletePhotosMutation.mutate(pendingPhotoDeleteIds)
          }
        }}
      />
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
