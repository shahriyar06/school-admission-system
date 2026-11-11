import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  title: ReactNode
  subtitle?: ReactNode
  // Upore chhoto breadcrumb: "ড্যাশবোর্ড / <ei page>" (ekta text, jate duplicate text na hoy)
  breadcrumb?: string
  actions?: ReactNode
  className?: string
}

// Sob page er upore eki dhoroner header: breadcrumb + icon + title + subtitle + dan dike action
export function PageHeader({ icon: Icon, title, subtitle, breadcrumb, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="flex flex-col gap-2">
        {breadcrumb && <p className="text-xs font-medium tracking-wide text-muted-foreground">{`ড্যাশবোর্ড / ${breadcrumb}`}</p>}
        <div className="flex items-center gap-3.5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
            <Icon className="size-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
