const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯'

// Bangla keyboard e "২০১৫..." likhle backend er jonno "2015..." e bodle dei
export function toAsciiDigits(value: string): string {
  return value.replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d)))
}

// UI te songkha Bangla te dekhanor jonno, exp: 17 → "১৭"
export function toBanglaDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => BANGLA_DIGITS[Number(d)])
}
