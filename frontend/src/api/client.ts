export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export const API_V1 = '/api/v1'

export type JourneyVisibility = 'PRIVATE' | 'PUBLIC'

function jsonHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` }
}

function authJsonHeaders(accessToken: string): HeadersInit {
  return {
    ...authHeaders(accessToken),
    ...jsonHeaders(),
  }
}

export type HealthResponse = {
  status: string
  serviceName: string
  timestamp: string
}

export type RegisterRequest = {
  username: string
  email: string
  password: string
  confirmPassword: string
  firstName?: string
  lastName?: string
  location?: string
}

export type LoginRequest = {
  username: string
  password: string
}

export type UserResponse = {
  id: number
  username: string
  email: string
  firstName: string | null
  lastName: string | null
  location: string | null
  description: string | null
  avatarUrl: string | null
  role: string
  active: boolean
}

export type UpdateUserProfileRequest = {
  firstName?: string | null
  lastName?: string | null
  location?: string | null
  description?: string | null
}

export type AuthResponse = {
  accessToken: string
  tokenType: string
  user: UserResponse
}

export type ApiErrorBody = {
  timestamp?: string
  status: number
  reasonPhrase: string
  code: string
  message: string
  details?: Record<string, string>
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: Record<string, string>

  constructor(body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.status = body.status
    this.code = body.code
    this.details = body.details ?? {}
  }
}

async function parseApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ApiErrorBody
    return new ApiError({
      ...body,
      status: body.status ?? response.status,
      reasonPhrase: body.reasonPhrase ?? response.statusText,
      code: body.code ?? 'INTERNAL_ERROR',
      message: body.message ?? `Request failed (${response.status})`,
    })
  } catch {
    return new ApiError({
      status: response.status,
      reasonPhrase: response.statusText,
      code: 'INTERNAL_ERROR',
      message: `Request failed (${response.status})`,
    })
  }
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}${API_V1}/health`)
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<HealthResponse>
}

export async function registerUser(request: RegisterRequest): Promise<UserResponse> {
  const response = await fetch(`${API_BASE_URL}${API_V1}/auth/register`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<UserResponse>
}

export async function loginUser(request: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${API_V1}/auth/login`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<AuthResponse>
}

export async function fetchCurrentUser(accessToken: string): Promise<UserResponse> {
  const response = await fetch(`${API_BASE_URL}${API_V1}/users/current`, {
    headers: authHeaders(accessToken),
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<UserResponse>
}

export async function updateCurrentUser(
  accessToken: string,
  request: UpdateUserProfileRequest,
): Promise<UserResponse> {
  const response = await fetch(`${API_BASE_URL}${API_V1}/users/current`, {
    method: 'PATCH',
    headers: authJsonHeaders(accessToken),
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<UserResponse>
}

export type PresignAvatarResponse = {
  uploadUrl: string
  objectKey: string
  contentType: string
}

export type PresignAvatarRequest = {
  contentType: string
  sizeBytes: number
  fileName?: string
}

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024
export const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export async function presignAvatar(
  accessToken: string,
  request: PresignAvatarRequest,
): Promise<PresignAvatarResponse> {
  const response = await fetch(`${API_BASE_URL}${API_V1}/users/current/avatar/presign`, {
    method: 'POST',
    headers: authJsonHeaders(accessToken),
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<PresignAvatarResponse>
}

export async function uploadAvatar(accessToken: string, file: File): Promise<PresignAvatarResponse> {
  const contentType = file.type || 'image/jpeg'
  const presigned = await presignAvatar(accessToken, {
    contentType,
    sizeBytes: file.size,
    fileName: file.name,
  })
  const uploadResponse = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  })
  if (!uploadResponse.ok) {
    throw new Error(`Avatar upload failed (${uploadResponse.status})`)
  }
  return presigned
}

export async function deleteAvatar(accessToken: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${API_V1}/users/current/avatar`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
}

export type JourneyResponse = {
  id: number
  ownerId: number
  ownerUsername: string
  ownerAvatarUrl: string | null
  coverImageUrl: string | null
  title: string
  description: string | null
  startDate: string | null
  endDate: string | null
  visibility: JourneyVisibility
  createdAt: string
  updatedAt: string
}

export type SaveJourneyRequest = {
  title: string
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  visibility?: JourneyVisibility | null
}

export async function listJourneys(accessToken: string): Promise<JourneyResponse[]> {
  const response = await fetch(`${API_BASE_URL}${API_V1}/journeys`, {
    headers: authHeaders(accessToken),
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<JourneyResponse[]>
}

export async function listPublicJourneys(accessToken: string): Promise<JourneyResponse[]> {
  const response = await fetch(`${API_BASE_URL}${API_V1}/public/journeys`, {
    headers: authHeaders(accessToken),
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<JourneyResponse[]>
}

export async function getJourney(accessToken: string, id: number): Promise<JourneyResponse> {
  const response = await fetch(`${API_BASE_URL}${API_V1}/journeys/${id}`, {
    headers: authHeaders(accessToken),
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<JourneyResponse>
}

export async function createJourney(
  accessToken: string,
  request: SaveJourneyRequest,
): Promise<JourneyResponse> {
  const response = await fetch(`${API_BASE_URL}${API_V1}/journeys`, {
    method: 'POST',
    headers: authJsonHeaders(accessToken),
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<JourneyResponse>
}

export async function updateJourney(
  accessToken: string,
  id: number,
  request: SaveJourneyRequest,
): Promise<JourneyResponse> {
  const response = await fetch(`${API_BASE_URL}${API_V1}/journeys/${id}`, {
    method: 'PUT',
    headers: authJsonHeaders(accessToken),
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<JourneyResponse>
}

export async function deleteJourney(accessToken: string, id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${API_V1}/journeys/${id}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
}

export type EventPhotoResponse = {
  id: number
  url: string
  contentType: string
  sizeBytes: number
  sortOrder: number
  createdAt: string
}

export type EventResponse = {
  id: number
  journeyId: number
  title: string
  description: string | null
  startAt: string
  endAt: string | null
  photos: EventPhotoResponse[]
  createdAt: string
  updatedAt: string
}

export type SaveEventRequest = {
  title: string
  description?: string | null
  startAt: string
  endAt?: string | null
}

export type PresignPhotoRequest = {
  contentType: string
  sizeBytes: number
  fileName?: string
}

export type PresignPhotoResponse = {
  photoId: number
  uploadUrl: string
  objectKey: string
  contentType: string
  sortOrder: number
}

export const MAX_EVENT_PHOTOS = 10
export const MAX_EVENT_PHOTO_BYTES = 5 * 1024 * 1024
export const ALLOWED_EVENT_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export async function listEvents(
  accessToken: string,
  journeyId: number,
): Promise<EventResponse[]> {
  const response = await fetch(`${API_BASE_URL}${API_V1}/journeys/${journeyId}/events`, {
    headers: authHeaders(accessToken),
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<EventResponse[]>
}

export async function getEvent(
  accessToken: string,
  journeyId: number,
  eventId: number,
): Promise<EventResponse> {
  const response = await fetch(
    `${API_BASE_URL}${API_V1}/journeys/${journeyId}/events/${eventId}`,
    {
      headers: authHeaders(accessToken),
    },
  )
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<EventResponse>
}

export async function createEvent(
  accessToken: string,
  journeyId: number,
  request: SaveEventRequest,
): Promise<EventResponse> {
  const response = await fetch(`${API_BASE_URL}${API_V1}/journeys/${journeyId}/events`, {
    method: 'POST',
    headers: authJsonHeaders(accessToken),
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<EventResponse>
}

export async function updateEvent(
  accessToken: string,
  journeyId: number,
  eventId: number,
  request: SaveEventRequest,
): Promise<EventResponse> {
  const response = await fetch(
    `${API_BASE_URL}${API_V1}/journeys/${journeyId}/events/${eventId}`,
    {
      method: 'PUT',
      headers: authJsonHeaders(accessToken),
      body: JSON.stringify(request),
    },
  )
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<EventResponse>
}

export async function deleteEvent(
  accessToken: string,
  journeyId: number,
  eventId: number,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}${API_V1}/journeys/${journeyId}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: authHeaders(accessToken),
    },
  )
  if (!response.ok) {
    throw await parseApiError(response)
  }
}

export async function presignEventPhoto(
  accessToken: string,
  journeyId: number,
  eventId: number,
  request: PresignPhotoRequest,
): Promise<PresignPhotoResponse> {
  const response = await fetch(
    `${API_BASE_URL}${API_V1}/journeys/${journeyId}/events/${eventId}/photos/presign`,
    {
      method: 'POST',
      headers: authJsonHeaders(accessToken),
      body: JSON.stringify(request),
    },
  )
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<PresignPhotoResponse>
}

export async function uploadEventPhoto(
  accessToken: string,
  journeyId: number,
  eventId: number,
  file: File,
): Promise<PresignPhotoResponse> {
  const contentType = file.type || 'image/jpeg'
  const presigned = await presignEventPhoto(accessToken, journeyId, eventId, {
    contentType,
    sizeBytes: file.size,
    fileName: file.name,
  })
  const uploadResponse = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  })
  if (!uploadResponse.ok) {
    throw new Error(`Photo upload failed (${uploadResponse.status})`)
  }
  return presigned
}

export async function replaceEventPhoto(
  accessToken: string,
  journeyId: number,
  eventId: number,
  photoId: number,
  file: File,
): Promise<PresignPhotoResponse> {
  const contentType = file.type || 'image/jpeg'
  const response = await fetch(
    `${API_BASE_URL}${API_V1}/journeys/${journeyId}/events/${eventId}/photos/${photoId}/presign-replace`,
    {
      method: 'POST',
      headers: authJsonHeaders(accessToken),
      body: JSON.stringify({
        contentType,
        sizeBytes: file.size,
        fileName: file.name,
      }),
    },
  )
  if (!response.ok) {
    throw await parseApiError(response)
  }
  const presigned = (await response.json()) as PresignPhotoResponse
  const uploadResponse = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  })
  if (!uploadResponse.ok) {
    throw new Error(`Photo replace upload failed (${uploadResponse.status})`)
  }
  return presigned
}

export async function deleteEventPhoto(
  accessToken: string,
  journeyId: number,
  eventId: number,
  photoId: number,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}${API_V1}/journeys/${journeyId}/events/${eventId}/photos/${photoId}`,
    {
      method: 'DELETE',
      headers: authHeaders(accessToken),
    },
  )
  if (!response.ok) {
    throw await parseApiError(response)
  }
}
