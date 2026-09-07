const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export type HealthResponse = {
  status: string
  service: string
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
  error: string
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
      error: body.error ?? response.statusText,
      code: body.code ?? 'INTERNAL_ERROR',
      message: body.message ?? `Request failed (${response.status})`,
    })
  } catch {
    return new ApiError({
      status: response.status,
      error: response.statusText,
      code: 'INTERNAL_ERROR',
      message: `Request failed (${response.status})`,
    })
  }
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/health`)
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<HealthResponse>
}

export async function registerUser(request: RegisterRequest): Promise<UserResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<UserResponse>
}

export async function loginUser(request: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<AuthResponse>
}

export async function fetchCurrentUser(accessToken: string): Promise<UserResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/users/current`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<UserResponse>
}

export type JourneyVisibility = 'PRIVATE' | 'PUBLIC'

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

export type JourneyRequest = {
  title: string
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  visibility?: JourneyVisibility | null
}

export async function listJourneys(accessToken: string): Promise<JourneyResponse[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/journeys`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<JourneyResponse[]>
}

export async function getJourney(accessToken: string, id: number): Promise<JourneyResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/journeys/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<JourneyResponse>
}

export async function createJourney(
  accessToken: string,
  request: JourneyRequest,
): Promise<JourneyResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/journeys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
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
  request: JourneyRequest,
): Promise<JourneyResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/journeys/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
  return response.json() as Promise<JourneyResponse>
}

export async function deleteJourney(accessToken: string, id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/journeys/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    throw await parseApiError(response)
  }
}

export { API_BASE_URL }
