import { useMemo } from 'react'
import { Armchair, BookOpen, GraduationCap, Inbox, Layers, LoaderCircle, Plus, School, Sparkles, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { EmptyState } from '@/components/EmptyState'
import { ErrorAlert } from '@/components/ErrorAlert'
import { PageHeader } from '@/components/PageHeader'
import { StudentIdRequiredAlert } from '@/components/StudentIdRequiredAlert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getEffectiveStatus } from '@/features/holds/effective-status'
import { useCreateHold, useMyHolds } from '@/features/holds/hooks'
import { useStudent } from '@/features/student/use-student'
import { getErrorMessage } from '@/lib/api-error'
import { formatNumber, formatTime } from '@/lib/format'
import { useNow } from '@/lib/use-now'
import type { Hold, HoldStatus } from '@/types/api'
import { ClassCard } from './ClassCard'
import { useClasses } from './hooks'

export function ClassListPage() {
  const navigate = useNavigate()
  const { studentId } = useStudent()
  const classes = useClasses()
  const myHolds = useMyHolds(studentId)
  const createHold = useCreateHold()
  // Proti second e, jate HELD hold expire hole "আবেদন দেখুন" soriye "আবেদন করুন" ase
  const now = useNow(1000)

  // classId → ei student er cholti abedon (HELD + meyad ache, ba CONFIRMED)
  const activeByClass = useMemo(() => {
    const map = new Map<string, { hold: Hold; status: HoldStatus }>()
    for (const hold of myHolds.data ?? []) {
      const status = getEffectiveStatus(hold, now)
      if ((status === 'HELD' || status === 'CONFIRMED') && !map.has(hold.classId)) map.set(hold.classId, { hold, status })
    }
    return map
  }, [myHolds.data, now])

  const applyingClassId = createHold.isPending ? createHold.variables?.classId : undefined

  const onApply = (classId: string) => {
    if (!studentId || createHold.isPending) return
    createHold.mutate(
      { classId, studentId },
      {
        onSuccess: (hold) => {
          toast.success('আবেদন সফল হয়েছে, আপনার জন্য একটি সিট রাখা হয়েছে।', {
            description: 'মেয়াদ শেষ হওয়ার আগে ভর্তি ফি দিন।',
          })
          navigate(`/holds/${hold.holdId}`)
        },
        onError: (error) => {
          toast.error(getErrorMessage(error))
          void classes.refetch()
        },
      },
    )
  }

  // Sudhu agei load hoya data theke hisab, notun request na
  const totals = (classes.data ?? []).reduce(
    (acc, c) => ({ seats: acc.seats + c.totalSeats, available: acc.available + c.availableSeats }),
    { seats: 0, available: 0 },
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={School}
        breadcrumb="ক্লাস তালিকা"
        title="ক্লাস তালিকা"
        subtitle="খালি সিট আছে এমন ক্লাসে আবেদন করুন। আবেদনের পর নির্দিষ্ট সময়ের মধ্যে ভর্তি ফি দিতে হবে।"
      />

      {/* Hero banner: sudhu dekhanor jonno, KPI agei load hoya data theke */}
      <section className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-900 to-blue-700 p-6 text-white shadow-sm sm:p-8">
        
        
        <div className="pointer-events-none absolute top-6 right-8 hidden items-end gap-3 opacity-90 md:flex" aria-hidden>
          <span className="flex size-14 rotate-[-8deg] items-center justify-center rounded-md bg-white/10 ring-1 ring-white/15 backdrop-blur">
            <BookOpen className="size-7" />
          </span>
          <span className="flex size-20 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/15 backdrop-blur">
            <GraduationCap className="size-10" />
          </span>
          <span className="flex size-12 rotate-[10deg] items-center justify-center rounded-md bg-white/10 ring-1 ring-white/15 backdrop-blur">
            <Armchair className="size-6" />
          </span>
        </div>

        <div className="relative flex flex-col gap-6">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium ring-1 ring-white/15">
              <Sparkles className="size-3.5" aria-hidden />
              ভর্তি চলছে
            </p>
            <p className="mt-3 text-2xl font-bold leading-snug sm:text-3xl">আগে আবেদন করলে আগে পাবে — সিট সীমিত</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <HeroStat icon={Layers} label="মোট ক্লাস" value={classes.data ? formatNumber(classes.data.length) : '—'} />
            <HeroStat icon={Users} label="মোট সিট" value={classes.data ? formatNumber(totals.seats) : '—'} />
            <HeroStat icon={Armchair} label="এখন খালি সিট" value={classes.data ? formatNumber(totals.available) : '—'} />
          </div>
        </div>
      </section>

      {!studentId && <StudentIdRequiredAlert />}

      {/* Server bondho holeo shesh paowa data dekhate thaki, upore error */}
      {classes.isError && (
        <ErrorAlert
          error={classes.error}
          title={classes.data ? 'সর্বশেষ তথ্য আনা যাচ্ছে না, আগের তথ্য দেখানো হচ্ছে' : 'ক্লাস তালিকা আনা যায়নি'}
          onRetry={() => void classes.refetch()}
          retrying={classes.isFetching}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight">সকল ক্লাস</h2>
        <p
          className="flex items-center gap-2 rounded-md border border-success/25 bg-success-soft px-2.5 py-1 text-xs text-success-foreground shadow-xs"
          aria-live="polite"
        >
          {classes.isFetching ? (
            <LoaderCircle className="size-3 animate-spin" aria-hidden />
          ) : (
            <span className="relative flex size-2" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
          )}
          <span className="font-bold tracking-wider uppercase" aria-hidden>
            Live
          </span>
          প্রতি ৩ সেকেন্ডে আপডেট হয়
          {classes.dataUpdatedAt > 0 && <> · শেষ আপডেট {formatTime(classes.dataUpdatedAt)}</>}
        </p>
      </div>

      {classes.isPending && <ClassListSkeleton />}

      {classes.data && classes.data.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="এখনো কোনো ক্লাস তৈরি হয়নি"
          description="স্কুল কর্তৃপক্ষ ক্লাস তৈরি করলে এখানে দেখা যাবে।"
          action={
            <Button asChild size="lg">
              <Link to="/admin/classes/new">
                <Plus aria-hidden />
                ক্লাস তৈরি করুন (Admin)
              </Link>
            </Button>
          }
        />
      )}

      {classes.data && classes.data.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {classes.data.map((item) => (
            <ClassCard
              key={item.id}
              item={item}
              activeHold={activeByClass.get(item.id)}
              hasStudentId={!!studentId}
              applying={applyingClassId === item.id}
              busy={createHold.isPending}
              onApply={onApply}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Hero er glass KPI tile
function HeroStat({ icon: Icon, label, value }: { icon: typeof Layers; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-white/15 bg-white/10 p-4">
      <span className="flex size-11 items-center justify-center rounded-md bg-white/10" aria-hidden>
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xs text-white/75">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  )
}

// Asol card er moto shape, jate load hole layout na lafay
function ClassListSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="লোড হচ্ছে">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="gap-0 overflow-hidden rounded-lg py-0 shadow-sm">
          <Skeleton className="h-1.5 rounded-none" />
          <CardHeader className="flex-row items-center gap-3 px-5 pt-5">
            <Skeleton className="size-10 rounded-md" />
            <Skeleton className="h-5 w-2/3" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-5 pt-4 pb-5">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-2.5 w-full rounded-sm" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
          <CardFooter className="border-t px-5 py-4">
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
