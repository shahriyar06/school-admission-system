import { useId, useState, type FormEvent } from 'react'
import { Info, LoaderCircle } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ErrorAlert } from '@/components/ErrorAlert'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/api-error'
import { toBanglaDigits } from '@/lib/digits'
import { cn } from '@/lib/utils'
import { useCreateClass } from './hooks'
import { MAX_CLASS_NAME_LENGTH, parseSeats, validateClassName, validateSeats } from './validation'

export function CreateClassPage() {
  const navigate = useNavigate()
  const createClass = useCreateClass()
  const nameId = useId()
  const seatsId = useId()

  const [name, setName] = useState('')
  const [seats, setSeats] = useState('')
  // Field chhere gele (blur) ba kichu likhle tobei error dekhai, prothomei laal na
  const [touched, setTouched] = useState({ name: false, seats: false })

  const nameError = validateClassName(name)
  const seatsError = validateSeats(seats)
  const showNameError = (touched.name || name.length > 0) && nameError
  const showSeatsError = (touched.seats || seats.length > 0) && seatsError
  const canSubmit = !nameError && !seatsError && !createClass.isPending

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTouched({ name: true, seats: true })
    if (!canSubmit) return

    createClass.mutate(
      { name: name.trim(), totalSeats: parseSeats(seats)! },
      {
        onSuccess: (created) => {
          toast.success('ক্লাস তৈরি হয়েছে', { description: created.name })
          navigate('/')
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>নতুন ক্লাস তৈরি (Admin)</CardTitle>
        <CardDescription>স্কুল কর্তৃপক্ষ এখান থেকে ভর্তির জন্য ক্লাস আর মোট সিট সংখ্যা ঠিক করবেন।</CardDescription>
      </CardHeader>

      <form onSubmit={onSubmit} noValidate>
        <CardContent className="flex flex-col gap-5">
          <Alert>
            <Info aria-hidden />
            <AlertDescription>
              প্রতিটি shift আলাদা ক্লাস হিসেবে তৈরি করুন। যেমন: "Class 6 - Morning Shift" আর "Class 6 - Day Shift" দুটি আলাদা ক্লাস।
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={nameId}>ক্লাস এর নাম</Label>
            <Input
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              placeholder="Class 6 - Morning Shift"
              autoComplete="off"
              aria-invalid={!!showNameError}
              aria-describedby={`${nameId}-hint`}
            />
            <div id={`${nameId}-hint`} className="flex justify-between gap-2 text-xs">
              <span className={cn(showNameError ? 'text-destructive' : 'text-muted-foreground')}>
                {showNameError || 'নামের আগে-পরের space বাদ দেওয়া হবে।'}
              </span>
              <span className="shrink-0 text-muted-foreground">
                {toBanglaDigits(name.trim().length)}/{toBanglaDigits(MAX_CLASS_NAME_LENGTH)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={seatsId}>মোট সিট সংখ্যা</Label>
            {/* type="number" e "1e3" ba "1.5" lekha jay, tai text + numeric keyboard */}
            <Input
              id={seatsId}
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, seats: true }))}
              inputMode="numeric"
              placeholder="যেমন: ৪০"
              autoComplete="off"
              className="sm:w-48"
              aria-invalid={!!showSeatsError}
              aria-describedby={`${seatsId}-hint`}
            />
            <p id={`${seatsId}-hint`} className={cn('text-xs', showSeatsError ? 'text-destructive' : 'text-muted-foreground')}>
              {showSeatsError || '১ থেকে ১০,০০০ এর মধ্যে একটি পূর্ণ সংখ্যা।'}
            </p>
          </div>

          {createClass.isError && <ErrorAlert error={createClass.error} title="ক্লাস তৈরি করা যায়নি" />}
        </CardContent>

        <CardFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" asChild>
            <Link to="/">ক্লাস তালিকায় ফিরে যান</Link>
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {createClass.isPending && <LoaderCircle className="animate-spin" aria-hidden />}
            {createClass.isPending ? 'তৈরি হচ্ছে…' : 'ক্লাস তৈরি করুন'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
