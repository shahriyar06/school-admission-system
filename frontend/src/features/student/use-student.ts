import { createContext, useContext } from 'react'

export interface StudentContextValue {
  // Sudhu valid (17 digit) save kora ID, na thakle null
  studentId: string | null
  // Valid hole save kore true dey, invalid hole kichu kore na, false
  setStudentId: (value: string) => boolean
  clearStudentId: () => void
}

export const StudentContext = createContext<StudentContextValue | null>(null)

export function useStudent(): StudentContextValue {
  const value = useContext(StudentContext)
  if (!value) throw new Error('useStudent must be used inside <StudentProvider>')
  return value
}
