import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { isIntentionalLogout } from '../auth/logoutFlag'
import { useAuth } from '../auth/useAuth'

type FieldErrors = Partial<Record<'username' | 'password', string>>

const SIDE_IMAGE =
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=80'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const from =
    typeof location.state === 'object' &&
    location.state !== null &&
    'from' in location.state &&
    typeof location.state.from === 'string'
      ? location.state.from
      : null
  const redirectTo = isIntentionalLogout() || !from ? '/journeys' : from
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const loginMutation = useMutation({
    mutationFn: async () => login(username.trim(), password),
    onMutate: () => {
      setFieldErrors({})
      setFormError(null)
    },
    onSuccess: () => {
      void navigate(redirectTo, { replace: true })
    },
    onError: (error: Error) => {
      if (error instanceof ApiError) {
        if (error.code === 'VALIDATION_FAILED' && Object.keys(error.details).length > 0) {
          const next: FieldErrors = {}
          for (const [key, message] of Object.entries(error.details)) {
            if (key === 'username' || key === 'password') {
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
      setFormError('Unable to sign in right now. Please try again.')
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const localErrors: FieldErrors = {}
    if (!username.trim()) {
      localErrors.username = 'Username is required'
    }
    if (!password) {
      localErrors.password = 'Password is required'
    }
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors)
      setFormError(null)
      return
    }

    loginMutation.mutate()
  }

  return (
    <div className="min-h-svh bg-[var(--color-fog)] lg:grid lg:h-svh lg:grid-cols-2 lg:overflow-hidden">
      <aside className="relative hidden overflow-hidden lg:block lg:h-full">
        <img
          src={SIDE_IMAGE}
          alt="Quiet alpine lake at dusk"
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
              Welcome back
            </p>
            <p className="font-[family-name:var(--font-display)] text-4xl leading-[1.15] font-medium tracking-wide xl:text-5xl">
              Pick up the journey where you left it.
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

          <p className="mb-3 text-[11px] font-medium tracking-[0.28em] text-[var(--color-gold)] uppercase">
            Sign in
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-wide text-[var(--color-ink)] sm:text-5xl">
            Welcome back
          </h1>
          <p className="mt-3 font-light text-[var(--color-stone)]">
            Enter your details to open your private journal.
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
              value={username}
              error={fieldErrors.username}
              onChange={setUsername}
              required
            />
            <Field
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              error={fieldErrors.password}
              onChange={setPassword}
              required
            />

            {formError && (
              <p role="alert" className="mb-4 text-sm text-[var(--color-danger)]">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="mt-1 w-full bg-[var(--color-sea)] px-4 py-3.5 text-[11px] font-medium tracking-[0.2em] !text-white uppercase transition hover:bg-[var(--color-sea-deep)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-sm font-light text-[var(--color-stone)]">
            New here?{' '}
            <Link
              to="/register"
              className="font-medium tracking-wide text-[var(--color-sea)] underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
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
  type?: 'text' | 'password'
  autoComplete?: string
  required?: boolean
}

function Field({ id, label, value, onChange, error, type = 'text', autoComplete, required }: FieldProps) {
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
