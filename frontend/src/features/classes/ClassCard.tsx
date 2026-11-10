import { LoaderCircle } from 'lucide-react'
import { Link } from 'react-router'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ClassSummary, Hold, HoldStatus } from '@/types/api'

interface ClassCardProps {
  item: ClassSummary
  // Ei student er ei class e cholti (HELD/CONFIRMED) abedon, thakle "আবেদন দেখুন"
  activeHold?: { hold: Hold; status: HoldStatus }
  hasStudentId: boolean
  // Ei class er jonno abedon jacche
  applying: boolean
  // Onno kono class er abedon jacche, tokhon sob button bondho
  busy: boolean
  onApply: (classId: string) => void
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className={cn('rounded-md border bg-background px-2 py-1.5 text-center', className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{formatNumber(value)}</div>
    </div>
  )
}

export function ClassCard({ item, activeHold, hasStudentId, applying, busy, onApply }: ClassCardProps) {
  const full = item.availableSeats <= 0

  // Keno button bondho, seta button er niche lekha thakbe
  let reason: string | null = null
  if (!activeHold) {
    if (!hasStudentId) reason = 'আবেদন করতে উপরে Student ID দিন।'
    else if (full) reason = 'এই ক্লাস এ এখন কোনো সিট খালি নেই।'
  }

  return (
    <Card className={cn('flex flex-col', full && !activeHold && 'border-red-200')}>
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="leading-snug break-words">{item.name}</CardTitle>
          {full && <Badge variant="destructive">সিট নেই</Badge>}
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="মোট" value={item.totalSeats} />
          <Stat label="অপেক্ষমাণ" value={item.heldSeats} className="border-amber-200 bg-amber-50" />
          <Stat label="নিশ্চিত" value={item.confirmedSeats} className="border-emerald-200 bg-emerald-50" />
          <Stat
            label="খালি"
            value={item.availableSeats}
            className={full ? 'border-red-200 bg-red-50 text-red-900' : 'border-sky-200 bg-sky-50'}
          />
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-stretch gap-1.5">
        {activeHold ? (
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary" className="flex-1">
              <Link to={`/holds/${activeHold.hold.holdId}`}>আপনার আবেদন দেখুন</Link>
            </Button>
            <StatusBadge status={activeHold.status} />
          </div>
        ) : (
          <Button
            type="button"
            onClick={() => onApply(item.id)}
            disabled={!hasStudentId || full || busy}
            aria-busy={applying}
          >
            {applying && <LoaderCircle className="animate-spin" aria-hidden />}
            {applying ? 'আবেদন পাঠানো হচ্ছে…' : 'আবেদন করুন'}
          </Button>
        )}
        {reason && <p className="text-xs text-muted-foreground">{reason}</p>}
      </CardFooter>
    </Card>
  )
}
