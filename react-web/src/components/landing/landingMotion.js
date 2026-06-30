export const easeOut = [0.22, 1, 0.36, 1]

export const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: easeOut, delay },
  }),
}

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: (delay = 0) => ({
    opacity: 1,
    transition: { duration: 0.45, ease: easeOut, delay },
  }),
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (delay = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: easeOut, delay },
  }),
}

export const slideFromLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: (delay = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.55, ease: easeOut, delay },
  }),
}

export const slideFromRight = {
  hidden: { opacity: 0, x: 40 },
  visible: (delay = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.55, ease: easeOut, delay },
  }),
}

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
}

export const hoverLift = {
  rest: { y: 0, boxShadow: '0 4px 14px rgba(45,55,72,0.08)' },
  hover: {
    y: -6,
    boxShadow: '0 20px 40px rgba(45,55,72,0.14)',
    transition: { duration: 0.3, ease: easeOut },
  },
}

export const hoverButton = {
  rest: { scale: 1 },
  hover: { scale: 1.05, transition: { duration: 0.25 } },
  tap: { scale: 0.98 },
}
