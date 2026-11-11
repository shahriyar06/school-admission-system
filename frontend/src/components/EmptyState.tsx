import type { ComponentType, ReactNode } from 'react'
import { Card } from '@/components/ui/card'

interface EmptyStateProps {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}

// Kono data na thakle: majhkhane boro icon + message + (thakle) action
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="items-center gap-5 rounded-lg border-2 border-dashed border-border bg-card/60 px-6 py-16 text-center shadow-none">
      <div className="flex size-16 items-center justify-center rounded-md bg-accent text-primary">
        <Icon className="size-11" aria-hidden />
      </div>
      <div className="flex max-w-md flex-col gap-1.5">
        <div className="text-xl font-bold">{title}</div>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
      {action}
    </Card>
  )
}
