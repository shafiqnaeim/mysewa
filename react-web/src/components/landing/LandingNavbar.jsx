import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLandingAuth } from '../../hooks/useLandingAuth'
import { hoverButton } from './landingMotion'

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Properties', href: '/properties' },
  { label: 'About', href: '#popular-properties' },
  { label: 'Contact', href: '#footer' },
]

function NavLink({ href, label, scrolled }) {
  const isHash = href.startsWith('#')
  const className = `group relative text-sm font-semibold transition-colors duration-300 ${
    scrolled ? 'text-[#2D3748]/80 hover:text-[#E88D5B]' : 'text-white/90 hover:text-white'
  }`

  const content = (
    <>
      {label}
      <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-[#E88D5B] transition-all duration-300 group-hover:w-full" />
    </>
  )

  if (isHash) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    )
  }
  return (
    <Link to={href} className={className}>
      {content}
    </Link>
  )
}

function UserAvatar({ user, scrolled }) {
  const initial = (user?.fullName || user?.email || '?').charAt(0).toUpperCase()
  return (
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
        scrolled ? 'bg-[#E88D5B]/20 text-[#2D3748]' : 'bg-white/20 text-white'
      }`}
      title={user?.fullName || user?.email}
    >
      {initial}
    </span>
  )
}

export default function LandingNavbar() {
  const navigate = useNavigate()
  const { user, loading, logout, dashboardPath, isLoggedIn, isAdmin } = useLandingAuth()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const shellClass = [
    'fixed inset-x-0 top-0 z-50 transition-all duration-500',
    scrolled ? 'border-b border-[#2D3748]/10 bg-[#FAFAFA]/90 shadow-lg shadow-[#2D3748]/5 backdrop-blur-md' : 'bg-transparent',
  ].join(' ')

  const btnGhost = scrolled
    ? 'text-[#2D3748] hover:bg-[#2D3748]/5'
    : 'text-white hover:bg-white/10'

  return (
    <header className={shellClass}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
          <Link
            to="/"
            className={`flex items-center gap-2 font-display text-xl font-bold tracking-tight sm:text-2xl ${
              scrolled ? 'text-[#2D3748]' : 'text-white'
            }`}
          >
            <span aria-hidden="true">🏠</span>
            MySewa
          </Link>
        </motion.div>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.href} {...link} scrolled={scrolled} />
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {loading ? (
            <span className={`text-sm ${scrolled ? 'text-[#718096]' : 'text-white/70'}`}>…</span>
          ) : isLoggedIn ? (
            <>
              <UserAvatar user={user} scrolled={scrolled} />
              <motion.button
                type="button"
                variants={hoverButton}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                onClick={() => navigate(dashboardPath)}
                className={`rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${btnGhost}`}
              >
                {isAdmin ? 'Admin Panel' : 'Dashboard'}
              </motion.button>
              <motion.button
                type="button"
                variants={hoverButton}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                onClick={logout}
                className="rounded-full bg-[#E88D5B] px-5 py-2.5 text-sm font-bold text-[#2D3748] shadow-lg shadow-[#E88D5B]/30"
              >
                Logout
              </motion.button>
            </>
          ) : (
            <>
              <motion.button
                type="button"
                variants={hoverButton}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                onClick={() => navigate('/signin')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${btnGhost}`}
              >
                Login
              </motion.button>
              <motion.button
                type="button"
                variants={hoverButton}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                onClick={() => navigate('/signup')}
                className="rounded-full bg-[#E88D5B] px-5 py-2.5 text-sm font-bold text-[#2D3748] shadow-lg shadow-[#E88D5B]/30 transition hover:shadow-[#E88D5B]/50"
              >
                Register
              </motion.button>
            </>
          )}
        </div>

        <button
          type="button"
          className={`rounded-lg p-2 md:hidden ${scrolled ? 'text-[#2D3748]' : 'text-white'}`}
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
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-[#2D3748]/10 bg-white px-4 py-4 shadow-lg md:hidden"
        >
          <nav className="flex flex-col gap-3" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-semibold text-[#2D3748]"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            {isLoggedIn ? (
              <>
                <button type="button" className="text-left font-semibold text-[#2D3748]" onClick={() => { setMenuOpen(false); navigate(dashboardPath) }}>
                  {isAdmin ? 'Admin Panel' : 'Dashboard'}
                </button>
                <button type="button" className="text-left font-semibold text-[#DC2626]" onClick={() => { setMenuOpen(false); logout() }}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <button type="button" className="text-left font-semibold text-[#2D3748]" onClick={() => { setMenuOpen(false); navigate('/signin') }}>
                  Login
                </button>
                <button type="button" className="rounded-full bg-[#E88D5B] px-4 py-2.5 font-bold text-[#2D3748]" onClick={() => { setMenuOpen(false); navigate('/signup') }}>
                  Register
                </button>
              </>
            )}
          </nav>
        </motion.div>
      ) : null}
    </header>
  )
}
