import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ApiError,
  getJourney,
  updateJourney,
  type JourneyVisibility,
} from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useAuth } from '../auth/useAuth'

type FieldErrors = Partial<Record<'title' | 'startDate' | 'endDate', string>>

export function JourneyEditPage() {
  const { id } = useParams()
  const journeyId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { accessToken, logout } = useAuth()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [visibility, setVisibility] = useState<JourneyVisibility>('PRIVATE')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isFormReady, setIsFormReady] = useState(false)

  const journeyQuery = useQuery({
    queryKey: queryKeys.journeys.detail(journeyId),
    queryFn: () => getJourney(accessToken!, journeyId),
    enabled: Boolean(accessToken) && Number.isFinite(journeyId) && journeyId > 0,
  })

  useEffect(() => {
    if (!journeyQuery.data || isFormReady) {
      return
    }
    setTitle(journeyQuery.data.title)
    setDescription(journeyQuery.data.description ?? '')
    setStartDate(journeyQuery.data.startDate ?? '')
    setEndDate(journeyQuery.data.endDate ?? '')
    setVisibility(journeyQuery.data.visibility)
    setIsFormReady(true)
  }, [journeyQuery.data, isFormReady])

  const updateMutation = useMutation({
    mutationFn: () =>
      updateJourney(accessToken!, journeyId, {
        title: title.trim(),
        description: description.trim() || null,
        startDate: startDate || null,
        endDate: endDate || null,
        visibility,
      }),
    onMutate: () => {
      setFieldErrors({})
      setFormError(null)
    },
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.journeys.all })
      queryClient.setQueryData(queryKeys.journeys.detail(journeyId), updated)
      void navigate('/journeys', { replace: true })
    },
    onError: (error: Error) => {
      if (error instanceof ApiError) {
        if (error.code === 'VALIDATION_FAILED' && Object.keys(error.details).length > 0) {
          const next: FieldErrors = {}
          for (const [key, message] of Object.entries(error.details)) {
            if (key === 'title' || key === 'startDate' || key === 'endDate') {
              next[key] = message
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
      setFormError('Unable to save journey right now. Please try again.')
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const localErrors: FieldErrors = {}
    if (!title.trim()) {
      localErrors.title = 'Title is required'
    }
    if (startDate && endDate && endDate < startDate) {
      localErrors.endDate = 'End date must be on or after start date'
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

  const invalidId = !Number.isFinite(journeyId) || journeyId <= 0

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

        {!invalidId && journeyQuery.data && isFormReady && (
          <>
            <div>
              <p className="mb-3 text-[11px] font-medium tracking-[0.28em] text-[var(--color-gold)] uppercase">
                Edit journey
              </p>
              <div className="flex items-baseline justify-between gap-4">
                <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-wide text-[var(--color-ink)] sm:text-5xl">
                  {journeyQuery.data.title}
                </h1>
                <Link
                  to="/journeys"
                  className="shrink-0 text-[11px] font-medium tracking-[0.2em] text-[var(--color-sea)] uppercase transition hover:text-[var(--color-sea-deep)]"
                >
                  ← Journeys
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
                  id="startDate"
                  label="Start date"
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  error={fieldErrors.startDate}
                  onChange={(value) => {
                    setStartDate(value)
                    setEndDate((current) => (current && value && current < value ? value : current))
                  }}
                />
                <Field
                  id="endDate"
                  label="End date"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  error={fieldErrors.endDate}
                  onChange={setEndDate}
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="visibility"
                  className="mb-1.5 block text-[11px] font-medium tracking-[0.18em] text-[var(--color-stone)] uppercase"
                >
                  Visibility
                </label>
                <select
                  id="visibility"
                  name="visibility"
                  value={visibility}
                  onChange={(event) => setVisibility(event.target.value as JourneyVisibility)}
                  className="w-full border border-[var(--color-line)] bg-[var(--color-fog)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-sea)] focus:bg-white"
                >
                  <option value="PRIVATE">Private</option>
                  <option value="PUBLIC">Public</option>
                </select>
              </div>

              {formError && (
                <p role="alert" className="mb-4 text-sm text-[var(--color-danger)]">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="mt-2 bg-[var(--color-sea)] px-6 py-3.5 text-[11px] font-medium tracking-[0.2em] !text-white uppercase transition hover:bg-[var(--color-sea-deep)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </button>
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
  type?: 'text' | 'date'
  min?: string
  max?: string
  required?: boolean
}

function Field({ id, label, value, onChange, error, type = 'text', min, max, required }: FieldProps) {
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
