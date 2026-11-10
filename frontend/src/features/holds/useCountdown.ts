import { useEffect, useRef, useState } from 'react'

const TICK_MS = 1000

export interface Countdown {
  // Ei muhurter browser time (ms), effective status hisab er jonno
  nowMs: number
  remainingMs: number
  isExpired: boolean
  // "mm:ss", 1 ghontar beshi hole "hh:mm:ss"
  formatted: string
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function formatRemaining(remainingMs: number): string {
  // Ceil, jate 0.4s baki thakle o "00:01" dekhay ar "00:00" mane asolei sesh
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

// expiresAt (ISO UTC) porjonto proti second e countdown. 0 te pouchale onExpire ekbar i call hoy
// expiresAt na dile (exp: hold HELD na) timer chole na
export function useCountdown(expiresAt: string | undefined, onExpire?: () => void): Countdown {
  const target = expiresAt ? Date.parse(expiresAt) : Number.NaN
  const [nowMs, setNowMs] = useState(() => Date.now())

  // Notun callback ele effect abar chalate hobe na, tai ref e rakhi
  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    if (Number.isNaN(target)) return
    // Mount er somoy agei expired hole onExpire dakbo na, sudhu "cholte cholte 0 hole" dakbo
    const runningAtStart = Date.now() < target
    let intervalId: number | undefined

    const tick = () => {
      const now = Date.now()
      setNowMs(now)
      if (now >= target) {
        window.clearInterval(intervalId)
        if (runningAtStart) onExpireRef.current?.()
      }
    }

    // Notun target ele prothom tick sathe sathe (timer callback e, effect e sorasori setState na)
    const firstId = window.setTimeout(tick, 0)
    if (runningAtStart) intervalId = window.setInterval(tick, TICK_MS)
    return () => {
      window.clearTimeout(firstId)
      window.clearInterval(intervalId)
    }
  }, [target])

  const remainingMs = Number.isNaN(target) ? 0 : Math.max(0, target - nowMs)
  return {
    nowMs,
    remainingMs,
    isExpired: !Number.isNaN(target) && remainingMs <= 0,
    formatted: formatRemaining(remainingMs),
  }
}
