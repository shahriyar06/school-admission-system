import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isValidStudentId } from '@/lib/student-id'
import { StudentContext, type StudentContextValue } from './use-student'

// Login nai, tai jonmo nibondhon number browser e rakhi: refresh / browser bondho korleo thakbe
export const STUDENT_ID_STORAGE_KEY = 'school-admission.studentId'

// Private mode ba storage block thakle localStorage throw korte pare, tai try/catch
function readStoredId(): string | null {
  try {
    const value = window.localStorage.getItem(STUDENT_ID_STORAGE_KEY)
    return isValidStudentId(value) ? value : null
  } catch {
    return null
  }
}

function writeStoredId(value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(STUDENT_ID_STORAGE_KEY)
    else window.localStorage.setItem(STUDENT_ID_STORAGE_KEY, value)
  } catch {
    // Save na holeo ei tab e state e thakbe
  }
}

export function StudentProvider({ children }: { children: ReactNode }) {
  const [studentId, setState] = useState<string | null>(readStoredId)

  // Onno tab e ID bodlale ei tab o update hobe
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STUDENT_ID_STORAGE_KEY || event.key === null) setState(readStoredId())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setStudentId = useCallback((value: string) => {
    const trimmed = value.trim()
    if (!isValidStudentId(trimmed)) return false
    writeStoredId(trimmed)
    setState(trimmed)
    return true
  }, [])

  const clearStudentId = useCallback(() => {
    writeStoredId(null)
    setState(null)
  }, [])

  const value = useMemo<StudentContextValue>(
    () => ({ studentId, setStudentId, clearStudentId }),
    [studentId, setStudentId, clearStudentId],
  )

  return <StudentContext value={value}>{children}</StudentContext>
}
