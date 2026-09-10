import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  ALLOWED_AVATAR_TYPES,
  ApiError,
  deleteAvatar,
  MAX_AVATAR_BYTES,
  updateCurrentUser,
  uploadAvatar,
  type UserResponse,
} from '../api/client'
import { useAuth } from '../auth/useAuth'
import { AppShell } from '../components/AppShell'

type FieldErrors = Partial<Record<'firstName' | 'lastName' | 'location' | 'description', string>>

function displayValue(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : '—'
}

export function ProfilePage() {
  const { user, accessToken, setUser, refreshUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  function syncFormFromUser(next: UserResponse) {
    setFirstName(next.firstName ?? '')
    setLastName(next.lastName ?? '')
    setLocation(next.location ?? '')
    setDescription(next.description ?? '')
  }

  useEffect(() => {
    if (!user || isEditing) {
      return
    }
    syncFormFromUser(user)
  }, [user, isEditing])

  const saveMutation = useMutation({
    mutationFn: () =>
      updateCurrentUser(accessToken!, {
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        location: location.trim() || null,
        description: description.trim() || null,
      }),
    onMutate: () => {
      setFieldErrors({})
      setFormError(null)
      setFormSuccess(null)
    },
    onSuccess: (updated) => {
      setUser(updated)
      syncFormFromUser(updated)
      setIsEditing(false)
      setFormSuccess('Profile saved.')
    },
    onError: (error: Error) => {
      if (error instanceof ApiError) {
        if (error.code === 'VALIDATION_FAILED' && Object.keys(error.details).length > 0) {
          const next: FieldErrors = {}
          for (const [key, message] of Object.entries(error.details)) {
            if (
              key === 'firstName' ||
              key === 'lastName' ||
              key === 'location' ||
              key === 'description'
            ) {
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
      setFormError('Unable to save profile right now. Please try again.')
    },
  })

  const avatarUploadMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(accessToken!, file),
    onMutate: () => {
      setAvatarError(null)
      setFormSuccess(null)
    },
    onSuccess: async () => {
      await refreshUser()
      setFormSuccess('Avatar updated.')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    onError: (error: Error) => {
      if (error instanceof ApiError) {
        setAvatarError(error.message)
        return
      }
      setAvatarError('Unable to upload avatar right now. Please try again.')
    },
  })

  const avatarDeleteMutation = useMutation({
    mutationFn: () => deleteAvatar(accessToken!),
    onMutate: () => {
      setAvatarError(null)
      setFormSuccess(null)
    },
    onSuccess: async () => {
      await refreshUser()
      setFormSuccess('Avatar removed.')
    },
    onError: (error: Error) => {
      if (error instanceof ApiError) {
        setAvatarError(error.message)
        return
      }
      setAvatarError('Unable to remove avatar right now. Please try again.')
    },
  })

  function startEditing() {
    if (!user) {
      return
    }
    syncFormFromUser(user)
    setFieldErrors({})
    setFormError(null)
    setFormSuccess(null)
    setAvatarError(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    if (user) {
      syncFormFromUser(user)
    }
    setFieldErrors({})
    setFormError(null)
    setAvatarError(null)
    setIsEditing(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    saveMutation.mutate()
  }

  function handleAvatarPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    if (!(ALLOWED_AVATAR_TYPES as readonly string[]).includes(file.type)) {
      setAvatarError('Only JPEG, PNG, and WebP images are allowed')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('Avatar must be 5MB or smaller')
      return
    }
    avatarUploadMutation.mutate(file)
  }

  const avatarBusy = avatarUploadMutation.isPending || avatarDeleteMutation.isPending
  const initials = (user?.username?.slice(0, 2) ?? '?').toUpperCase()

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-16">
        {!user && (
          <p className="text-sm font-light text-[var(--color-stone)]">Loading profile…</p>
        )}

        {user && (
          <>
            <div>
              <p className="mb-3 text-[11px] font-medium tracking-[0.28em] text-[var(--color-gold)] uppercase">
                Account
              </p>
              <div className="flex items-baseline justify-between gap-4">
                <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-wide text-[var(--color-ink)] sm:text-5xl">
                  Your profile
                </h1>
                <Link
                  to="/dashboard"
                  className="shrink-0 text-[11px] font-medium tracking-[0.2em] text-[var(--color-sea)] uppercase transition hover:text-[var(--color-sea-deep)]"
                >
                  ← Dashboard
                </Link>
              </div>
            </div>

            {!isEditing && (
              <>
                <section className="mt-10 border border-[var(--color-line)] bg-[var(--color-paper)] p-6 shadow-[var(--shadow-form)] sm:p-8">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden border border-[var(--color-line)] bg-[var(--color-fog)]">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[var(--color-sea)]">
                          {initials}
                        </span>
                      )}
                    </div>
                    <dl className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
                      <ProfileItem label="Username" value={user.username} />
                      <ProfileItem label="Email" value={user.email} />
                      <ProfileItem label="First name" value={displayValue(user.firstName)} />
                      <ProfileItem label="Last name" value={displayValue(user.lastName)} />
                      <ProfileItem label="Location" value={displayValue(user.location)} />
                      <div className="sm:col-span-2">
                        <ProfileItem label="About" value={displayValue(user.description)} />
                      </div>
                    </dl>
                  </div>

                  {formSuccess && (
                    <p className="mt-6 text-sm text-[var(--color-sea-deep)]">{formSuccess}</p>
                  )}

                  <button
                    type="button"
                    onClick={startEditing}
                    className="mt-8 bg-[var(--color-sea)] px-6 py-3 text-[11px] font-medium tracking-[0.22em] text-white uppercase transition hover:bg-[var(--color-sea-deep)]"
                  >
                    Edit profile
                  </button>
                </section>
              </>
            )}

            {isEditing && (
              <>
                <section className="mt-10 border border-[var(--color-line)] bg-[var(--color-paper)] p-6 shadow-[var(--shadow-form)] sm:p-8">
                  <h2 className="mb-6 text-[11px] font-medium tracking-[0.2em] text-[var(--color-stone)] uppercase">
                    Avatar
                  </h2>
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden border border-[var(--color-line)] bg-[var(--color-fog)]">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[var(--color-sea)]">
                          {initials}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-light text-[var(--color-stone)]">
                        JPEG, PNG, or WebP · up to 5MB
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={avatarBusy}
                          onClick={() => fileInputRef.current?.click()}
                          className="border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-2 text-[11px] font-medium tracking-[0.2em] text-[var(--color-ink)] uppercase transition hover:border-[var(--color-sea)] disabled:opacity-60"
                        >
                          {avatarUploadMutation.isPending ? 'Uploading…' : 'Change photo'}
                        </button>
                        {user.avatarUrl && (
                          <button
                            type="button"
                            disabled={avatarBusy}
                            onClick={() => avatarDeleteMutation.mutate()}
                            className="border border-[var(--color-line)] bg-transparent px-4 py-2 text-[11px] font-medium tracking-[0.2em] text-[var(--color-stone)] uppercase transition hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-60"
                          >
                            {avatarDeleteMutation.isPending ? 'Removing…' : 'Remove'}
                          </button>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ALLOWED_AVATAR_TYPES.join(',')}
                        className="sr-only"
                        onChange={handleAvatarPick}
                      />
                      {avatarError && (
                        <p role="alert" className="mt-3 text-sm text-[var(--color-danger)]">
                          {avatarError}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className="mt-8 border border-[var(--color-line)] bg-[var(--color-paper)] p-6 shadow-[var(--shadow-form)] sm:p-8"
                >
                  <h2 className="mb-6 text-[11px] font-medium tracking-[0.2em] text-[var(--color-stone)] uppercase">
                    Details
                  </h2>

                  <div className="mb-4 grid gap-4 sm:grid-cols-2">
                    <ReadOnlyField id="username" label="Username" value={user.username} />
                    <ReadOnlyField id="email" label="Email" value={user.email} />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      id="firstName"
                      label="First name"
                      value={firstName}
                      error={fieldErrors.firstName}
                      onChange={setFirstName}
                    />
                    <Field
                      id="lastName"
                      label="Last name"
                      value={lastName}
                      error={fieldErrors.lastName}
                      onChange={setLastName}
                    />
                  </div>

                  <Field
                    id="location"
                    label="Location"
                    value={location}
                    error={fieldErrors.location}
                    onChange={setLocation}
                  />

                  <div className="mb-4">
                    <label
                      htmlFor="description"
                      className="mb-1.5 block text-[11px] font-medium tracking-[0.18em] text-[var(--color-stone)] uppercase"
                    >
                      About
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={4}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      className="w-full resize-y border border-[var(--color-line)] bg-[var(--color-fog)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-sea)] focus:bg-white"
                    />
                    {fieldErrors.description && (
                      <p role="alert" className="mt-1.5 text-sm text-[var(--color-danger)]">
                        {fieldErrors.description}
                      </p>
                    )}
                  </div>

                  {formError && (
                    <p role="alert" className="mb-4 text-sm text-[var(--color-danger)]">
                      {formError}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={saveMutation.isPending}
                      className="bg-[var(--color-sea)] px-6 py-3 text-[11px] font-medium tracking-[0.22em] text-white uppercase transition hover:bg-[var(--color-sea-deep)] disabled:opacity-60"
                    >
                      {saveMutation.isPending ? 'Saving…' : 'Save changes'}
                    </button>
                    <button
                      type="button"
                      disabled={saveMutation.isPending || avatarBusy}
                      onClick={cancelEditing}
                      className="border border-[var(--color-line)] bg-[var(--color-paper)] px-6 py-3 text-[11px] font-medium tracking-[0.22em] text-[var(--color-ink)] uppercase transition hover:border-[var(--color-sea)] disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
          </>
        )}
      </main>
    </AppShell>
  )
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mb-1.5 text-[11px] font-medium tracking-[0.18em] text-[var(--color-stone)] uppercase">
        {label}
      </dt>
      <dd className="whitespace-pre-wrap text-[var(--color-ink)]">{value}</dd>
    </div>
  )
}

function ReadOnlyField({ id, label, value }: { id: string; label: string; value: string }) {
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
        value={value}
        readOnly
        className="w-full border border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-fog)_70%,white)] px-3.5 py-2.5 text-[var(--color-stone)] outline-none"
      />
    </div>
  )
}

function Field({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: string
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
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
