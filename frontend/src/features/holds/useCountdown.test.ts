import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatRemaining, useCountdown } from './useCountdown'

const START = new Date('2026-11-10T10:00:00.000Z')
const inMs = (ms: number) => new Date(START.getTime() + ms).toISOString()

// Hook er prothom tick setTimeout(0) e, tai 0ms egiye nite hoy
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('formatRemaining', () => {
  it.each([
    [0, '00:00'],
    [400, '00:01'], // ceil: 0.4s baki thakle "00:00" dekhabe na
    [59_000, '00:59'],
    [600_000, '10:00'],
    [3_600_000, '01:00:00'],
    [3_725_000, '01:02:05'],
    [-5000, '00:00'],
  ])('%i ms → %s', (ms, text) => {
    expect(formatRemaining(ms)).toBe(text)
  })
})

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(START)
  })
  afterEach(() => vi.useRealTimers())

  it('formats mm:ss and ticks down every second', async () => {
    const { result } = renderHook(() => useCountdown(inMs(125_000)))
    await advance(0)
    expect(result.current.formatted).toBe('02:05')
    expect(result.current.isExpired).toBe(false)

    await advance(1000)
    expect(result.current.formatted).toBe('02:04')
    await advance(4000)
    expect(result.current.formatted).toBe('02:00')
    expect(result.current.remainingMs).toBe(120_000)
  })

  it('isExpired becomes true at 0 and onExpire is called exactly once', async () => {
    const onExpire = vi.fn()
    const { result } = renderHook(() => useCountdown(inMs(3000), onExpire))
    await advance(2000)
    expect(result.current.isExpired).toBe(false)
    expect(onExpire).not.toHaveBeenCalled()

    await advance(1000)
    expect(result.current.isExpired).toBe(true)
    expect(result.current.formatted).toBe('00:00')
    expect(onExpire).toHaveBeenCalledTimes(1)

    // Aro onek somoy gelew ar call hobe na
    await advance(10_000)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('uses the latest onExpire callback without restarting the timer', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(({ cb }) => useCountdown(inMs(2000), cb), { initialProps: { cb: first } })
    await advance(1000)
    rerender({ cb: second })
    await advance(1000)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('already expired at mount: isExpired true but onExpire is NOT called (no refetch storm)', async () => {
    const onExpire = vi.fn()
    const { result } = renderHook(() => useCountdown(inMs(-5000), onExpire))
    await advance(3000)
    expect(result.current.isExpired).toBe(true)
    expect(onExpire).not.toHaveBeenCalled()
  })

  it('no expiresAt (hold not HELD): no timer, not expired', async () => {
    const { result } = renderHook(() => useCountdown(undefined))
    await advance(5000)
    expect(result.current.isExpired).toBe(false)
    expect(result.current.remainingMs).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cleans up its timers on unmount', async () => {
    const onExpire = vi.fn()
    const { unmount } = renderHook(() => useCountdown(inMs(5000), onExpire))
    await advance(1000)
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
    await advance(10_000)
    expect(onExpire).not.toHaveBeenCalled()
  })
})
