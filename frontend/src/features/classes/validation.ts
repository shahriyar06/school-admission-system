import { toAsciiDigits, toBanglaDigits } from '@/lib/digits'

// Backend er SchoolClass.Create er niyom gulo (MaxNameLength 200, MaxSeats 10000)
export const MAX_CLASS_NAME_LENGTH = 200
export const MIN_SEATS = 1
export const MAX_SEATS = 10_000

export function validateClassName(raw: string): string | null {
  const name = raw.trim()
  if (name.length === 0) return 'ক্লাস এর নাম দিন।'
  if (name.length > MAX_CLASS_NAME_LENGTH)
    return `নাম সর্বোচ্চ ${toBanglaDigits(MAX_CLASS_NAME_LENGTH)} অক্ষরের হতে পারে (এখন ${toBanglaDigits(name.length)})।`
  return null
}

// Bangla digit o cholbe ("৩০" → 30)
export function parseSeats(raw: string): number | null {
  const value = toAsciiDigits(raw.trim())
  return /^[0-9]+$/.test(value) ? Number(value) : null
}

export function validateSeats(raw: string): string | null {
  if (raw.trim().length === 0) return 'মোট সিট সংখ্যা দিন।'
  const seats = parseSeats(raw)
  if (seats === null) return 'সিট সংখ্যা একটি পূর্ণ সংখ্যা হতে হবে (যেমন ৪০)। দশমিক বা অক্ষর চলবে না।'
  if (seats < MIN_SEATS) return `কমপক্ষে ${toBanglaDigits(MIN_SEATS)}টি সিট দিতে হবে।`
  if (seats > MAX_SEATS) return `সর্বোচ্চ ${toBanglaDigits('10,000')}টি সিট দেওয়া যাবে।`
  return null
}
