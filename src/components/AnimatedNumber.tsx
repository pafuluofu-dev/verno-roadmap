import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  format?: (value: number) => string
}

/** Число, доезжающее до значения за ~0.6 с; с prefers-reduced-motion — сразу */
export function AnimatedNumber({ value, format }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0)
  /* Стартуем от того, что сейчас на экране, а не от прошлой цели: значение может смениться
     посреди анимации, а в dev StrictMode прогоняет эффект дважды — запись цели до проверки
     заставляла второй заход считать, что значение не менялось, и анимация не запускалась. */
  const shown = useRef(0)

  useEffect(() => {
    const from = shown.current
    if (from === value) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shown.current = value
      setDisplay(value)
      return
    }
    const startedAt = performance.now()
    const duration = 600
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      shown.current = from + (value - from) * eased
      setDisplay(shown.current)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  const rounded = Math.round(display)
  return <>{format ? format(rounded) : String(rounded)}</>
}
