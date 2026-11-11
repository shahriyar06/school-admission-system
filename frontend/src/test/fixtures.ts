import type { ClassSummary, Hold, HoldStatus } from '@/types/api'

// 17 digit jonmo nibondhon number
export const STUDENT_A = '20152691234567890'
export const STUDENT_B = '20152691234567891'

export const INVALID_STUDENT_IDS = {
  '16 digits': '2015269123456789',
  '18 digits': '201526912345678901',
  letters: '2015269123456789A',
  spaces: '2015 2691 2345 678',
  empty: '',
} as const

export function makeClass(overrides: Partial<ClassSummary> = {}): ClassSummary {
  return {
    id: crypto.randomUUID(),
    name: 'Class 6 - Morning Shift',
    totalSeats: 5,
    heldSeats: 0,
    confirmedSeats: 0,
    availableSeats: 5,
    ...overrides,
  }
}

export function makeHold(overrides: Partial<Hold> & { expiresInMs?: number; status?: HoldStatus } = {}): Hold {
  const { expiresInMs = 600_000, ...rest } = overrides
  return {
    holdId: crypto.randomUUID(),
    classId: crypto.randomUUID(),
    className: 'Class 6 - Morning Shift',
    studentId: STUDENT_A,
    status: 'HELD',
    expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    ...rest,
  }
}
