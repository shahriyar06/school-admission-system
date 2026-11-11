import { http, HttpResponse } from 'msw'
import { apiBaseUrl } from '@/config/env'
import type { HoldStatus } from '@/types/api'

// App je base URL e call kore, MSW o thik oikhanei dhorbe
export const API = apiBaseUrl

// Backend er moto chhoto in-memory store (classes, holds)
export interface StoredClass {
  id: string
  name: string
  totalSeats: number
  createdAt: number
}

export interface StoredHold {
  holdId: string
  classId: string
  studentId: string
  status: HoldStatus
  // epoch ms
  expiresAt: number
  createdAt: number
}

export interface RecordedRequest {
  method: string
  path: string
  studentId: string | null
  body: unknown
}

export const db = {
  classes: [] as StoredClass[],
  holds: [] as StoredHold[],
  holdDurationMs: 600_000,
  // Kon request server e gelo, test e assert korar jonno
  requests: [] as RecordedRequest[],
}

export function resetDb() {
  db.classes = []
  db.holds = []
  db.holdDurationMs = 600_000
  db.requests = []
}

let seq = 0
// createdAt alada rakhi, jate "notun theke purono" order nischit hoy
function nextCreatedAt() {
  seq += 1
  return Date.now() + seq
}

export function seedClass(partial: Partial<StoredClass> & { name: string; totalSeats: number }): StoredClass {
  const item: StoredClass = { id: crypto.randomUUID(), createdAt: nextCreatedAt(), ...partial }
  db.classes.push(item)
  return item
}

export function seedHold(
  partial: Partial<StoredHold> & { classId: string; studentId: string; expiresInMs?: number },
): StoredHold {
  const { expiresInMs, ...rest } = partial
  const hold: StoredHold = {
    holdId: crypto.randomUUID(),
    status: 'HELD',
    createdAt: nextCreatedAt(),
    expiresAt: Date.now() + (expiresInMs ?? db.holdDurationMs),
    ...rest,
  }
  db.holds.push(hold)
  return hold
}

// Backend er GetEffectiveStatus er moto
function effectiveStatus(h: StoredHold): HoldStatus {
  return h.status === 'HELD' && h.expiresAt <= Date.now() ? 'EXPIRED' : h.status
}

export function holdDto(h: StoredHold) {
  const cls = db.classes.find((c) => c.id === h.classId)
  return {
    holdId: h.holdId,
    classId: h.classId,
    className: cls?.name ?? '',
    studentId: h.studentId,
    status: effectiveStatus(h),
    expiresAt: new Date(h.expiresAt).toISOString(),
  }
}

function classDto(c: StoredClass) {
  const active = db.holds.filter((h) => h.classId === c.id)
  const held = active.filter((h) => effectiveStatus(h) === 'HELD').length
  const confirmed = active.filter((h) => h.status === 'CONFIRMED').length
  return {
    id: c.id,
    name: c.name,
    totalSeats: c.totalSeats,
    heldSeats: held,
    confirmedSeats: confirmed,
    availableSeats: Math.max(0, c.totalSeats - held - confirmed),
  }
}

// Backend er ProblemDetails format: { status, title, detail, code }
export function problem(status: number, code: string, detail: string, errors?: Record<string, string[]>) {
  return HttpResponse.json(
    { status, title: code, detail, code, ...(errors ? { errors } : {}) },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )
}

// :guid route constraint er moto: vul format hole khali body 404
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const emptyNotFound = () => new HttpResponse(null, { status: 404 })

function studentFrom(request: Request): string | null {
  const raw = request.headers.get('X-Student-Id')?.trim() ?? ''
  return /^[0-9]{17}$/.test(raw) ? raw : null
}

const invalidStudent = () => problem(400, 'INVALID_STUDENT_ID', 'X-Student-Id must be exactly 17 digits.')

async function record(request: Request, body?: unknown) {
  db.requests.push({
    method: request.method,
    path: new URL(request.url).pathname,
    studentId: request.headers.get('X-Student-Id'),
    body,
  })
}

export const handlers = [
  http.get(`${API}/classes`, async ({ request }) => {
    await record(request)
    return HttpResponse.json([...db.classes].sort((a, b) => a.createdAt - b.createdAt).map(classDto))
  }),

  http.post(`${API}/classes`, async ({ request }) => {
    let body: { name?: unknown; totalSeats?: unknown }
    try {
      body = (await request.json()) as typeof body
    } catch {
      await record(request)
      return problem(400, 'VALIDATION_ERROR', 'The request is invalid.', {
        body: ['Request body is missing or is not valid JSON.'],
      })
    }
    await record(request, body)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name) return problem(400, 'VALIDATION_ERROR', 'Class name is required.')
    if (name.length > 200) return problem(400, 'VALIDATION_ERROR', 'Class name must be at most 200 characters.')
    if (typeof body.totalSeats !== 'number' || !Number.isInteger(body.totalSeats))
      return problem(400, 'VALIDATION_ERROR', 'The request is invalid.', {
        totalSeats: ['totalSeats must be a whole number.'],
      })
    if (body.totalSeats <= 0) return problem(400, 'VALIDATION_ERROR', 'Total seats must be greater than 0.')
    if (body.totalSeats > 10_000) return problem(400, 'VALIDATION_ERROR', 'Total seats must be at most 10000.')
    const created = seedClass({ name, totalSeats: body.totalSeats })
    return HttpResponse.json({ id: created.id, name: created.name, totalSeats: created.totalSeats }, { status: 201 })
  }),

  http.get(`${API}/classes/:classId`, async ({ request, params }) => {
    await record(request)
    if (!GUID.test(String(params.classId))) return emptyNotFound()
    const c = db.classes.find((x) => x.id === params.classId)
    return c ? HttpResponse.json(classDto(c)) : problem(404, 'CLASS_NOT_FOUND', 'Class not found.')
  }),

  http.post(`${API}/classes/:classId/holds`, async ({ request, params }) => {
    await record(request)
    if (!GUID.test(String(params.classId))) return emptyNotFound()
    const studentId = studentFrom(request)
    if (!studentId) return invalidStudent()
    const c = db.classes.find((x) => x.id === params.classId)
    if (!c) return problem(404, 'CLASS_NOT_FOUND', 'Class not found.')
    // Somoy par hoye jaoa HELD gulo EXPIRED (backend er ExpireStaleHoldsAsync)
    for (const h of db.holds) if (h.classId === c.id && effectiveStatus(h) === 'EXPIRED' && h.status === 'HELD') h.status = 'EXPIRED'
    const active = db.holds.filter((h) => h.classId === c.id && (h.status === 'HELD' || h.status === 'CONFIRMED'))
    if (active.some((h) => h.studentId === studentId))
      return problem(409, 'ALREADY_APPLIED', 'Student already has an active hold for this class.')
    if (active.length >= c.totalSeats) return problem(409, 'NO_SEATS', 'No seats available in this class.')
    const hold = seedHold({ classId: c.id, studentId })
    return HttpResponse.json(holdDto(hold), { status: 201 })
  }),

  http.get(`${API}/holds/:holdId`, async ({ request, params }) => {
    await record(request)
    if (!GUID.test(String(params.holdId))) return emptyNotFound()
    const h = db.holds.find((x) => x.holdId === params.holdId)
    return h ? HttpResponse.json(holdDto(h)) : problem(404, 'HOLD_NOT_FOUND', 'Hold not found.')
  }),

  http.post(`${API}/holds/:holdId/confirm`, async ({ request, params }) => {
    await record(request)
    if (!GUID.test(String(params.holdId))) return emptyNotFound()
    const studentId = studentFrom(request)
    if (!studentId) return invalidStudent()
    const h = db.holds.find((x) => x.holdId === params.holdId)
    if (!h) return problem(404, 'HOLD_NOT_FOUND', 'Hold not found.')
    if (h.studentId !== studentId) return problem(403, 'FORBIDDEN', 'This hold belongs to another student.')
    if (h.status === 'CONFIRMED') return HttpResponse.json(holdDto(h))
    const status = effectiveStatus(h)
    if (status !== 'HELD') return problem(409, 'INVALID_HOLD_STATE', `Hold cannot be confirmed because it is ${status}.`)
    h.status = 'CONFIRMED'
    return HttpResponse.json(holdDto(h))
  }),

  http.delete(`${API}/holds/:holdId`, async ({ request, params }) => {
    await record(request)
    if (!GUID.test(String(params.holdId))) return emptyNotFound()
    const studentId = studentFrom(request)
    if (!studentId) return invalidStudent()
    const h = db.holds.find((x) => x.holdId === params.holdId)
    if (!h) return problem(404, 'HOLD_NOT_FOUND', 'Hold not found.')
    if (h.studentId !== studentId) return problem(403, 'FORBIDDEN', 'This hold belongs to another student.')
    if (h.status === 'CANCELLED') return new HttpResponse(null, { status: 204 })
    const status = effectiveStatus(h)
    if (status !== 'HELD') return problem(409, 'INVALID_HOLD_STATE', `Hold cannot be cancelled because it is ${status}.`)
    h.status = 'CANCELLED'
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/me/holds`, async ({ request }) => {
    await record(request)
    const studentId = studentFrom(request)
    if (!studentId) return invalidStudent()
    return HttpResponse.json(
      db.holds
        .filter((h) => h.studentId === studentId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(holdDto),
    )
  }),
]

// Kono request koto bar gelo (exp: confirm pathano hoyni proman korte)
export function countRequests(method: string, pathPart: string) {
  return db.requests.filter((r) => r.method === method && r.path.includes(pathPart)).length
}
