import { useEffect, useState, type RefObject } from 'react'

export interface ScrollEdges {
  /** Слева есть прокрученное содержимое */
  start: boolean
  /** Справа есть ещё содержимое */
  end: boolean
}

/**
 * Есть ли что-то за краями горизонтально прокручиваемого контейнера.
 * Нужно, чтобы нарисовать затухание у края: без него обрезанная шкала или вкладки выглядят ошибкой,
 * а не намёком «потяни». Пересчитывается на прокрутке и при изменении размеров.
 */
export function useScrollFade(ref: RefObject<HTMLElement>): ScrollEdges {
  const [edges, setEdges] = useState<ScrollEdges>({ start: false, end: false })

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const update = () => {
      const start = element.scrollLeft > 1
      const end = element.scrollLeft + element.clientWidth < element.scrollWidth - 1
      setEdges((previous) => (previous.start === start && previous.end === end ? previous : { start, end }))
    }
    update()
    element.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => {
      element.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [ref])

  return edges
}
