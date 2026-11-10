import { useEffect, useState } from 'react'

// Proti intervalMs por por bortoman somoy (ms) dey, jate render e Date.now() call korte na hoy
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  return now
}
