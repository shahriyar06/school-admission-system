import { describe, expect, it } from 'vitest'
import { getEffectiveStatus, isActiveHold } from './effective-status'

const NOW = Date.parse('2026-11-10T10:00:00.000Z')
const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString()

describe('getEffectiveStatus (client-side expiry, same rule as the server)', () => {
  it('HELD past expiresAt → EXPIRED', () => {
    expect(getEffectiveStatus({ status: 'HELD', expiresAt: at(-1) }, NOW)).toBe('EXPIRED')
  })

  it('HELD exactly at expiresAt → EXPIRED (expiry is inclusive like the backend)', () => {
    expect(getEffectiveStatus({ status: 'HELD', expiresAt: at(0) }, NOW)).toBe('EXPIRED')
  })

  it('HELD before expiresAt → HELD', () => {
    expect(getEffectiveStatus({ status: 'HELD', expiresAt: at(1000) }, NOW)).toBe('HELD')
  })

  it.each(['CONFIRMED', 'CANCELLED', 'EXPIRED'] as const)('%s is unchanged even after expiresAt', (status) => {
    expect(getEffectiveStatus({ status, expiresAt: at(-60_000) }, NOW)).toBe(status)
  })

  it('isActiveHold: HELD (not expired) and CONFIRMED hold a seat; others do not', () => {
    expect(isActiveHold({ status: 'HELD', expiresAt: at(1000) }, NOW)).toBe(true)
    expect(isActiveHold({ status: 'CONFIRMED', expiresAt: at(-1000) }, NOW)).toBe(true)
    expect(isActiveHold({ status: 'HELD', expiresAt: at(-1) }, NOW)).toBe(false)
    expect(isActiveHold({ status: 'CANCELLED', expiresAt: at(1000) }, NOW)).toBe(false)
  })
})
