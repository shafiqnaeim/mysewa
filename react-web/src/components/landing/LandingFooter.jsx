import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import LandingReveal from './LandingReveal'

const FOOTER_LINKS = [
  { label: 'About', href: '#features' },
  { label: 'Blog', href: '#testimonials' },
  { label: 'Privacy', href: '/signin' },
]

export default function LandingFooter() {
  const { pushToast } = useToast()
  const [email, setEmail] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email.trim()) {
      pushToast({ message: 'Please enter your email address.', type: 'error' })
      return
    }
    pushToast({ message: 'Thanks! We will keep you posted on new listings.', type: 'success' })
    setEmail('')
  }

  return (
    <footer className="border-t border-story-primary/10 bg-white px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <LandingReveal>
          <div className="rounded-2xl bg-story-primary px-6 py-10 text-center text-white sm:px-10">
            <h2 className="font-display text-3xl sm:text-4xl">Ready to Move In?</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/80">
              Get alerts when new rooms open near your campus — no spam, just listings that match.
            </p>
            <form onSubmit={handleSubmit} className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@student.edu.my"
                className="flex-1 rounded-full border-0 px-5 py-3 text-sm text-story-primary outline-none ring-2 ring-transparent focus:ring-story-accent"
              />
              <button
                type="submit"
                className="rounded-full bg-story-accent px-6 py-3 text-sm font-bold text-story-primary transition hover:scale-105"
              >
                Notify Me
              </button>
            </form>
          </div>
        </LandingReveal>

        <div className="mt-10 flex flex-col items-center justify-between gap-6 border-t border-story-primary/10 pt-8 sm:flex-row">
          <Link to="/" className="font-display text-2xl text-story-primary">
            MySewa
          </Link>
          <nav className="flex flex-wrap justify-center gap-6" aria-label="Footer">
            {FOOTER_LINKS.map((link) =>
              link.href.startsWith('/') ? (
                <Link
                  key={link.label}
                  to={link.href}
                  className="text-sm font-semibold text-story-primary/70 hover:text-story-primary"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm font-semibold text-story-primary/70 hover:text-story-primary"
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>
          <p className="text-xs text-story-primary/50">© {new Date().getFullYear()} MySewa · FYP Rental Platform</p>
        </div>
      </div>
    </footer>
  )
}
