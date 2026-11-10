import { Clock } from 'lucide-react'
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

// Protita row er nijer countdown, 0 hole reload chara EXPIRED dekhay
export function MyHoldRow({ hold, onExpire }: { hold: Hold; onExpire: () => void }) {
  const countdown = useCountdown(hold.status === 'HELD' ? hold.expiresAt : undefined, onExpire)
  const status = getEffectiveStatus(hold, countdown.nowMs)
  const held = status === 'HELD'

  return (
    <Card className={cn('py-4', held && 'border-amber-300')}>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium break-words">{hold.className}</span>
            <StatusBadge status={status} />
          </div>
          {held ? (
            <span className="flex items-center gap-1 text-sm text-amber-900">
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
        <Button asChild variant={held ? 'default' : 'outline'} size="sm" className="shrink-0">
          <Link to={`/holds/${hold.holdId}`}>{held ? 'ভর্তি ফি দিতে যান' : 'বিস্তারিত'}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
