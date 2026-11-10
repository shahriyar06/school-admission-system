import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { HoldStatus } from '@/types/api'

const config: Record<HoldStatus, { label: string; className: string }> = {
  HELD: { label: 'অপেক্ষমাণ', className: 'border-amber-300 bg-amber-100 text-amber-900' },
  CONFIRMED: { label: 'নিশ্চিত', className: 'border-emerald-300 bg-emerald-100 text-emerald-900' },
  EXPIRED: { label: 'মেয়াদোত্তীর্ণ', className: 'border-zinc-300 bg-zinc-100 text-zinc-700' },
  CANCELLED: { label: 'বাতিল', className: 'border-red-300 bg-red-100 text-red-900' },
}

export function StatusBadge({ status, className }: { status: HoldStatus; className?: string }) {
  // Backend notun status pathale o crash korbe na
  const item = config[status] ?? { label: status, className: '' }
  return (
    <Badge variant="outline" className={cn(item.className, className)} title={status}>
      {item.label}
    </Badge>
  )
}
