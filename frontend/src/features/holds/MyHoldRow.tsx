import { ArrowRight, BookOpen, Clock } from 'lucide-react'
import { Link } from 'react-router'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toBanglaDigits } from '@/lib/digits'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Hold } from '@/types/api'
import { getEffectiveStatus } from './effective-status'
import { useCountdown } from './useCountdown'

// Ekoi markup: mobile e card, md+ e table er row er moto column (MyHoldsPage er header er sathe mil)
export const MY_HOLDS_GRID = 'md:grid md:grid-cols-[minmax(0,2fr)_9rem_minmax(0,1.8fr)_11rem] md:items-center md:gap-4'

// Protita row er nijer countdown, 0 hole reload chara EXPIRED dekhay
export function MyHoldRow({ hold, onExpire }: { hold: Hold; onExpire: () => void }) {
  const countdown = useCountdown(hold.status === 'HELD' ? hold.expiresAt : undefined, onExpire)
  const status = getEffectiveStatus(hold, countdown.nowMs)
  const held = status === 'HELD'

  return (
    <Card
      className={cn(
        'rounded-lg py-4 shadow-sm transition-colors md:rounded-none md:border-0 md:border-b md:border-border md:py-3.5 md:shadow-none md:hover:bg-accent/40',
        held && 'border-warning/30 md:border-l-4 md:border-l-warning',
      )}
    >
      <CardContent className={cn('flex flex-col gap-3', MY_HOLDS_GRID)}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="hidden size-9 shrink-0 items-center justify-center rounded-md bg-accent text-primary sm:flex" aria-hidden>
            <BookOpen className="size-4" />
          </span>
          <span className="font-medium wrap-break-word">{hold.className}</span>
        </div>

        <div>
          <StatusBadge status={status} />
        </div>

        <div className="flex flex-col items-start gap-1">
          {held ? (
            <span className="inline-flex items-center gap-1 rounded-sm bg-warning-soft px-2 py-1 text-xs font-medium text-warning-foreground ring-1 ring-warning/30">
              <Clock className="size-3.5" aria-hidden />
              মেয়াদ শেষ হতে বাকি:
              <span className="font-mono font-semibold tabular-nums">{toBanglaDigits(countdown.formatted)}</span>
            </span>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {held ? 'মেয়াদ শেষ হবে' : 'ফি দেওয়ার শেষ সময়'}: {formatDateTime(hold.expiresAt)}
          </span>
        </div>

        {/* Confirm / cancel er sob niyom ekjaygay (detail page e), tai ekhane sudhu link */}
        <Button asChild variant={held ? 'default' : 'ghost'} size="sm" className="group shrink-0 md:justify-self-end">
          <Link to={`/holds/${hold.holdId}`}>
            {held ? 'ভর্তি ফি দিতে যান' : 'বিস্তারিত'}
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
