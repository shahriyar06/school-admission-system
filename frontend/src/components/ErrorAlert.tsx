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
    <Alert variant="destructive" className={cn('border-destructive/40', className)}>
      <CircleAlert aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-2">
        <p>{getErrorMessage(error)}</p>
        {onRetry && (
          <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
            <RotateCw className={cn(retrying && 'animate-spin')} aria-hidden />
            আবার চেষ্টা করুন
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
