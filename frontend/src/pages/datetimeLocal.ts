/** Convert API LocalDateTime (`2026-03-01T09:00:00`) for `<input type="datetime-local">`. */
export function toDatetimeLocalValue(value: string | null | undefined): string {
  if (!value) {
    return ''
  }
  return value.length >= 16 ? value.slice(0, 16) : value
}

/** Bounds for `<input type="datetime-local">` from journey date-only fields. */
export function journeyDateTimeMin(startDate: string | null | undefined): string | undefined {
  if (!startDate) {
    return undefined
  }
  return `${startDate}T00:00`
}

export function journeyDateTimeMax(endDate: string | null | undefined): string | undefined {
  if (!endDate) {
    return undefined
  }
  return `${endDate}T23:59`
}

export function datePart(dateTimeLocal: string): string {
  return dateTimeLocal.slice(0, 10)
}
