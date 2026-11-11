import { useId, useState, type FormEvent } from 'react'
import { Armchair, CirclePlus, ClipboardPen, Info, LoaderCircle, Type } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ErrorAlert } from '@/components/ErrorAlert'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/api-error'
import { toBanglaDigits } from '@/lib/digits'
import { cn } from '@/lib/utils'
import { ClassPreview } from './ClassPreview'
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
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={CirclePlus}
        breadcrumb="ক্লাস তৈরি"
        title="নতুন ক্লাস তৈরি (Admin)"
        subtitle="স্কুল কর্তৃপক্ষ এখান থেকে ভর্তির জন্য ক্লাস আর মোট সিট সংখ্যা ঠিক করবেন।"
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <Card className="w-full gap-0 rounded-lg border-border py-0 shadow-sm">
      <CardHeader className="border-b bg-slate-50/70 px-6 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-primary" aria-hidden>
            <ClipboardPen className="size-4" />
          </span>
          ক্লাসের তথ্য
        </p>
      </CardHeader>

      <form onSubmit={onSubmit} noValidate>
        <CardContent className="flex flex-col gap-6 px-6 py-6">
          <Alert className="border-primary/15 bg-primary/5 px-4 py-3">
            <Info className="text-primary" aria-hidden />
            <AlertDescription className="text-foreground/80">
              প্রতিটি shift আলাদা ক্লাস হিসেবে তৈরি করুন। যেমন: "Class 6 - Morning Shift" আর "Class 6 - Day Shift" দুটি আলাদা ক্লাস।
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={nameId}>
              <Type className="size-4 text-primary" aria-hidden />
              ক্লাস এর নাম
            </Label>
            <Input
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              placeholder="Class 6 - Morning Shift"
              autoComplete="off"
              aria-invalid={!!showNameError}
              aria-describedby={`${nameId}-hint`}
              className="h-11 text-base"
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
            <Label htmlFor={seatsId}>
              <Armchair className="size-4 text-primary" aria-hidden />
              মোট সিট সংখ্যা
            </Label>
            {/* type="number" e "1e3" ba "1.5" lekha jay, tai text + numeric keyboard */}
            <Input
              id={seatsId}
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, seats: true }))}
              inputMode="numeric"
              placeholder="যেমন: ৪০"
              autoComplete="off"
              className="h-11 text-base sm:w-56"
              aria-invalid={!!showSeatsError}
              aria-describedby={`${seatsId}-hint`}
            />
            <p id={`${seatsId}-hint`} className={cn('text-xs', showSeatsError ? 'text-destructive' : 'text-muted-foreground')}>
              {showSeatsError || '১ থেকে ১০,০০০ এর মধ্যে একটি পূর্ণ সংখ্যা।'}
            </p>
          </div>

          {createClass.isError && <ErrorAlert error={createClass.error} title="ক্লাস তৈরি করা যায়নি" />}
        </CardContent>

        <CardFooter className="flex flex-col-reverse gap-2 border-t bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" asChild>
            <Link to="/">ক্লাস তালিকায় ফিরে যান</Link>
          </Button>
          <Button type="submit" size="lg" disabled={!canSubmit} className="min-w-40">
            {createClass.isPending && <LoaderCircle className="animate-spin" aria-hidden />}
            {createClass.isPending ? 'তৈরি হচ্ছে…' : 'ক্লাস তৈরি করুন'}
          </Button>
        </CardFooter>
      </form>
    </Card>

        <ClassPreview name={name.trim()} seats={parseSeats(seats)} />
      </div>
    </div>
  )
}
