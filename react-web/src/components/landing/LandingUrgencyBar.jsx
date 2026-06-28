import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LandingUrgencyBar() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 3000)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-lg"
          role="status"
        >
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-story-primary/10 bg-white px-4 py-3 shadow-xl shadow-story-primary/15">
            <p className="text-sm font-semibold text-story-primary">
              <span aria-hidden="true">🔥 </span>
              12 people are viewing listings right now.
            </p>
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-story-primary/50 hover:bg-story-primary/5 hover:text-story-primary"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
