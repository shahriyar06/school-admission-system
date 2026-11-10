import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function NotFoundPage() {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>পাতাটি খুঁজে পাওয়া যায়নি</CardTitle>
        <CardDescription>আপনি যে ঠিকানায় এসেছেন সেটি নেই অথবা সরিয়ে ফেলা হয়েছে।</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button asChild>
          <Link to="/">ক্লাস তালিকায় ফিরে যান</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
