/** Event was saved, but one or more photo uploads failed afterward. */
export class EventCreatedPhotoUploadError extends Error {
  readonly eventId: number

  constructor(eventId: number, cause?: unknown) {
    super(
      'Event created, but photos could not be uploaded. You can add them on the edit page.',
      cause === undefined ? undefined : { cause },
    )
    this.name = 'EventCreatedPhotoUploadError'
    this.eventId = eventId
  }
}

export const EVENT_PHOTO_UPLOAD_WARNING_STATE_KEY = 'eventPhotoUploadWarning' as const

export type EventEditLocationState = {
  [EVENT_PHOTO_UPLOAD_WARNING_STATE_KEY]?: string
}
