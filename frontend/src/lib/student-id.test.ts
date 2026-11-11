import { describe, expect, it } from 'vitest'
import { INVALID_STUDENT_IDS, STUDENT_A } from '@/test/fixtures'
import { isValidStudentId } from './student-id'

describe('isValidStudentId (same rule as backend: exactly 17 ASCII digits)', () => {
  it('accepts exactly 17 digits', () => {
    expect(isValidStudentId(STUDENT_A)).toBe(true)
  })

  it.each(Object.entries(INVALID_STUDENT_IDS))('rejects %s', (_label, value) => {
    expect(isValidStudentId(value)).toBe(false)
  })

  it('rejects null and undefined', () => {
    expect(isValidStudentId(null)).toBe(false)
    expect(isValidStudentId(undefined)).toBe(false)
  })

  it('rejects Bangla digits (backend accepts ASCII only)', () => {
    expect(isValidStudentId('২০১৫২৬৯১২৩৪৫৬৭৮৯০')).toBe(false)
  })
})
