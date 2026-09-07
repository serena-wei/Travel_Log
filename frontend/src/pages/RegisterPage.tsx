import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ApiError, registerUser } from '../api/client'

type FieldErrors = Partial<Record<'username' | 'email' | 'password' | 'confirmPassword', string>>

const emptyForm = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const SIDE_IMAGE =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1600&q=80'

export function RegisterPage() {
  const [form, setForm] = useState(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const registerMutation = useMutation({
    mutationFn: (request: Parameters<typeof registerUser>[0]) => registerUser(request),
    onMutate: () => {
      setFieldErrors({})
      setFormError(null)
    },
    onError: (error: Error) => {
      if (error instanceof ApiError) {
        if (error.code === 'VALIDATION_FAILED' && Object.keys(error.details).length > 0) {
          const next: FieldErrors = {}
          for (const [key, message] of Object.entries(error.details)) {
            if (key === 'username' || key === 'email' || key === 'password' || key === 'confirmPassword') {
              next[key] = message
            } else if (key === 'passwordConfirmed') {
              next.confirmPassword = message
            } else if (key === 'passwordComplexEnough') {
              next.password = message
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
      setFormError('Unable to register right now. Please try again.')
    },
  })

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const localErrors: FieldErrors = {}
    if (form.username.trim().length < 3) {
      localErrors.username = 'Username must be at least 3 characters'
    }
    if (!form.email.trim()) {
      localErrors.email = 'Email is required'
    }
    if (form.password.length < 8) {
      localErrors.password = 'Password must be at least 8 characters'
    }
    if (form.password !== form.confirmPassword) {
      localErrors.confirmPassword = 'Passwords do not match'
    }
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors)
      setFormError(null)
      return
    }

    registerMutation.mutate({
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword,
    })
  }

  return (
    <div className="min-h-svh bg-[var(--color-fog)] lg:grid lg:h-svh lg:grid-cols-2 lg:overflow-hidden">
      <aside className="relative hidden overflow-hidden lg:block lg:h-full">
        <img
          src={SIDE_IMAGE}
          alt="Bright alpine peaks under open sky"
          className="absolute inset-0 h-full w-full object-cover brightness-[1.05] contrast-[1.04] animate-hero-pan"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,22,30,0.55),rgba(12,22,30,0.12))]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.12),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-between p-10 pb-12 text-white lg:p-12 lg:pb-14">
          <Link
            to="/"
            className="font-[family-name:var(--font-display)] text-2xl font-medium tracking-[0.18em] uppercase"
          >
            TravelLog
          </Link>
          <div className="animate-fade-up max-w-md">
            <p className="mb-4 text-[11px] font-medium tracking-[0.3em] text-[var(--color-gold)] uppercase">
              Membership
            </p>
            <p className="font-[family-name:var(--font-display)] text-4xl leading-[1.15] font-medium tracking-wide xl:text-5xl">
              Your map of memories, kept close.
            </p>
          </div>
        </div>
      </aside>

      <main className="flex min-h-svh flex-col justify-center overflow-y-auto px-6 py-10 sm:px-10 lg:h-full lg:min-h-0 lg:py-12">
        <div className="animate-soft-in mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link
              to="/"
              className="font-[family-name:var(--font-display)] text-2xl font-medium tracking-[0.18em] uppercase"
            >
              TravelLog
            </Link>
          </div>

          {registerMutation.isSuccess ? (
            <div>
              <p className="mb-3 text-[11px] font-medium tracking-[0.28em] text-[var(--color-gold)] uppercase">
                Welcome
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-wide text-[var(--color-ink)] sm:text-5xl">
                You&apos;re in
              </h1>
              <p className="mt-4 font-light text-[var(--color-stone)]">
                Account{' '}
                <span className="font-medium text-[var(--color-ink)]">{registerMutation.data.username}</span>{' '}
                is ready. Sign in to open your journal.
              </p>
              <Link
                to="/login"
                className="mt-8 inline-flex bg-[var(--color-sea)] px-7 py-3.5 text-[11px] font-medium tracking-[0.2em] !text-white uppercase transition hover:bg-[var(--color-sea-deep)]"
              >
                Sign in
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-3 text-[11px] font-medium tracking-[0.28em] text-[var(--color-gold)] uppercase">
                Create account
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-wide text-[var(--color-ink)] sm:text-5xl">
                Begin here
              </h1>
              <p className="mt-3 font-light text-[var(--color-stone)]">
                Start your private travel journal.
              </p>

              <form
                onSubmit={handleSubmit}
                noValidate
                className="mt-7 border border-[var(--color-line)] bg-[var(--color-paper)] p-6 shadow-[var(--shadow-form)] sm:p-8"
              >
                <Field
                  id="username"
                  label="Username"
                  autoComplete="username"
                  value={form.username}
                  error={fieldErrors.username}
                  onChange={(value) => updateField('username', value)}
                  required
                />
                <Field
                  id="email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  error={fieldErrors.email}
                  onChange={(value) => updateField('email', value)}
                  required
                />
                <Field
                  id="password"
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  error={fieldErrors.password}
                  onChange={(value) => updateField('password', value)}
                  hint="At least 8 characters, with letters and numbers or symbols"
                  required
                />
                <Field
                  id="confirmPassword"
                  label="Confirm password"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  error={fieldErrors.confirmPassword}
                  onChange={(value) => updateField('confirmPassword', value)}
                  required
                />

                {formError && (
                  <p role="alert" className="mb-4 text-sm text-[var(--color-danger)]">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="mt-1 w-full bg-[var(--color-sea)] px-4 py-3.5 text-[11px] font-medium tracking-[0.2em] !text-white uppercase transition hover:bg-[var(--color-sea-deep)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {registerMutation.isPending ? 'Creating…' : 'Create account'}
                </button>
              </form>

              <p className="mt-6 text-sm font-light text-[var(--color-stone)]">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-medium tracking-wide text-[var(--color-sea)] underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
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
  hint?: string
  type?: 'text' | 'email' | 'password'
  autoComplete?: string
  required?: boolean
}

function Field({ id, label, value, onChange, error, hint, type = 'text', autoComplete, required }: FieldProps) {
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
        autoComplete={autoComplete}
        value={value}
        required={required}
        aria-required={required || undefined}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className="w-full border border-[var(--color-line)] bg-[var(--color-fog)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-sea)] focus:bg-white"
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs font-light text-[var(--color-stone)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  )
}
