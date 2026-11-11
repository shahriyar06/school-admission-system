import { MapPinOff } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function NotFoundPage() {
  return (
    <Card className="mx-auto mt-6 max-w-lg rounded-lg py-10 text-center shadow-sm ">
      <CardHeader className="items-center">
        <div className="relative mx-auto mb-4 flex size-16 items-center justify-center rounded-md bg-accent text-primary" aria-hidden>
          <MapPinOff className="size-11" />
          <span className="absolute -right-1 -bottom-1 rounded-sm border bg-card px-1.5 py-0.5 font-mono text-xs font-bold text-primary tabular-nums">৪০৪</span>
        </div>
        <CardTitle>পাতাটি খুঁজে পাওয়া যায়নি</CardTitle>
        <CardDescription>আপনি যে ঠিকানায় এসেছেন সেটি নেই অথবা সরিয়ে ফেলা হয়েছে।</CardDescription>
      </CardHeader>
      <CardFooter className="justify-center">
        <Button asChild>
          <Link to="/">ক্লাস তালিকায় ফিরে যান</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
