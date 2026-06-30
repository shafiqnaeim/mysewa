import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

export default function CountUpStat({ end, suffix = '', decimals = 0, duration = 1800, label, displayValue }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!inView || displayValue != null) return undefined
    const start = performance.now()
    let frame

    function tick(now) {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - progress) ** 3
      const next = end * eased
      setValue(decimals > 0 ? Number(next.toFixed(decimals)) : Math.round(next))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, end, decimals, duration, displayValue])

  const shown = displayValue != null ? displayValue : `${value}${suffix}`

  return (
    <div ref={ref} className="text-center">
      <p className="font-display text-3xl font-bold text-white sm:text-4xl">{shown}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/75">{label}</p>
    </div>
  )
}
