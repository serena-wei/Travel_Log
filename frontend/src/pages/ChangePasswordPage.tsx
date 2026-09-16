import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ApiError, changePassword } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { AppShell } from '../components/AppShell'

type PasswordFieldErrors = Partial<
  Record<'currentPassword' | 'newPassword' | 'confirmNewPassword', string>
>

export function ChangePasswordPage() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<PasswordFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const passwordMutation = useMutation({
    mutationFn: () =>
      changePassword(accessToken!, {
        currentPassword,
        newPassword,
        confirmNewPassword,
      }),
    onMutate: () => {
      setFieldErrors({})
      setFormError(null)
      setFormSuccess(null)
    },
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setFieldErrors({})
      setFormSuccess('Password updated.')
    },
    onError: (error: Error) => {
      if (error instanceof ApiError) {
        if (Object.keys(error.details).length > 0) {
          const next: PasswordFieldErrors = {}
          let otherMessage: string | null = null
          for (const [key, message] of Object.entries(error.details)) {
            if (
              key === 'currentPassword' ||
              key === 'newPassword' ||
              key === 'confirmNewPassword'
            ) {
              next[key] = message
            } else if (key === 'newPasswordConfirmed') {
              next.confirmNewPassword = message
            } else if (key === 'newPasswordMeetingComplexity') {
              next.newPassword = message
            } else {
              otherMessage = message
            }
          }
          setFieldErrors(next)
          if (otherMessage) {
            setFormError(otherMessage)
          }
          if (Object.keys(next).length > 0 || otherMessage) {
            return
          }
        }
        setFormError(error.message)
        return
      }
      setFormError('Unable to change password right now. Please try again.')
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const localErrors: PasswordFieldErrors = {}
    if (!currentPassword) {
      localErrors.currentPassword = 'Current password is required'
    }
    if (newPassword.length < 8) {
      localErrors.newPassword = 'Password must be at least 8 characters'
    }
    if (newPassword !== confirmNewPassword) {
      localErrors.confirmNewPassword = 'Passwords do not match'
    }
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors)
      setFormError(null)
      setFormSuccess(null)
      return
    }

    passwordMutation.mutate()
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-16">
        <div>
          <p className="mb-3 text-[11px] font-medium tracking-[0.28em] text-[var(--color-gold)] uppercase">
            Account
          </p>
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-wide text-[var(--color-ink)] sm:text-5xl">
              Change password
            </h1>
            <Link
              to="/profile"
              className="shrink-0 text-[11px] font-medium tracking-[0.2em] text-[var(--color-sea)] uppercase transition hover:text-[var(--color-sea-deep)]"
            >
              ← Profile
            </Link>
          </div>
          <p className="mt-3 max-w-xl text-sm font-light text-[var(--color-stone)]">
            Use at least 8 characters with letters and numbers or symbols.
          </p>
        </div>

        <div className="mt-12 flex justify-center">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="w-full max-w-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-8 shadow-[var(--shadow-form)] sm:p-10"
          >
            <Field
              id="currentPassword"
              label="Current password"
              autoComplete="current-password"
              value={currentPassword}
              error={fieldErrors.currentPassword}
              onChange={setCurrentPassword}
            />
            <Field
              id="newPassword"
              label="New password"
              autoComplete="new-password"
              value={newPassword}
              error={fieldErrors.newPassword}
              onChange={setNewPassword}
            />
            <Field
              id="confirmNewPassword"
              label="Confirm new password"
              autoComplete="new-password"
              value={confirmNewPassword}
              error={fieldErrors.confirmNewPassword}
              onChange={setConfirmNewPassword}
            />

            {formError && (
              <p role="alert" className="mb-4 text-sm text-[var(--color-danger)]">
                {formError}
              </p>
            )}
            {formSuccess && (
              <p className="mb-4 text-sm text-[var(--color-sea-deep)]">{formSuccess}</p>
            )}

            <div className="mt-2 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={passwordMutation.isPending}
                className="bg-[var(--color-sea)] px-6 py-3 text-[11px] font-medium tracking-[0.22em] !text-white uppercase transition hover:bg-[var(--color-sea-deep)] disabled:opacity-60"
              >
                {passwordMutation.isPending ? 'Updating…' : 'Update password'}
              </button>
              <button
                type="button"
                disabled={passwordMutation.isPending}
                onClick={() => navigate('/profile')}
                className="border border-[var(--color-line)] bg-[var(--color-paper)] px-6 py-3 text-[11px] font-medium tracking-[0.22em] text-[var(--color-ink)] uppercase transition hover:border-[var(--color-sea)] disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </AppShell>
  )
}

function Field({
  id,
  label,
  value,
  error,
  onChange,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
  autoComplete?: string
}) {
  return (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-medium tracking-[0.18em] text-[var(--color-stone)] uppercase"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-[var(--color-line)] bg-[var(--color-fog)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-sea)] focus:bg-white"
      />
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  )
}
