import { useId, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toAsciiDigits, toBanglaDigits } from '@/lib/digits'
import { STUDENT_ID_LENGTH, isValidStudentId } from '@/lib/student-id'
import { cn } from '@/lib/utils'
import { useStudent } from '@/features/student/use-student'

// Type korar sathe sathe bujhiye dei ki bhul ache
function describe(value: string): { ok: boolean; text: string } {
  if (value.length === 0)
    return { ok: false, text: `${toBanglaDigits(STUDENT_ID_LENGTH)} অঙ্কের জন্ম নিবন্ধন নম্বর দিন।` }
  if (!/^[0-9]+$/.test(value)) return { ok: false, text: 'শুধু সংখ্যা (০-৯) দিন।' }
  if (value.length < STUDENT_ID_LENGTH) {
    const left = STUDENT_ID_LENGTH - value.length
    return {
      ok: false,
      text: `আরও ${toBanglaDigits(left)}টি অঙ্ক বাকি (${toBanglaDigits(value.length)}/${toBanglaDigits(STUDENT_ID_LENGTH)})।`,
    }
  }
  return { ok: true, text: 'নম্বরটি সঠিক।' }
}

export function StudentIdBox() {
  const { studentId, setStudentId, clearStudentId } = useStudent()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputId = useId()
  const hintId = useId()

  // Save kora ID ache ar edit korche na: sudhu ID ar "পরিবর্তন" dekhai
  if (studentId && !editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Student ID:</span>
        <span className="font-mono font-medium tracking-wider">{studentId}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setDraft(studentId)
            setEditing(true)
          }}
        >
          পরিবর্তন
        </Button>
      </div>
    )
  }

  const status = describe(draft)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!isValidStudentId(draft) || !setStudentId(draft)) return
    setEditing(false)
    toast.success('Student ID সংরক্ষণ করা হয়েছে।')
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-1.5 sm:w-auto" noValidate>
      <Label htmlFor={inputId} className="text-sm">
        Student ID (জন্ম নিবন্ধন নম্বর)
      </Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(toAsciiDigits(e.target.value.trim()))}
          inputMode="numeric"
          autoComplete="off"
          maxLength={STUDENT_ID_LENGTH}
          placeholder="যেমন: 20152691234567890"
          aria-invalid={draft.length > 0 && !status.ok}
          aria-describedby={hintId}
          className="font-mono tracking-wider sm:w-64"
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={!status.ok} className="flex-1 sm:flex-none">
            সংরক্ষণ
          </Button>
          {studentId && (
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              বাতিল
            </Button>
          )}
          {studentId && (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                clearStudentId()
                setDraft('')
                setEditing(false)
              }}
            >
              মুছে ফেলুন
            </Button>
          )}
        </div>
      </div>
      <p
        id={hintId}
        aria-live="polite"
        className={cn('text-xs', status.ok ? 'text-emerald-600' : 'text-muted-foreground', draft.length > 0 && !status.ok && 'text-destructive')}
      >
        {status.text}
      </p>
    </form>
  )
}
