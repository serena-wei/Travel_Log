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
  role: string
  active: boolean
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

export type JourneyResponse = {
  id: number
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
