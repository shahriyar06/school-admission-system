import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { API, problem } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { STUDENT_A } from '@/test/fixtures'
import { ApiError, NETWORK_ERROR } from './api-error'
import { request } from './api-client'

// Request er header / body dhore rakhi assert korar jonno
function captureNext(method: 'get' | 'post' | 'delete', path: string, response: () => Response) {
  const seen: { headers: Headers; body: string | null }[] = []
  server.use(
    http[method](`${API}${path}`, async ({ request: req }) => {
      seen.push({ headers: req.headers, body: method === 'get' ? null : await req.text() })
      return response()
    }),
  )
  return seen
}

describe('request(): the single fetch wrapper used by every API call', () => {
  it('uses the configured base URL (default http://localhost:8080)', async () => {
    expect(API).toBe('http://localhost:8080')
    const seen = captureNext('get', '/ping', () => HttpResponse.json({ ok: true }))
    await expect(request('/ping')).resolves.toEqual({ ok: true })
    expect(seen).toHaveLength(1)
  })

  it('sends X-Student-Id only when a student id is given', async () => {
    const seen = captureNext('get', '/ping', () => HttpResponse.json({}))
    await request('/ping', { studentId: STUDENT_A })
    await request('/ping')
    await request('/ping', { studentId: null })
    expect(seen.map((s) => s.headers.get('X-Student-Id'))).toEqual([STUDENT_A, null, null])
  })

  it('sends a JSON body with Content-Type only when a body exists', async () => {
    const seen = captureNext('post', '/things', () => HttpResponse.json({ id: 1 }, { status: 201 }))
    await request('/things', { method: 'POST', body: { name: 'X', totalSeats: 3 } })
    await request('/things', { method: 'POST' })
    expect(seen[0].headers.get('Content-Type')).toBe('application/json')
    expect(JSON.parse(seen[0].body!)).toEqual({ name: 'X', totalSeats: 3 })
    expect(seen[1].headers.get('Content-Type')).toBeNull()
  })

  it('parses ProblemDetails into ApiError with status, code, detail and field errors', async () => {
    server.use(
      http.post(`${API}/things`, () =>
        problem(400, 'VALIDATION_ERROR', 'The request is invalid.', { totalSeats: ['totalSeats must be a whole number.'] }),
      ),
    )
    const error = await request('/things', { method: 'POST', body: {} }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'The request is invalid.',
      details: { totalSeats: ['totalSeats must be a whole number.'] },
    })
  })

  it('409 NO_SEATS keeps the backend code', async () => {
    server.use(http.post(`${API}/x`, () => problem(409, 'NO_SEATS', 'No seats available in this class.')))
    await expect(request('/x', { method: 'POST' })).rejects.toMatchObject({ status: 409, code: 'NO_SEATS' })
  })

  it('404 with an empty body (bad GUID route) becomes code NOT_FOUND', async () => {
    server.use(http.get(`${API}/holds/not-a-guid`, () => new HttpResponse(null, { status: 404 })))
    await expect(request('/holds/not-a-guid')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('500 with a non-JSON body becomes code INTERNAL_ERROR', async () => {
    server.use(http.get(`${API}/x`, () => new HttpResponse('oops', { status: 500 })))
    await expect(request('/x')).rejects.toMatchObject({ status: 500, code: 'INTERNAL_ERROR' })
  })

  it('204 No Content returns undefined', async () => {
    server.use(http.delete(`${API}/holds/1`, () => new HttpResponse(null, { status: 204 })))
    await expect(request('/holds/1', { method: 'DELETE', studentId: STUDENT_A })).resolves.toBeUndefined()
  })

  it('test guard: a request with no MSW handler is rejected (onUnhandledFrame: "error" is active)', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(request('/no-handler-for-this')).rejects.toMatchObject({ code: NETWORK_ERROR })
    expect(errors.mock.calls.flat().join(' ')).toMatch(/no-handler-for-this/)
    errors.mockRestore()
  })

  it('network failure (server down) → ApiError status 0, code NETWORK_ERROR', async () => {
    server.use(http.get(`${API}/classes`, () => HttpResponse.error()))
    const error = await request('/classes').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 0, code: NETWORK_ERROR })
  })
})

describe('apiBaseUrl: runtime config.js overrides the default (Docker API_URL)', () => {
  afterEach(() => {
    delete window.__ENV__
    vi.resetModules()
  })

  it('window.__ENV__.API_URL wins and the trailing slash is removed', async () => {
    window.__ENV__ = { API_URL: 'http://127.0.0.1:9999/' }
    vi.resetModules()
    const { apiBaseUrl } = await import('@/config/env')
    expect(apiBaseUrl).toBe('http://127.0.0.1:9999')
  })

  it('empty runtime config falls back to the default', async () => {
    window.__ENV__ = {}
    vi.resetModules()
    const { apiBaseUrl } = await import('@/config/env')
    expect(apiBaseUrl).toBe('http://localhost:8080')
  })
})
