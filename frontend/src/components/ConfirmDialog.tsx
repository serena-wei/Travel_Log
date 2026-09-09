import { useEffect, useId, useRef } from 'react'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    cancelRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) {
        onCancel()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, busy, onCancel])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-ink)_45%,transparent)]"
        disabled={busy}
        onClick={() => {
          if (!busy) {
            onCancel()
          }
        }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md border border-[var(--color-line)] bg-[var(--color-paper)] p-6 shadow-[var(--shadow-form)] sm:p-8"
      >
        <p className="mb-3 text-[11px] font-medium tracking-[0.28em] text-[var(--color-gold)] uppercase">
          Confirm
        </p>
        <h2
          id={titleId}
          className="font-[family-name:var(--font-display)] text-3xl font-medium tracking-wide text-[var(--color-ink)]"
        >
          {title}
        </h2>
        <p id={descriptionId} className="mt-3 text-sm font-light leading-relaxed text-[var(--color-stone)]">
          {description}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="bg-[var(--color-danger)] px-5 py-3 text-[11px] font-medium tracking-[0.2em] !text-white uppercase transition hover:bg-[color-mix(in_srgb,var(--color-danger)_88%,black)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="border border-[var(--color-line)] px-5 py-3 text-[11px] font-medium tracking-[0.2em] text-[var(--color-ink)] uppercase transition hover:border-[var(--color-sea)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
