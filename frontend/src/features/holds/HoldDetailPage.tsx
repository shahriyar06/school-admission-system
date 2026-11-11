import { useCallback, useState } from 'react'
import {
  CalendarClock,
  CircleCheck,
  CircleX,
  Clock,
  CreditCard,
  Hash,
  Hourglass,
  IdCard,
  LoaderCircle,
  ShieldCheck,
  Ticket,
  TriangleAlert,
} from 'lucide-react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { ErrorAlert } from '@/components/ErrorAlert'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useStudent } from '@/features/student/use-student'
import { getErrorMessage, isApiError } from '@/lib/api-error'
import { toBanglaDigits } from '@/lib/digits'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Hold } from '@/types/api'
import { CancelHoldDialog } from './CancelHoldDialog'
import { HoldSteps } from './HoldSteps'
import { getEffectiveStatus } from './effective-status'
import { useCancelHold, useConfirmHold, useHold } from './hooks'
import { useCountdown } from './useCountdown'

export const EXPIRED_MESSAGE = 'আবেদনের মেয়াদ শেষ হয়ে গেছে, সিট অন্যদের জন্য খুলে দেওয়া হয়েছে।'

function isNotFound(error: unknown) {
  return isApiError(error) && error.status === 404
}

export function HoldDetailPage() {
  const { holdId } = useParams()
  const hold = useHold(holdId)

  if (hold.isPending) return <HoldDetailSkeleton />

  // Data nai ar 404 (bhul / nei emon id) → "পাওয়া যায়নি"
  if (!hold.data) {
    if (isNotFound(hold.error)) return <HoldNotFound />
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <ErrorAlert
          error={hold.error}
          title="আবেদনের তথ্য আনা যায়নি"
          onRetry={() => void hold.refetch()}
          retrying={hold.isFetching}
        />
        <HoldLinks />
      </div>
    )
  }

  return (
    <HoldDetail
      hold={hold.data}
      refetch={hold.refetch}
      error={hold.isError ? hold.error : null}
      refetching={hold.isFetching}
    />
  )
}

interface HoldDetailProps {
  hold: Hold
  refetch: () => Promise<unknown>
  error: unknown
  refetching: boolean
}

function HoldDetail({ hold, refetch, error, refetching }: HoldDetailProps) {
  const { studentId } = useStudent()
  const confirm = useConfirmHold()
  const cancel = useCancelHold()
  const [dialogOpen, setDialogOpen] = useState(false)

  // Countdown 0 hole: client e sathe sathe EXPIRED, ar server theke o notun status ani
  const onExpire = useCallback(() => {
    setDialogOpen(false)
    void refetch()
  }, [refetch])
  const countdown = useCountdown(hold.status === 'HELD' ? hold.expiresAt : undefined, onExpire)

  const status = getEffectiveStatus(hold, countdown.nowMs)
  const isOwner = !!studentId && hold.studentId === studentId
  const busy = confirm.isPending || cancel.isPending
  const canAct = status === 'HELD' && isOwner

  const onConfirm = () => {
    if (!canAct || busy || !studentId) return
    // Payment er simulation: button click = payment safol, tai sorasori confirm
    confirm.mutate(
      { holdId: hold.holdId, studentId },
      {
        onSuccess: () => toast.success('ভর্তি নিশ্চিত হয়েছে'),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    )
  }

  const onCancel = () => {
    if (!canAct || busy || !studentId) return
    cancel.mutate(
      { holdId: hold.holdId, studentId },
      {
        onSuccess: () => {
          setDialogOpen(false)
          toast.success('আবেদন বাতিল করা হয়েছে, সিটটি অন্যদের জন্য খুলে দেওয়া হয়েছে।')
        },
        onError: (e) => {
          setDialogOpen(false)
          toast.error(getErrorMessage(e))
        },
      },
    )
  }

  // Sudhu rong: sesh 60 second e amber (somoy prai sesh)
  const urgent = status === 'HELD' && countdown.remainingMs <= 60_000
  const hasPanel = status === 'HELD' || status === 'EXPIRED' || busy
  // Progress er jonno prothom render er baki somoy (sudhu dekhano)
  const [initialRemaining] = useState(() => Math.max(countdown.remainingMs, 1))
  const progress = status === 'HELD' ? Math.min(100, (countdown.remainingMs / initialRemaining) * 100) : 0
  const band =
    status === 'CONFIRMED'
      ? 'bg-success'
      : status === 'HELD'
        ? 'bg-primary'
        : 'bg-danger'
  const digits = (status === 'HELD' ? toBanglaDigits(countdown.formatted) : '০০:০০').split(':')

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <p className="text-xs font-medium tracking-wide text-muted-foreground">ড্যাশবোর্ড / আবেদনের বিস্তারিত</p>

      {/* Poll fail holeo (exp: server bondho) shesh tothyo dekhai, sathe error */}
      {error != null && (
        <ErrorAlert
          error={error}
          title="সর্বশেষ তথ্য আনা যাচ্ছে না"
          onRetry={() => void refetch()}
          retrying={refetching}
        />
      )}

      <HoldSteps status={status} />

      <div className={cn('grid gap-6', hasPanel && 'lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start')}>
        {/* Admission ticket: status onujayi rong er band, niche notch soho dashed divider */}
        <Card className="relative gap-0 overflow-visible rounded-lg border-border py-0 shadow-sm">
          <div className={cn('rounded-t-lg px-6 py-6 text-white transition-colors sm:px-8', band)}>
            <CardDescription className="flex items-center gap-1.5 text-white/80">
              <Ticket className="size-4" aria-hidden />
              ভর্তির আবেদন
            </CardDescription>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-2xl font-bold tracking-tight wrap-break-word text-white sm:text-3xl">{hold.className}</CardTitle>
              <StatusBadge status={status} className="border-white/40 shadow-sm" />
            </div>
          </div>

          <CardContent className="flex flex-col gap-5 px-6 py-6 sm:px-8">
            {status === 'EXPIRED' && (
              <Alert className="rounded-md border-danger/25 bg-danger-soft px-4 py-3 text-danger-foreground">
                <TriangleAlert aria-hidden />
                <AlertTitle>মেয়াদ শেষ</AlertTitle>
                <AlertDescription className="text-danger-foreground">
                  {EXPIRED_MESSAGE} চাইলে ক্লাস তালিকা থেকে আবার আবেদন করতে পারেন (সিট খালি থাকলে)।
                </AlertDescription>
              </Alert>
            )}

            {status === 'CONFIRMED' && (
              <Alert className="rounded-md border-success/25 bg-success-soft px-4 py-3 text-success-foreground">
                <CircleCheck aria-hidden />
                <AlertTitle>ভর্তি নিশ্চিত হয়েছে</AlertTitle>
                <AlertDescription className="text-success-foreground">
                  ভর্তি ফি পাওয়া গেছে। এই ক্লাসে আপনার সিট নিশ্চিত।
                </AlertDescription>
              </Alert>
            )}

            {status === 'CANCELLED' && (
              <Alert className="rounded-md border-border bg-slate-50 px-4 py-3">
                <CircleX aria-hidden />
                <AlertTitle>আবেদন বাতিল</AlertTitle>
                <AlertDescription>এই আবেদনটি বাতিল করা হয়েছে।</AlertDescription>
              </Alert>
            )}

            {!isOwner && (
              <Alert className="rounded-md border-warning/30 bg-warning-soft px-4 py-3 text-warning-foreground">
                <TriangleAlert aria-hidden />
                <AlertTitle>{studentId ? 'এই আবেদনটি আপনার নয়' : 'Student ID দেওয়া হয়নি'}</AlertTitle>
                <AlertDescription className="text-warning-foreground">
                  {studentId
                    ? 'এই আবেদনটি অন্য একটি Student ID দিয়ে করা হয়েছে। আপনি শুধু দেখতে পারবেন, ভর্তি ফি দেওয়া বা বাতিল করা যাবে না।'
                    : 'ভর্তি ফি দিতে বা বাতিল করতে উপরে যে Student ID দিয়ে আবেদন করেছিলেন সেটি দিন।'}
                </AlertDescription>
              </Alert>
            )}

            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-4 ring-1 ring-slate-100">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <IdCard className="size-4" aria-hidden />
                  Student ID
                </dt>
                <dd className="mt-1 font-mono text-lg font-semibold tracking-wider break-all">{hold.studentId}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-4 ring-1 ring-slate-100">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="size-4" aria-hidden />
                  {status === 'HELD' ? 'মেয়াদ শেষ হবে' : 'ফি দেওয়ার শেষ সময়'}
                </dt>
                <dd className="mt-1 text-sm font-medium">{formatDateTime(hold.expiresAt)} (বাংলাদেশ সময়)</dd>
              </div>
            </dl>
          </CardContent>

          {/* Ticket er chhera dag: dui pashe notch */}
          <div className="relative px-6 sm:px-8" aria-hidden>
            <span className="absolute top-1/2 -left-3.5 size-7 -translate-y-1/2 rounded-full border border-border bg-background" />
            <span className="absolute top-1/2 -right-3.5 size-7 -translate-y-1/2 rounded-full border border-border bg-background" />
            <div className="border-t-2 border-dashed border-border" />
          </div>

          <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <dl>
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Hash className="size-4" aria-hidden />
                আবেদন নম্বর
              </dt>
              <dd className="mt-0.5 font-mono text-xs break-all">{hold.holdId}</dd>
            </dl>
            {/* Barcode er moto noksha, sudhu sajano */}
            <div className="flex h-10 items-end gap-[3px] opacity-70" aria-hidden>
              {Array.from({ length: 28 }, (_, i) => (
                <span key={i} className="w-[2px] rounded-sm bg-slate-800" style={{ height: `${40 + ((i * 37) % 60)}%` }} />
              ))}
            </div>
          </div>
        </Card>

        {/* EXPIRED hole o "ভর্তি ফি দিন" disabled obosthay thake, jate bujha jay ar fi deya jabe na */}
        {hasPanel && (
          <Card className="gap-5 rounded-lg border-border p-6 shadow-sm lg:sticky lg:top-10">
            {status === 'HELD' && (
              <div
                className={cn(
                  'rounded-lg p-5 text-center transition-colors',
                  urgent ? 'bg-warning-soft text-warning-foreground ring-1 ring-warning/30' : 'bg-accent text-primary ring-1 ring-primary/15',
                )}
              >
                <div className="flex items-center justify-center gap-1.5 text-sm font-semibold">
                  <Clock className="size-4" aria-hidden />
                  মেয়াদ শেষ হতে বাকি:
                </div>
                {/* Screen reader proti second e na porar jonno aria-live off; box gulo sudhu dekhano */}
                <div className="sr-only" aria-live="off">
                  {toBanglaDigits(countdown.formatted)}
                </div>
                <CountdownBoxes digits={digits} tone={urgent ? 'amber' : 'indigo'} />
                <div className="mt-4 h-2 overflow-hidden rounded-sm bg-white ring-1 ring-black/5" aria-hidden>
                  <div
                    className={cn('h-full transition-[width] duration-1000 ease-linear', urgent ? 'bg-warning' : 'bg-primary')}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-foreground/70">এই সময়ের মধ্যে ভর্তি ফি দিলে সিটটি আপনার জন্য নিশ্চিত হবে।</p>
              </div>
            )}

            {status === 'EXPIRED' && (
              <div className="rounded-lg bg-danger-soft p-5 text-center text-danger-foreground ring-1 ring-danger/20" aria-hidden>
                <div className="flex items-center justify-center gap-1.5 text-sm font-semibold">
                  <Hourglass className="size-4" />
                  সময় শেষ
                </div>
                <CountdownBoxes digits={digits} tone="rose" />
                <div className="mt-4 h-2 rounded-sm bg-danger/10" />
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <Button
                type="button"
                size="lg"
                className="h-12 w-full text-base font-semibold shadow-md "
                onClick={onConfirm}
                disabled={!canAct || busy}
              >
                {confirm.isPending ? <LoaderCircle className="animate-spin" aria-hidden /> : <CreditCard aria-hidden />}
                {confirm.isPending ? 'ফি দেওয়া হচ্ছে…' : 'ভর্তি ফি দিন'}
              </Button>
              {(canAct || cancel.isPending) && (
                <CancelHoldDialog
                  className={hold.className}
                  open={dialogOpen}
                  onOpenChange={setDialogOpen}
                  onConfirm={onCancel}
                  pending={cancel.isPending}
                  disabled={busy}
                />
              )}
            </div>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" aria-hidden />
              নিরাপদ পেমেন্ট (simulation)
            </p>
          </Card>
        )}
      </div>

      <HoldLinks />
    </div>
  )
}

// mm:ss (ba hh:mm:ss) er protita ongsho alada box e, sudhu dekhano
function CountdownBoxes({ digits, tone }: { digits: string[]; tone: 'indigo' | 'amber' | 'rose' }) {
  const box = {
    indigo: 'bg-white text-primary ring-primary/15',
    amber: 'bg-white text-warning-foreground ring-warning/30',
    rose: 'bg-white text-danger-foreground ring-danger/20',
  }[tone]
  return (
    <div className="mt-3 flex items-center justify-center gap-2" aria-hidden>
      {digits.map((part, i) => (
        <div key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-3xl font-bold opacity-50">:</span>}
          <span className={cn('min-w-16 rounded-sm px-3 py-2 font-mono text-4xl font-bold tabular-nums ring-1', box)}>{part}</span>
        </div>
      ))}
    </div>
  )
}

function HoldLinks() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline">
        <Link to="/me">আমার সব আবেদন</Link>
      </Button>
      <Button asChild variant="ghost">
        <Link to="/">ক্লাস তালিকা</Link>
      </Button>
    </div>
  )
}

function HoldNotFound() {
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>আবেদন পাওয়া যায়নি</CardTitle>
        <CardDescription>এই ঠিকানায় কোনো আবেদন নেই। লিংকটি ঠিক আছে কিনা দেখে নিন।</CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/me">আমার সব আবেদন</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/">ক্লাস তালিকা</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

// Asol layout er moto: upore dhap, bame details, dane action panel
function HoldDetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5" aria-label="লোড হচ্ছে">
      <Skeleton className="h-14 w-full rounded-md" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="shadow-sm">
          <CardHeader className="gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-2/3" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-32 w-full rounded-md" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
