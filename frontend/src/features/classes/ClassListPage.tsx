import { useMemo } from 'react'
import { LoaderCircle, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ErrorAlert } from '@/components/ErrorAlert'
import { StudentIdRequiredAlert } from '@/components/StudentIdRequiredAlert'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getEffectiveStatus } from '@/features/holds/effective-status'
import { useCreateHold, useMyHolds } from '@/features/holds/hooks'
import { useStudent } from '@/features/student/use-student'
import { getErrorMessage } from '@/lib/api-error'
import { formatTime } from '@/lib/format'
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">ক্লাস তালিকা</h1>
          <p className="text-sm text-muted-foreground">
            খালি সিট আছে এমন ক্লাসে আবেদন করুন। আবেদনের পর নির্দিষ্ট সময়ের মধ্যে ভর্তি ফি দিতে হবে।
          </p>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
          {classes.isFetching && <LoaderCircle className="size-3 animate-spin" aria-hidden />}
          প্রতি ৩ সেকেন্ডে আপডেট হয়
          {classes.dataUpdatedAt > 0 && <> · শেষ আপডেট {formatTime(classes.dataUpdatedAt)}</>}
        </p>
      </div>

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

      {classes.isPending && <ClassListSkeleton />}

      {classes.data && classes.data.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>এখনো কোনো ক্লাস তৈরি হয়নি</CardTitle>
            <CardDescription>স্কুল কর্তৃপক্ষ ক্লাস তৈরি করলে এখানে দেখা যাবে।</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link to="/admin/classes/new">
                <Plus aria-hidden />
                ক্লাস তৈরি করুন (Admin)
              </Link>
            </Button>
          </CardFooter>
        </Card>
      )}

      {classes.data && classes.data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
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

function ClassListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-label="লোড হচ্ছে">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-2/3" />
          </CardHeader>
          <div className="grid grid-cols-4 gap-2 px-6">
            {[0, 1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-12" />
            ))}
          </div>
          <CardFooter>
            <Skeleton className="h-9 w-full" />
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
