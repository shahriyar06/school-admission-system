import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { STUDENT_A, STUDENT_B } from '@/test/fixtures'
import { STUDENT_ID_STORAGE_KEY, StudentProvider } from './StudentContext'
import { useStudent } from './use-student'

const wrapper = ({ children }: { children: ReactNode }) => <StudentProvider>{children}</StudentProvider>
const mount = () => renderHook(() => useStudent(), { wrapper })

describe('StudentProvider / useStudent (identity without login, kept in localStorage)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('starts with no student id', () => {
    expect(mount().result.current.studentId).toBeNull()
  })

  it('saves a valid 17-digit id to state and localStorage', () => {
    const { result } = mount()
    let ok = false
    act(() => {
      ok = result.current.setStudentId(STUDENT_A)
    })
    expect(ok).toBe(true)
    expect(result.current.studentId).toBe(STUDENT_A)
    expect(localStorage.getItem(STUDENT_ID_STORAGE_KEY)).toBe(STUDENT_A)
  })

  it('trims spaces around a valid id before saving', () => {
    const { result } = mount()
    act(() => {
      result.current.setStudentId(`  ${STUDENT_A}  `)
    })
    expect(localStorage.getItem(STUDENT_ID_STORAGE_KEY)).toBe(STUDENT_A)
  })

  it.each(['123', '2015269123456789A', '201526912345678901', ''])('ignores invalid id %j', (value) => {
    const { result } = mount()
    let ok = true
    act(() => {
      ok = result.current.setStudentId(value)
    })
    expect(ok).toBe(false)
    expect(result.current.studentId).toBeNull()
    expect(localStorage.getItem(STUDENT_ID_STORAGE_KEY)).toBeNull()
  })

  it('Rule 4: restores the saved id on a fresh mount (page refresh / browser restart)', () => {
    const first = mount()
    act(() => {
      first.result.current.setStudentId(STUDENT_A)
    })
    first.unmount()

    // Notun mount = notun page load, sudhu localStorage theke porbe
    expect(mount().result.current.studentId).toBe(STUDENT_A)
  })

  it('a tampered (invalid) value in localStorage is treated as no id', () => {
    localStorage.setItem(STUDENT_ID_STORAGE_KEY, 'not-a-number')
    expect(mount().result.current.studentId).toBeNull()
  })

  it('clearStudentId removes it from state and localStorage', () => {
    localStorage.setItem(STUDENT_ID_STORAGE_KEY, STUDENT_A)
    const { result } = mount()
    act(() => result.current.clearStudentId())
    expect(result.current.studentId).toBeNull()
    expect(localStorage.getItem(STUDENT_ID_STORAGE_KEY)).toBeNull()
  })

  it('follows a change made in another tab (storage event)', () => {
    const { result } = mount()
    act(() => {
      localStorage.setItem(STUDENT_ID_STORAGE_KEY, STUDENT_B)
      window.dispatchEvent(new StorageEvent('storage', { key: STUDENT_ID_STORAGE_KEY, newValue: STUDENT_B }))
    })
    expect(result.current.studentId).toBe(STUDENT_B)
  })

  it('survives localStorage throwing (private mode / blocked storage)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    const { result } = mount()
    expect(result.current.studentId).toBeNull()
    // Save na holeo ei tab er state e thake
    act(() => {
      result.current.setStudentId(STUDENT_A)
    })
    expect(result.current.studentId).toBe(STUDENT_A)
    act(() => result.current.clearStudentId())
    expect(result.current.studentId).toBeNull()
  })

  it('useStudent outside the provider throws a clear error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useStudent())).toThrow('useStudent must be used inside <StudentProvider>')
  })
})
