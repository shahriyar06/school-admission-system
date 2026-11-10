import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Feature screen banano porjonto ei card dekhabe
export function PlaceholderPage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>শীঘ্রই আসছে</CardDescription>
      </CardHeader>
      {children && <CardContent className="text-sm text-muted-foreground">{children}</CardContent>}
    </Card>
  )
}
