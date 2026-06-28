import { useEffect, useRef, useState } from 'react'

/**
 * Returns [ref, visible] — visible becomes true once the element enters the viewport.
 */
export function useInViewOnce(options = {}) {
  const { threshold = 0.12, rootMargin = '0px 0px -8% 0px' } = options
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || visible) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [visible, threshold, rootMargin])

  return [ref, visible]
}
