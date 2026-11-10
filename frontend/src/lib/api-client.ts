import { apiBaseUrl } from '@/config/env'
import { ApiError, NETWORK_ERROR } from '@/lib/api-error'
import type { ProblemDetails } from '@/types/api'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  // Thakle X-Student-Id header e jabe
  studentId?: string | null
  signal?: AbortSignal
}

// Sob API call ekhan diye, tai error handling ekjaygay thake
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, studentId, signal } = options

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (studentId) headers['X-Student-Id'] = studentId

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (error) {
    // Query cancel hole (signal) seta error na, abar throw kori
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    // Server bondho / CORS / internet nai: fetch nijei throw kore
    throw new ApiError(0, NETWORK_ERROR, 'Network request failed')
  }

  if (!response.ok) throw await toApiError(response)

  // 204 No Content (exp: DELETE /holds/{id}) e body nai
  if (response.status === 204) return undefined as T

  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

// ProblemDetails JSON theke ApiError; body na thakle (exp: route 404) status diye code
async function toApiError(response: Response): Promise<ApiError> {
  let problem: ProblemDetails = {}
  try {
    const text = await response.text()
    if (text) problem = JSON.parse(text) as ProblemDetails
  } catch {
    // JSON na hole khali problem niyei cholbo
  }

  const code = problem.code ?? fallbackCode(response.status)
  return new ApiError(response.status, code, problem.detail ?? problem.title, problem.errors)
}

function fallbackCode(status: number): string {
  if (status === 404) return 'NOT_FOUND'
  if (status >= 500) return 'INTERNAL_ERROR'
  return 'BAD_REQUEST'
}
