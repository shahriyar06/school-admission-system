import { cn } from '@/lib/utils'

interface SeatBarProps {
  total: number
  held: number
  confirmed: number
  className?: string
}

// Sudhu dekhanor jonno: nishchit (emerald) / opekkhoman (amber) / khali (slate) er onupat
export function SeatBar({ total, held, confirmed, className }: SeatBarProps) {
  const safeTotal = Math.max(total, 1)
  const confirmedPct = Math.min(100, (confirmed / safeTotal) * 100)
  const heldPct = Math.min(100 - confirmedPct, (held / safeTotal) * 100)

  return (
    <div className={cn('flex h-2.5 w-full min-w-0 gap-0.5 overflow-hidden rounded-sm bg-slate-300', className)} aria-hidden>
      {confirmedPct > 0 && <div className="h-full bg-success transition-[width] duration-700" style={{ width: `${confirmedPct}%` }} />}
      {heldPct > 0 && <div className="h-full bg-warning transition-[width] duration-700" style={{ width: `${heldPct}%` }} />}
    </div>
  )
}
