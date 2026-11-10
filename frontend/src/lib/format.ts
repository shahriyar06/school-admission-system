import { toBanglaDigits } from '@/lib/digits'

// School Bangladesh e, tai somoy sob somoy Bangladesh time e dekhai (browser er timezone jai hok)
const TIME_ZONE = 'Asia/Dhaka'

const dateTimeFormat = new Intl.DateTimeFormat('bn-BD', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})

const timeFormat = new Intl.DateTimeFormat('bn-BD', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})

// ISO UTC string ba epoch ms → "১০ নভেম্বর, ২০২৬ ৮:৪২:৫৬ PM" er moto
export function formatDateTime(value: string | number): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormat.format(date)
}

export function formatTime(value: string | number): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : timeFormat.format(date)
}

export function formatNumber(value: number): string {
  return toBanglaDigits(value)
}
