import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  ALLOWED_EVENT_PHOTO_TYPES,
  MAX_EVENT_PHOTO_BYTES,
  MAX_EVENT_PHOTOS,
  type EventPhotoResponse,
} from '../api/client'

type EventPhotoReplaceListProps = {
  photos: EventPhotoResponse[]
  disabled?: boolean
  replacingPhotoId: number | null
  deletingPhotoId: number | null
  isAdding?: boolean
  onReplace: (photoId: number, file: File) => void
  onAdd: (files: File[]) => void
  onDelete: (photoId: number) => void
  error?: string | null
}

function isAllowedPhoto(file: File): boolean {
  return ALLOWED_EVENT_PHOTO_TYPES.includes(file.type as (typeof ALLOWED_EVENT_PHOTO_TYPES)[number])
}

export function EventPhotoReplaceList({
  photos,
  disabled,
  replacingPhotoId,
  deletingPhotoId,
  isAdding,
  onReplace,
  onAdd,
  onDelete,
  error,
}: EventPhotoReplaceListProps) {
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const [targetPhotoId, setTargetPhotoId] = useState<number | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const remaining = MAX_EVENT_PHOTOS - photos.length
  const busy =
    disabled ||
    replacingPhotoId != null ||
    deletingPhotoId != null ||
    Boolean(isAdding)

  function openReplacePicker(photoId: number) {
    setLocalError(null)
    setTargetPhotoId(photoId)
    replaceInputRef.current?.click()
  }

  function handleReplaceChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    const photoId = targetPhotoId
    setTargetPhotoId(null)
    if (!file || photoId == null) {
      return
    }
    if (!isAllowedPhoto(file)) {
      setLocalError('Use JPEG, PNG, or WebP images only.')
      return
    }
    if (file.size > MAX_EVENT_PHOTO_BYTES) {
      setLocalError('Each photo must be 5MB or smaller.')
      return
    }
    setLocalError(null)
    onReplace(photoId, file)
  }

  function handleAddChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0 || remaining <= 0) {
      return
    }

    const accepted: File[] = []
    for (const file of files.slice(0, remaining)) {
      if (!isAllowedPhoto(file)) {
        setLocalError('Use JPEG, PNG, or WebP images only.')
        return
      }
      if (file.size > MAX_EVENT_PHOTO_BYTES) {
        setLocalError('Each photo must be 5MB or smaller.')
        return
      }
      accepted.push(file)
    }
    if (accepted.length === 0) {
      return
    }
    setLocalError(null)
    onAdd(accepted)
  }

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
        Add, replace, or delete images (JPEG, PNG, or WebP), 5MB each.
      </p>

      <input
        ref={replaceInputRef}
        type="file"
        accept={ALLOWED_EVENT_PHOTO_TYPES.join(',')}
        className="hidden"
        data-testid="replace-photo-input"
        onChange={handleReplaceChange}
      />

      {photos.length > 0 && (
        <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => {
            const isReplacing = replacingPhotoId === photo.id
            const isDeleting = deletingPhotoId === photo.id
            return (
              <li key={photo.id} className="relative overflow-hidden border border-[var(--color-line)]">
                <img
                  src={photo.url}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-2">
                  <button
                    type="button"
                    onClick={() => onDelete(photo.id)}
                    disabled={busy}
                    className="bg-black/65 px-2 py-1 text-[10px] tracking-[0.14em] text-white uppercase disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting ? 'Deleting…' : 'Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openReplacePicker(photo.id)}
                    disabled={busy}
                    className="bg-black/65 px-2 py-1 text-[10px] tracking-[0.14em] text-white uppercase disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isReplacing ? 'Replacing…' : 'Replace'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {remaining > 0 ? (
        <input
          id="event-edit-photos-add"
          type="file"
          accept={ALLOWED_EVENT_PHOTO_TYPES.join(',')}
          multiple
          disabled={busy}
          data-testid="add-photo-input"
          onChange={handleAddChange}
          aria-label="Add photos"
          className="block w-full text-sm text-[var(--color-ink)] file:mr-4 file:border-0 file:bg-[var(--color-sea)] file:px-4 file:py-2 file:text-[11px] file:font-medium file:tracking-[0.16em] file:!text-white file:uppercase disabled:cursor-not-allowed disabled:opacity-60 disabled:file:opacity-60"
        />
      ) : (
        <p className="text-sm text-[var(--color-stone)]" role="status">
          Maximum of {MAX_EVENT_PHOTOS} photos reached.
        </p>
      )}

      {isAdding && (
        <p className="mt-2 text-sm text-[var(--color-stone)]" role="status">
          Uploading…
        </p>
      )}

      {(localError || error) && (
        <p role="alert" className="mt-1.5 text-sm text-[var(--color-danger)]">
          {localError ?? error}
        </p>
      )}
    </div>
  )
}
