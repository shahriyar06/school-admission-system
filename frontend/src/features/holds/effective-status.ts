import type { Hold, HoldStatus } from '@/types/api'

// Server o eki kaj kore: HELD thakleo somoy par hoye gele asole EXPIRED।
// Client e nijei hisab korle countdown 0 hoyar sathe sathe EXPIRED dekhano jay, reload chara
export function getEffectiveStatus(hold: Pick<Hold, 'status' | 'expiresAt'>, nowMs: number): HoldStatus {
  if (hold.status === 'HELD' && Date.parse(hold.expiresAt) <= nowMs) return 'EXPIRED'
  return hold.status
}

// Seat dhore rakhche kina (HELD ar meyad ache, ba CONFIRMED)
export function isActiveHold(hold: Pick<Hold, 'status' | 'expiresAt'>, nowMs: number): boolean {
  const status = getEffectiveStatus(hold, nowMs)
  return status === 'HELD' || status === 'CONFIRMED'
}
