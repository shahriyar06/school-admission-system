import { BookOpen, LoaderCircle, Sun, SunMedium } from 'lucide-react'
import { Link } from 'react-router'
import { SeatBar } from '@/components/SeatBar'
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

// Nam e "Morning" / "Day" thakle shift chip (sudhu dekhano)
function shiftOf(name: string) {
  if (/morning/i.test(name)) return { label: 'সকাল শিফট', icon: SunMedium, className: 'bg-accent text-primary ring-primary/20' }
  if (/\bday\b/i.test(name)) return { label: 'দিবা শিফট', icon: Sun, className: 'bg-warning-soft text-warning-foreground ring-warning/30' }
  return null
}

// Legend: label er thik porer element e songkha (test er statValue eta dhore)
function Legend({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('size-2 shrink-0 rounded-full', dot)} aria-hidden />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground tabular-nums">{formatNumber(value)}</span>
    </div>
  )
}

export function ClassCard({ item, activeHold, hasStudentId, applying, busy, onApply }: ClassCardProps) {
  const full = item.availableSeats <= 0
  const shift = shiftOf(item.name)
  const ShiftIcon = shift?.icon

  // Keno button bondho, seta button er niche lekha thakbe
  let reason: string | null = null
  if (!activeHold) {
    if (!hasStudentId) reason = 'আবেদন করতে উপরে Student ID দিন।'
    else if (full) reason = 'এই ক্লাস এ এখন কোনো সিট খালি নেই।'
  }

  return (
    <Card
      className={cn(
        'relative gap-0 overflow-hidden rounded-lg border-border py-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        full && !activeHold && 'bg-slate-50/80',
      )}
    >
      <div className={cn('h-1.5', full ? 'bg-danger' : 'bg-success')} aria-hidden />

      {full && (
        <Badge variant="destructive" className="absolute top-4 right-0 rounded-l-sm rounded-r-none px-2.5">
          সিট নেই
        </Badge>
      )}

      <CardHeader className="gap-2 px-5 pt-5">
        <div className={cn('flex items-start gap-3', full && 'pr-20')}>
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-md',
              full ? 'bg-slate-300 text-muted-foreground' : 'bg-accent text-primary',
            )}
          >
            <BookOpen className="size-5" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <CardTitle className={cn('text-base leading-snug wrap-break-word', full && 'text-muted-foreground')}>{item.name}</CardTitle>
            {shift && ShiftIcon && (
              <span className={cn('inline-flex w-fit items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-medium ring-1', shift.className)}>
                <ShiftIcon className="size-3" aria-hidden />
                {shift.label}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-5 pt-4 pb-5">
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className={cn('text-4xl font-extrabold tracking-tight tabular-nums', full ? 'text-danger-foreground' : 'text-success-foreground')} aria-hidden>
              {formatNumber(item.availableSeats)}
            </span>
            <span className="text-sm text-muted-foreground">আসন ফাঁকা</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs">
            <span className="text-muted-foreground">মোট</span>
            <span className="font-semibold tabular-nums">{formatNumber(item.totalSeats)}</span>
          </div>
        </div>

        <SeatBar total={item.totalSeats} held={item.heldSeats} confirmed={item.confirmedSeats} />

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <Legend dot="bg-success" label="নিশ্চিত" value={item.confirmedSeats} />
          <Legend dot="bg-warning" label="অপেক্ষমাণ" value={item.heldSeats} />
          <Legend dot="bg-slate-300" label="খালি" value={item.availableSeats} />
        </div>
      </CardContent>

      <CardFooter className="mt-auto flex flex-col items-stretch gap-1.5 border-t bg-slate-50/70 px-5 py-4">
        {activeHold ? (
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary" className="h-10 flex-1 font-semibold">
              <Link to={`/holds/${activeHold.hold.holdId}`}>আপনার আবেদন দেখুন</Link>
            </Button>
            <StatusBadge status={activeHold.status} />
          </div>
        ) : (
          <Button
            type="button"
            className="h-10 w-full font-semibold shadow-sm "
            onClick={() => onApply(item.id)}
            disabled={!hasStudentId || full || busy}
            aria-busy={applying}
          >
            {applying && <LoaderCircle className="animate-spin" aria-hidden />}
            {applying ? 'আবেদন পাঠানো হচ্ছে…' : 'আবেদন করুন'}
          </Button>
        )}
        {reason && <p className="text-center text-xs text-muted-foreground">{reason}</p>}
      </CardFooter>
    </Card>
  )
}
