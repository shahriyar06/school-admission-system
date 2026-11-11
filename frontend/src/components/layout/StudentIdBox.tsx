import { useId, useState, type FormEvent } from 'react'
import { IdCard } from 'lucide-react'
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
  // maxLength bypass kore (programmatic) beshi digit asle o valid na
  if (value.length > STUDENT_ID_LENGTH)
    return { ok: false, text: `সর্বোচ্চ ${toBanglaDigits(STUDENT_ID_LENGTH)}টি অঙ্ক দেওয়া যাবে (এখন ${toBanglaDigits(value.length)}টি)।` }
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
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-lg bg-white/5 p-3 text-sm ring-1 ring-white/10 lg:flex-col lg:items-stretch">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-white/10 text-blue-200" aria-hidden>
            <IdCard className="size-4" />
          </span>
          <span className="text-xs text-sidebar-muted">Student ID:</span>
        </div>
        <span className="min-w-0 font-mono text-[15px] font-semibold tracking-wider break-all text-white tabular-nums">{studentId}</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="bg-white/10 text-white hover:bg-white/20 lg:w-full"
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
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-2 rounded-lg bg-white/5 p-3 ring-1 ring-white/10" noValidate>
      <Label htmlFor={inputId} className="text-xs font-medium text-sidebar-muted">
        <IdCard className="size-3.5 text-blue-200" aria-hidden />
        Student ID (জন্ম নিবন্ধন নম্বর)
      </Label>
      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
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
          className="h-10 border-white/15 bg-white/10 font-mono tracking-wider text-white placeholder:text-white/50 sm:w-64 lg:w-full"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!status.ok} className="flex-1 bg-sidebar-primary hover:bg-sidebar-primary/85 sm:flex-none lg:flex-1">
            সংরক্ষণ
          </Button>
          {studentId && (
            <Button type="button" variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setEditing(false)}>
              বাতিল
            </Button>
          )}
          {studentId && (
            <Button
              type="button"
              variant="ghost"
              className="text-red-300 hover:bg-white/10 hover:text-red-200"
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
        className={cn('text-xs', status.ok ? 'text-emerald-300' : 'text-sidebar-muted', draft.length > 0 && !status.ok && 'text-red-300')}
      >
        {status.text}
      </p>
    </form>
  )
}
