import { forwardRef } from 'react'
import { useInViewOnce } from '../hooks/useInViewOnce'

/**
 * Scroll-triggered pop-in wrapper for landing sections below the hero.
 */
const LandingRevealSection = forwardRef(function LandingRevealSection(
  { className = '', children, ...rest },
  forwardedRef,
) {
  const [observeRef, visible] = useInViewOnce({ threshold: 0.1, rootMargin: '0px 0px -6% 0px' })

  const setRef = (node) => {
    observeRef.current = node
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }

  const classes = [className, 'landing-section-reveal', visible ? 'landing-section-reveal--visible' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <section ref={setRef} className={classes} {...rest}>
      {children}
    </section>
  )
})

export default LandingRevealSection
