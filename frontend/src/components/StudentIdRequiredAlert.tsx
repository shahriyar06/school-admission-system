import { IdCard } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export const STUDENT_ID_REQUIRED_MESSAGE = 'আবেদন করতে উপরে শিক্ষার্থীর ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন।'

// Student ID save kora na thakle ei message, header er box e ID dite bole
export function StudentIdRequiredAlert({ message = STUDENT_ID_REQUIRED_MESSAGE }: { message?: string }) {
  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-900">
      <IdCard aria-hidden />
      <AlertTitle>Student ID দেওয়া হয়নি</AlertTitle>
      <AlertDescription className="text-amber-900/90">{message}</AlertDescription>
    </Alert>
  )
}
