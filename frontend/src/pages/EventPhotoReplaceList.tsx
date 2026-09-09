import { useEffect, useRef, useState } from 'react'
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
  isAdding?: boolean
  isDeleting?: boolean
  onReplace: (photoId: number, file: File) => void
  onAdd: (files: File[]) => void
  onDeleteSelected: (photoIds: number[]) => void
  error?: string | null
}

const actionButtonClass =
  'border border-[var(--color-line)] px-4 py-2 text-[11px] font-medium tracking-[0.16em] text-[var(--color-ink)] uppercase transition hover:border-[var(--color-sea)] disabled:cursor-not-allowed disabled:opacity-50'

function isAllowedPhoto(file: File): boolean {
  return ALLOWED_EVENT_PHOTO_TYPES.includes(file.type as (typeof ALLOWED_EVENT_PHOTO_TYPES)[number])
}

export function EventPhotoReplaceList({
  photos,
  disabled,
  replacingPhotoId,
  isAdding,
  isDeleting,
  onReplace,
  onAdd,
  onDeleteSelected,
  error,
}: EventPhotoReplaceListProps) {
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)
  const [targetPhotoId, setTargetPhotoId] = useState<number | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())

  const remaining = MAX_EVENT_PHOTOS - photos.length
  const busy =
    disabled ||
    replacingPhotoId != null ||
    Boolean(isAdding) ||
    Boolean(isDeleting)

  useEffect(() => {
    const valid = new Set(photos.map((photo) => photo.id))
    setSelectedIds((current) => {
      const next = new Set([...current].filter((id) => valid.has(id)))
      return next.size === current.size ? current : next
    })
  }, [photos])

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

  function toggleSelected(id: number) {
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

  function requestDeleteSelected() {
    if (selectedIds.size === 0) {
      return
    }
    onDeleteSelected([...selectedIds])
  }

  const selectedCount = selectedIds.size

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
        Add multiple images (JPEG, PNG, or WebP), 5MB each. Tap photos to select, then delete them
        together. Use Replace on a photo to swap one image.
      </p>

      <input
        ref={replaceInputRef}
        type="file"
        accept={ALLOWED_EVENT_PHOTO_TYPES.join(',')}
        className="hidden"
        data-testid="replace-photo-input"
        onChange={handleReplaceChange}
      />
      <input
        ref={addInputRef}
        type="file"
        accept={ALLOWED_EVENT_PHOTO_TYPES.join(',')}
        multiple
        disabled={busy || remaining <= 0}
        data-testid="add-photo-input"
        onChange={handleAddChange}
        aria-label="Add photos"
        className="hidden"
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => addInputRef.current?.click()}
          disabled={busy || remaining <= 0}
          className={actionButtonClass}
        >
          Add photos
        </button>
        <button
          type="button"
          onClick={requestDeleteSelected}
          disabled={busy || selectedCount === 0}
          className={actionButtonClass}
        >
          Delete selected{selectedCount > 0 ? ` (${selectedCount})` : ''}
        </button>
      </div>

      {remaining <= 0 && (
        <p className="mb-3 text-sm text-[var(--color-stone)]" role="status">
          Maximum of {MAX_EVENT_PHOTOS} photos reached.
        </p>
      )}

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => {
            const isReplacing = replacingPhotoId === photo.id
            const selected = selectedIds.has(photo.id)
            return (
              <li key={photo.id} className="relative overflow-hidden border border-[var(--color-line)]">
                <button
                  type="button"
                  onClick={() => toggleSelected(photo.id)}
                  disabled={busy}
                  aria-pressed={selected}
                  aria-label={selected ? `Deselect photo ${photo.id}` : `Select photo ${photo.id}`}
                  className="block w-full text-left disabled:cursor-not-allowed"
                >
                  <img
                    src={photo.url}
                    alt=""
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
                <button
                  type="button"
                  onClick={() => openReplacePicker(photo.id)}
                  disabled={busy}
                  className="absolute right-2 bottom-2 border border-white/50 bg-black/50 px-2 py-1 text-[10px] tracking-[0.14em] text-white uppercase disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isReplacing ? 'Replacing…' : 'Replace'}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {isAdding && (
        <p className="mt-2 text-sm text-[var(--color-stone)]" role="status">
          Uploading…
        </p>
      )}
      {isDeleting && (
        <p className="mt-2 text-sm text-[var(--color-stone)]" role="status">
          Deleting…
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
