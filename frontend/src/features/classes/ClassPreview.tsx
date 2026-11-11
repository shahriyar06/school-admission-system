import { BookOpen, Eye } from 'lucide-react'
import { SeatBar } from '@/components/SeatBar'
import { formatNumber } from '@/lib/format'

// Form e ja likhche, list e card ta dekhte kemon hobe (sudhu dekhano, aria-hidden, kono button na)
export function ClassPreview({ name, seats }: { name: string; seats: number | null }) {
  const total = seats && seats > 0 ? seats : 0

  return (
    <div className="flex flex-col gap-3 lg:sticky lg:top-10" aria-hidden="true">
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Eye className="size-3.5" />
        Preview
      </p>
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-md">
        <div className="h-1.5 bg-success" />
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
              <BookOpen className="size-5" />
            </span>
            <p className={name ? 'font-semibold wrap-break-word' : 'font-semibold text-muted-foreground/60 italic'}>
              {name || 'ক্লাসের নাম এখানে দেখা যাবে'}
            </p>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold tracking-tight text-success-foreground tabular-nums">{formatNumber(total)}</span>
            <span className="text-sm text-muted-foreground">আসন ফাঁকা</span>
          </div>
          <SeatBar total={Math.max(total, 1)} held={0} confirmed={0} />
          <div className="h-10 rounded-lg bg-primary/90 text-center text-sm leading-10 font-semibold text-primary-foreground">
            আবেদনের বোতাম
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">তৈরি হওয়ার পর ক্লাস তালিকায় কার্ডটি এভাবে দেখাবে।</p>
    </div>
  )
}
