import { useEffect, useRef, useState } from 'react'

/** Devolve true por instantes sempre que `value` muda, para disparar uma animação. */
export function usePulse(value: unknown, durationMs = 350): boolean {
  const [pulsing, setPulsing] = useState(false)
  const prev = useRef(value)

  useEffect(() => {
    if (prev.current === value) return
    prev.current = value
    setPulsing(true)
    const timeout = setTimeout(() => setPulsing(false), durationMs)
    return () => clearTimeout(timeout)
  }, [value, durationMs])

  return pulsing
}
