import { BadgeCheck, Check, CreditCard, FileText, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HoldStatus } from '@/types/api'

type StepState = 'done' | 'current' | 'failed' | 'upcoming'

const STEPS: { label: string; icon: LucideIcon }[] = [
  { label: 'আবেদন', icon: FileText },
  { label: 'ফি জমা', icon: CreditCard },
  { label: 'ভর্তি নিশ্চিত', icon: BadgeCheck },
]

// Effective status theke protita dhap er obostha (sudhu dekhano)
function statesFor(status: HoldStatus): StepState[] {
  if (status === 'CONFIRMED') return ['done', 'done', 'done']
  if (status === 'HELD') return ['done', 'current', 'upcoming']
  return ['done', 'failed', 'upcoming']
}

const circle: Record<StepState, string> = {
  done: 'bg-success text-white shadow-md ',
  current: 'bg-primary text-white shadow-sm  ring-4 ring-primary/15',
  failed: 'bg-danger text-white shadow-md ',
  upcoming: 'bg-white text-muted-foreground ring-2 ring-slate-200',
}

export function HoldSteps({ status }: { status: HoldStatus }) {
  const states = statesFor(status)
  return (
    <ol aria-label="আবেদনের ধাপ" className="flex items-start rounded-lg border border-border bg-card px-4 py-5 shadow-sm sm:px-8">
      {STEPS.map(({ label, icon: Icon }, i) => {
        const state = states[i]
        const StateIcon = state === 'done' && i < 2 ? Check : state === 'failed' ? X : Icon
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center gap-2 text-center">
            {i > 0 && (
              <span
                className={cn(
                  'absolute top-5 right-1/2 h-1 w-full -translate-y-1/2 rounded-sm',
                  state === 'upcoming' ? 'bg-slate-300' : state === 'failed' ? 'bg-danger' : 'bg-success',
                )}
                aria-hidden
              />
            )}
            <span className={cn('relative z-10 flex size-9 items-center justify-center rounded-sm transition-colors duration-150', circle[state])} aria-hidden>
              <StateIcon className="size-5" />
            </span>
            <span className={cn('text-xs sm:text-sm', state === 'upcoming' ? 'text-muted-foreground' : 'font-semibold text-foreground', state === 'failed' && 'text-danger-foreground')}>
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
