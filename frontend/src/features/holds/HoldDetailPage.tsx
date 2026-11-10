import { useCallback, useState } from 'react'
import { CircleCheck, CircleX, Clock, LoaderCircle, TriangleAlert } from 'lucide-react'
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
import type { Hold } from '@/types/api'
import { CancelHoldDialog } from './CancelHoldDialog'
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

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      {/* Poll fail holeo (exp: server bondho) shesh tothyo dekhai, sathe error */}
      {error != null && (
        <ErrorAlert
          error={error}
          title="সর্বশেষ তথ্য আনা যাচ্ছে না"
          onRetry={() => void refetch()}
          retrying={refetching}
        />
      )}

      <Card>
        <CardHeader>
          <CardDescription>ভর্তির আবেদন</CardDescription>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-xl break-words">{hold.className}</CardTitle>
            <StatusBadge status={status} className="text-sm" />
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {status === 'HELD' && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-center text-amber-950">
              <div className="flex items-center justify-center gap-1.5 text-sm">
                <Clock className="size-4" aria-hidden />
                মেয়াদ শেষ হতে বাকি:
              </div>
              {/* Screen reader proti second e na porar jonno aria-live off */}
              <div className="mt-1 font-mono text-4xl font-bold tabular-nums" aria-live="off">
                {toBanglaDigits(countdown.formatted)}
              </div>
              <p className="mt-1 text-xs">এই সময়ের মধ্যে ভর্তি ফি দিলে সিটটি আপনার জন্য নিশ্চিত হবে।</p>
            </div>
          )}

          {status === 'EXPIRED' && (
            <Alert className="border-zinc-300 bg-zinc-50">
              <TriangleAlert aria-hidden />
              <AlertTitle>মেয়াদ শেষ</AlertTitle>
              <AlertDescription>
                {EXPIRED_MESSAGE} চাইলে ক্লাস তালিকা থেকে আবার আবেদন করতে পারেন (সিট খালি থাকলে)।
              </AlertDescription>
            </Alert>
          )}

          {status === 'CONFIRMED' && (
            <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900">
              <CircleCheck aria-hidden />
              <AlertTitle>ভর্তি নিশ্চিত হয়েছে</AlertTitle>
              <AlertDescription className="text-emerald-900/90">
                ভর্তি ফি পাওয়া গেছে। এই ক্লাসে আপনার সিট নিশ্চিত।
              </AlertDescription>
            </Alert>
          )}

          {status === 'CANCELLED' && (
            <Alert className="border-red-200 bg-red-50 text-red-900">
              <CircleX aria-hidden />
              <AlertTitle>আবেদন বাতিল</AlertTitle>
              <AlertDescription className="text-red-900/90">এই আবেদনটি বাতিল করা হয়েছে।</AlertDescription>
            </Alert>
          )}

          {!isOwner && (
            <Alert className="border-amber-300 bg-amber-50 text-amber-900">
              <TriangleAlert aria-hidden />
              <AlertTitle>{studentId ? 'এই আবেদনটি আপনার নয়' : 'Student ID দেওয়া হয়নি'}</AlertTitle>
              <AlertDescription className="text-amber-900/90">
                {studentId
                  ? 'এই আবেদনটি অন্য একটি Student ID দিয়ে করা হয়েছে। আপনি শুধু দেখতে পারবেন, ভর্তি ফি দেওয়া বা বাতিল করা যাবে না।'
                  : 'ভর্তি ফি দিতে বা বাতিল করতে উপরে যে Student ID দিয়ে আবেদন করেছিলেন সেটি দিন।'}
              </AlertDescription>
            </Alert>
          )}

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Student ID</dt>
            <dd className="font-mono break-all">{hold.studentId}</dd>
            <dt className="text-muted-foreground">{status === 'HELD' ? 'মেয়াদ শেষ হবে' : 'ফি দেওয়ার শেষ সময়'}</dt>
            <dd>{formatDateTime(hold.expiresAt)} (বাংলাদেশ সময়)</dd>
            <dt className="text-muted-foreground">আবেদন নম্বর</dt>
            <dd className="font-mono text-xs break-all">{hold.holdId}</dd>
          </dl>
        </CardContent>

        {/* EXPIRED hole o "ভর্তি ফি দিন" disabled obosthay thake, jate bujha jay ar fi deya jabe na */}
        {(status === 'HELD' || status === 'EXPIRED' || busy) && (
          <>
            <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
              <Button type="button" size="lg" onClick={onConfirm} disabled={!canAct || busy}>
                {confirm.isPending && <LoaderCircle className="animate-spin" aria-hidden />}
                {confirm.isPending ? 'ফি দেওয়া হচ্ছে…' : 'ভর্তি ফি দিন'}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>

      <HoldLinks />
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

function HoldDetailSkeleton() {
  return (
    <Card className="mx-auto max-w-xl" aria-label="লোড হচ্ছে">
      <CardHeader className="gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-2/3" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  )
}
