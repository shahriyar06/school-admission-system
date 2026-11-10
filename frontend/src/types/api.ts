// Backend er DTO er sathe hubohu mil (backend/src/SchoolAdmission.Application/**/*Dtos.cs)

// GET /classes, GET /classes/{id}
export interface ClassSummary {
  id: string
  name: string
  totalSeats: number
  heldSeats: number
  confirmedSeats: number
  availableSeats: number
}

// POST /classes body
export interface CreateClassRequest {
  name: string
  totalSeats: number
}

// POST /classes response (201)
export interface CreatedClass {
  id: string
  name: string
  totalSeats: number
}

export type HoldStatus = 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED'

// Hold er sob response (create, get, confirm, /me/holds)
export interface Hold {
  holdId: string
  classId: string
  className: string
  studentId: string
  status: HoldStatus
  // UTC ISO string, exp: "2026-11-10T14:42:56.989178Z"
  expiresAt: string
}

// Backend er error format (application/problem+json)
export interface ProblemDetails {
  status?: number
  title?: string
  detail?: string
  code?: string
  errors?: Record<string, string[]>
}
