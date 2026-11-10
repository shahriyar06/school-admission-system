import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface CancelHoldDialogProps {
  className: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  pending: boolean
  disabled: boolean
}

// Bhul kore click e jate abedon bad na jay, tai age jiggesh kori
export function CancelHoldDialog({ className, open, onOpenChange, onConfirm, pending, disabled }: CancelHoldDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="text-destructive" disabled={disabled}>
          আবেদন বাতিল করুন
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>আপনি কি নিশ্চিত?</DialogTitle>
          <DialogDescription>
            "{className}" ক্লাস এর আবেদন বাতিল হবে আর সিটটি অন্যদের জন্য খুলে দেওয়া হবে। এটি আর ফেরানো যাবে না।
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              না, ফিরে যান
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending && <LoaderCircle className="animate-spin" aria-hidden />}
            {pending ? 'বাতিল হচ্ছে…' : 'হ্যাঁ, বাতিল করুন'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
