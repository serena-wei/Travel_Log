import { useEffect, useRef } from 'react'
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

export function EventPhotoPicker({ photos, onChange, error, disabled }: EventPhotoPickerProps) {
  const photosRef = useRef(photos)
  photosRef.current = photos

  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) {
        URL.revokeObjectURL(photo.previewUrl)
      }
    }
  }, [])

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) {
      return
    }

    const remaining = MAX_EVENT_PHOTOS - photos.length
    const accepted: SelectedPhoto[] = []
    for (const file of files.slice(0, remaining)) {
      if (!ALLOWED_EVENT_PHOTO_TYPES.includes(file.type as (typeof ALLOWED_EVENT_PHOTO_TYPES)[number])) {
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

  function removePhoto(id: string) {
    const target = photos.find((photo) => photo.id === id)
    if (target) {
      URL.revokeObjectURL(target.previewUrl)
    }
    onChange(photos.filter((photo) => photo.id !== id))
  }

  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label
          htmlFor="event-photos"
          className="block text-[11px] font-medium tracking-[0.18em] text-[var(--color-stone)] uppercase"
        >
          Photos
        </label>
        <span className="text-[11px] tracking-[0.12em] text-[var(--color-stone)] uppercase">
          {photos.length}/{MAX_EVENT_PHOTOS}
        </span>
      </div>
      <p className="mb-3 text-sm font-light text-[var(--color-stone)]">
        Up to {MAX_EVENT_PHOTOS} images (JPEG, PNG, or WebP), 5MB each.
      </p>
      <input
        id="event-photos"
        type="file"
        accept={ALLOWED_EVENT_PHOTO_TYPES.join(',')}
        multiple
        disabled={disabled || photos.length >= MAX_EVENT_PHOTOS}
        onChange={handleFiles}
        className="block w-full text-sm text-[var(--color-ink)] file:mr-4 file:border-0 file:bg-[var(--color-sea)] file:px-4 file:py-2 file:text-[11px] file:font-medium file:tracking-[0.16em] file:!text-white file:uppercase disabled:cursor-not-allowed disabled:opacity-60 disabled:file:opacity-60"
      />
      {photos.length >= MAX_EVENT_PHOTOS && (
        <p className="mt-2 text-sm text-[var(--color-stone)]" role="status">
          Maximum of {MAX_EVENT_PHOTOS} photos reached. Remove one to add another.
        </p>
      )}
      {photos.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <li key={photo.id} className="relative overflow-hidden border border-[var(--color-line)]">
              <img
                src={photo.previewUrl}
                alt={photo.file.name}
                className="aspect-square w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                disabled={disabled}
                className="absolute top-2 right-2 bg-black/65 px-2 py-1 text-[10px] tracking-[0.14em] text-white uppercase"
              >
                Remove
              </button>
            </li>
          ))}
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
