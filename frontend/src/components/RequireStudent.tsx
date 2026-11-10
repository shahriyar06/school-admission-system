import type { ReactNode } from 'react'
import { useStudent } from '@/features/student/use-student'
import { StudentIdRequiredAlert } from './StudentIdRequiredAlert'

interface RequireStudentProps {
  // Valid Student ID nischit thakle ei function e pass hoy
  children: (studentId: string) => ReactNode
  message?: string
}

// Student er nijer data (exp: /me) dekhate valid Student ID lagbe, na thakle Alert
export function RequireStudent({ children, message }: RequireStudentProps) {
  const { studentId } = useStudent()
  if (!studentId) return <StudentIdRequiredAlert message={message} />
  return <>{children(studentId)}</>
}
