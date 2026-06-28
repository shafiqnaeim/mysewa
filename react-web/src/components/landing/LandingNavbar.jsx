import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const NAV_LINKS = [
  { label: 'Explore', href: '#trending' },
  { label: 'Features', href: '#features' },
  { label: 'Stories', href: '#testimonials' },
]

export default function LandingNavbar() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const shellClass = [
    'fixed inset-x-0 top-0 z-50 transition-all duration-300',
    scrolled
      ? 'bg-white/95 shadow-md shadow-story-primary/5 backdrop-blur-md'
      : 'bg-transparent',
  ].join(' ')

  return (
    <header className={shellClass}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className={`font-display text-2xl tracking-tight transition-colors ${scrolled ? 'text-story-primary' : 'text-white'}`}
        >
          MySewa
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm font-semibold transition-colors hover:text-story-accent ${
                scrolled ? 'text-story-primary/80' : 'text-white/90'
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button
            type="button"
            onClick={() => navigate('/signin')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition hover:scale-105 ${
              scrolled
                ? 'text-story-primary hover:bg-story-primary/5'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="rounded-full bg-story-accent px-5 py-2.5 text-sm font-bold text-story-primary shadow-lg transition hover:scale-105 hover:brightness-105"
          >
            List Your Property
          </button>
        </div>

        <button
          type="button"
          className={`rounded-lg p-2 md:hidden ${scrolled ? 'text-story-primary' : 'text-white'}`}
          aria-expanded={menuOpen}
          aria-label="Open menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {menuOpen ? (
              <>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </>
            ) : (
              <>
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </>
            )}
          </svg>
        </button>
      </div>

      {menuOpen ? (
        <div className="border-t border-story-primary/10 bg-white px-4 py-4 shadow-lg md:hidden">
          <nav className="flex flex-col gap-3" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-semibold text-story-primary"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              className="text-left font-semibold text-story-primary"
              onClick={() => {
                setMenuOpen(false)
                navigate('/signin')
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className="rounded-full bg-story-accent px-4 py-2.5 font-bold text-story-primary"
              onClick={() => {
                setMenuOpen(false)
                navigate('/signup')
              }}
            >
              List Your Property
            </button>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
