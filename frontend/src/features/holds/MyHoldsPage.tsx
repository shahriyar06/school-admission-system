import { useCallback } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Link } from 'react-router'
import { ErrorAlert } from '@/components/ErrorAlert'
import { RequireStudent } from '@/components/RequireStudent'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTime } from '@/lib/format'
import { useMyHolds } from './hooks'
import { MyHoldRow } from './MyHoldRow'

export function MyHoldsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">আমার আবেদন</h1>
        <p className="text-sm text-muted-foreground">
          এই Student ID দিয়ে করা সব আবেদন (নতুন থেকে পুরনো)। Page reload বা browser বন্ধ করলেও এখানে পাবেন।
        </p>
      </div>
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
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
        {holds.isFetching && <LoaderCircle className="size-3 animate-spin" aria-hidden />}
        Student ID <span className="font-mono">{studentId}</span>
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
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {holds.data && holds.data.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>আপনার কোনো আবেদন নেই</CardTitle>
            <CardDescription>ক্লাস তালিকা থেকে খালি সিট আছে এমন ক্লাসে আবেদন করুন।</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link to="/">ক্লাস তালিকায় যান</Link>
            </Button>
          </CardFooter>
        </Card>
      )}

      {holds.data && holds.data.length > 0 && (
        <div className="flex flex-col gap-3">
          {holds.data.map((hold) => (
            <MyHoldRow key={hold.holdId} hold={hold} onExpire={onExpire} />
          ))}
        </div>
      )}
    </>
  )
}
