import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  label: string
  value: ReactNode
  tone?: 'primary' | 'success' | 'warning'
}

const tones = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success-soft text-success-foreground',
  warning: 'bg-warning-soft text-warning-foreground',
}

// Chhoto KPI tile (exp: মোট ক্লাস)
export function StatCard({ icon: Icon, label, value, tone = 'primary' }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card p-4 shadow-xs">
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-md', tones[tone])}>
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  )
}
