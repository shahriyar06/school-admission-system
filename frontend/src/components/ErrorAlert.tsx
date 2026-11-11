import { CircleAlert, RotateCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

interface ErrorAlertProps {
  error: unknown
  title?: string
  onRetry?: () => void
  // Retry cholar somoy button disable
  retrying?: boolean
  className?: string
}

// Je kono API error user er bujhar moto Bangla te dekhay, console e na
export function ErrorAlert({ error, title = 'সমস্যা হয়েছে', onRetry, retrying, className }: ErrorAlertProps) {
  return (
    <Alert
      variant="destructive"
      className={cn(
        'flex items-start gap-4 rounded-lg border-danger/25 bg-danger-soft px-5 py-4 shadow-sm',
        className,
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-danger/10 text-danger-foreground" aria-hidden>
        <CircleAlert className="size-6" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <AlertTitle className="text-base font-semibold text-danger-foreground">{title}</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3 text-danger-foreground">
          <p>{getErrorMessage(error)}</p>
          {onRetry && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={retrying} className="border-danger/25 bg-white text-danger-foreground hover:bg-danger-soft">
              <RotateCw className={cn(retrying && 'animate-spin')} aria-hidden />
              আবার চেষ্টা করুন
            </Button>
          )}
        </AlertDescription>
      </div>
    </Alert>
  )
}
