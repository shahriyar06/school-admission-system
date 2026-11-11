import { useCallback } from 'react'
import { ClipboardList, Inbox, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { ErrorAlert } from '@/components/ErrorAlert'
import { PageHeader } from '@/components/PageHeader'
import { RequireStudent } from '@/components/RequireStudent'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTime } from '@/lib/format'
import { useMyHolds } from './hooks'
import { MY_HOLDS_GRID, MyHoldRow } from './MyHoldRow'
import { toBanglaDigits } from '@/lib/digits'
import { cn } from '@/lib/utils'
import type { Hold, HoldStatus } from '@/types/api'

export function MyHoldsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={ClipboardList}
        breadcrumb="আমার আবেদন"
        title="আমার আবেদন"
        subtitle="এই Student ID দিয়ে করা সব আবেদন (নতুন থেকে পুরনো)। Page reload বা browser বন্ধ করলেও এখানে পাবেন।"
      />
      <RequireStudent message="আপনার আবেদন দেখতে উপরে শিক্ষার্থীর ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন।">
        {(studentId) => <MyHoldsList studentId={studentId} />}
      </RequireStudent>
    </div>
  )
}

function MyHoldsList({ studentId }: { studentId: string }) {
  const holds = useMyHolds(studentId)
  const { refetch } = holds
  // Kono row er countdown 0 hole server er status o ani
  const onExpire = useCallback(() => void refetch(), [refetch])

  return (
    <>
      <p className="flex w-fit items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-xs text-muted-foreground shadow-xs" aria-live="polite">
        {holds.isFetching && <LoaderCircle className="size-3 animate-spin" aria-hidden />}
        Student ID <span className="font-mono break-all tabular-nums">{studentId}</span>
        {holds.dataUpdatedAt > 0 && <> · শেষ আপডেট {formatTime(holds.dataUpdatedAt)}</>}
      </p>

      {holds.isError && (
        <ErrorAlert
          error={holds.error}
          title={holds.data ? 'সর্বশেষ তথ্য আনা যাচ্ছে না, আগের তথ্য দেখানো হচ্ছে' : 'আপনার আবেদন আনা যায়নি'}
          onRetry={() => void refetch()}
          retrying={holds.isFetching}
        />
      )}

      {holds.isPending && (
        <div className="flex flex-col gap-3" aria-label="লোড হচ্ছে">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn("flex flex-col gap-3 rounded-md border bg-card p-4", MY_HOLDS_GRID)}>
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-20 rounded-sm" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-28 md:justify-self-end" />
            </div>
          ))}
        </div>
      )}

      {holds.data && holds.data.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="আপনার কোনো আবেদন নেই"
          description="ক্লাস তালিকা থেকে খালি সিট আছে এমন ক্লাসে আবেদন করুন।"
          action={
            <Button asChild>
              <Link to="/">ক্লাস তালিকায় যান</Link>
            </Button>
          }
        />
      )}

      {holds.data && holds.data.length > 0 && (
        <>
          <SummaryChips holds={holds.data} />
          {/* md+ e table: ekta border er vitore row, zebra; mobile e alada card */}
          <div className="flex flex-col gap-2.5 md:gap-0 md:overflow-clip md:rounded-lg md:border md:border-border md:bg-card md:shadow-sm md:[&>[data-slot=card]:nth-of-type(even)]:bg-slate-50/70">
          {/* md+ e table er column header (sudhu dekhanor jonno) */}
          <div className={cn("hidden border-b bg-slate-100/90 px-6 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase backdrop-blur md:sticky md:top-0 md:z-10", MY_HOLDS_GRID)} aria-hidden>
            <span>ক্লাস</span>
            <span>অবস্থা</span>
            <span>সময়</span>
            <span className="text-right">কাজ</span>
          </div>
          {holds.data.map((hold) => (
            <MyHoldRow key={hold.holdId} hold={hold} onExpire={onExpire} />
          ))}
          </div>
        </>
      )}
    </>
  )
}

const CHIP: { status: HoldStatus; label: string; className: string }[] = [
  { status: 'HELD', label: 'অপেক্ষমাণ', className: 'bg-warning-soft text-warning-foreground ring-warning/30' },
  { status: 'CONFIRMED', label: 'নিশ্চিত', className: 'bg-success-soft text-success-foreground ring-success/25' },
  { status: 'EXPIRED', label: 'মেয়াদোত্তীর্ণ', className: 'bg-danger-soft text-danger-foreground ring-danger/20' },
  { status: 'CANCELLED', label: 'বাতিল', className: 'bg-danger-soft text-danger-foreground ring-danger/20' },
]

// Status onujayi songkha, agei load hoya data theke. Label + songkha ekta text, jate duplicate text na hoy
function SummaryChips({ holds }: { holds: Hold[] }) {
  return (
    <div className="flex flex-wrap gap-2" aria-hidden>
      <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-white tabular-nums">{`মোট ${toBanglaDigits(holds.length)}`}</span>
      {CHIP.map((c) => (
        <span key={c.status} className={cn('rounded-md px-2.5 py-1 text-xs font-semibold tabular-nums ring-1', c.className)}>
          {`${c.label} ${toBanglaDigits(holds.filter((h) => h.status === c.status).length)}`}
        </span>
      ))}
    </div>
  )
}
