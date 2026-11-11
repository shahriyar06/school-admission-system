import { Ban, CircleCheck, Clock, Hourglass, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { HoldStatus } from '@/types/api'

const config: Record<HoldStatus, { label: string; className: string; dot: string; icon: LucideIcon }> = {
  HELD: {
    label: 'অপেক্ষমাণ',
    className: 'border-warning/30 bg-warning-soft text-warning-foreground',
    dot: 'bg-warning animate-pulse',
    icon: Clock,
  },
  CONFIRMED: {
    label: 'নিশ্চিত',
    className: 'border-success/25 bg-success-soft text-success-foreground',
    dot: 'bg-success',
    icon: CircleCheck,
  },
  EXPIRED: {
    label: 'মেয়াদোত্তীর্ণ',
    className: 'border-danger/25 bg-danger-soft text-danger-foreground',
    dot: 'bg-danger',
    icon: Hourglass,
  },
  CANCELLED: {
    label: 'বাতিল',
    className: 'border-danger/25 bg-danger-soft text-danger-foreground',
    dot: 'bg-danger',
    icon: Ban,
  },
}

export function StatusBadge({ status, className }: { status: HoldStatus; className?: string }) {
  // Backend notun status pathale o crash korbe na
  const item = config[status] ?? { label: status, className: '', dot: 'bg-slate-400', icon: Clock }
  const Icon = item.icon
  return (
    <Badge variant="outline" className={cn('h-6 gap-1.5 rounded-sm px-2 font-semibold', item.className, className)} title={status}>
      <span className={cn('size-1.5 rounded-full', item.dot)} aria-hidden />
      <Icon className="size-3.5" aria-hidden />
      {item.label}
    </Badge>
  )
}
