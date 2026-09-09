import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  ALLOWED_EVENT_PHOTO_TYPES,
  MAX_EVENT_PHOTOS,
  MAX_EVENT_PHOTO_BYTES,
} from '../api/client'

export type SelectedPhoto = {
  id: string
  file: File
  previewUrl: string
}

type EventPhotoPickerProps = {
  photos: SelectedPhoto[]
  onChange: (photos: SelectedPhoto[]) => void
  error?: string | null
  disabled?: boolean
}

const actionButtonClass =
  'border border-[var(--color-line)] px-4 py-2 text-[11px] font-medium tracking-[0.16em] text-[var(--color-ink)] uppercase transition hover:border-[var(--color-sea)] disabled:cursor-not-allowed disabled:opacity-50'

function isAllowedPhoto(file: File): boolean {
  return ALLOWED_EVENT_PHOTO_TYPES.includes(file.type as (typeof ALLOWED_EVENT_PHOTO_TYPES)[number])
}

export function EventPhotoPicker({ photos, onChange, error, disabled }: EventPhotoPickerProps) {
  const photosRef = useRef(photos)
  photosRef.current = photos
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addInputId = useId()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) {
        URL.revokeObjectURL(photo.previewUrl)
      }
    }
  }, [])

  useEffect(() => {
    const valid = new Set(photos.map((photo) => photo.id))
    setSelectedIds((current) => {
      const next = new Set([...current].filter((id) => valid.has(id)))
      return next.size === current.size ? current : next
    })
  }, [photos])

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) {
      return
    }

    const remaining = MAX_EVENT_PHOTOS - photos.length
    const accepted: SelectedPhoto[] = []
    for (const file of files.slice(0, remaining)) {
      if (!isAllowedPhoto(file)) {
        continue
      }
      if (file.size > MAX_EVENT_PHOTO_BYTES) {
        continue
      }
      accepted.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })
    }
    if (accepted.length > 0) {
      onChange([...photos, ...accepted])
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function removeSelected() {
    if (selectedIds.size === 0) {
      return
    }
    for (const photo of photos) {
      if (selectedIds.has(photo.id)) {
        URL.revokeObjectURL(photo.previewUrl)
      }
    }
    onChange(photos.filter((photo) => !selectedIds.has(photo.id)))
    setSelectedIds(new Set())
  }

  const selectedCount = selectedIds.size
  const atLimit = photos.length >= MAX_EVENT_PHOTOS

  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-medium tracking-[0.18em] text-[var(--color-stone)] uppercase">
          Photos
        </p>
        <span className="text-[11px] tracking-[0.12em] text-[var(--color-stone)] uppercase">
          {photos.length}/{MAX_EVENT_PHOTOS}
        </span>
      </div>
      <p className="mb-3 text-sm font-light text-[var(--color-stone)]">
        Add multiple images (JPEG, PNG, or WebP), 5MB each. Tap photos to select, then remove them
        together.
      </p>

      <input
        ref={fileInputRef}
        id={addInputId}
        type="file"
        accept={ALLOWED_EVENT_PHOTO_TYPES.join(',')}
        multiple
        disabled={disabled || atLimit}
        onChange={handleFiles}
        aria-label="Add photos"
        className="hidden"
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || atLimit}
          className={actionButtonClass}
        >
          Add photos
        </button>
        <button
          type="button"
          onClick={removeSelected}
          disabled={disabled || selectedCount === 0}
          className={actionButtonClass}
        >
          Remove selected{selectedCount > 0 ? ` (${selectedCount})` : ''}
        </button>
      </div>

      {atLimit && (
        <p className="mb-3 text-sm text-[var(--color-stone)]" role="status">
          Maximum of {MAX_EVENT_PHOTOS} photos reached. Remove some to add more.
        </p>
      )}

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => {
            const selected = selectedIds.has(photo.id)
            return (
              <li key={photo.id} className="relative overflow-hidden border border-[var(--color-line)]">
                <button
                  type="button"
                  onClick={() => toggleSelected(photo.id)}
                  disabled={disabled}
                  aria-pressed={selected}
                  className="block w-full text-left disabled:cursor-not-allowed"
                >
                  <img
                    src={photo.previewUrl}
                    alt={photo.file.name}
                    className="aspect-square w-full object-cover"
                  />
                  <span
                    className={`absolute top-2 left-2 flex h-5 w-5 items-center justify-center border text-[10px] ${
                      selected
                        ? 'border-[var(--color-sea)] bg-[var(--color-sea)] text-white'
                        : 'border-white/80 bg-black/40 text-transparent'
                    }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {error && (
        <p role="alert" className="mt-1.5 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  )
}
