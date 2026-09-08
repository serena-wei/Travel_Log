/** Convert API LocalDateTime (`2026-03-01T09:00:00`) for `<input type="datetime-local">`. */
export function toDatetimeLocalValue(value: string | null | undefined): string {
  if (!value) {
    return ''
  }
  return value.length >= 16 ? value.slice(0, 16) : value
}
