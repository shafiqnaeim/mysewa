import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useToast } from '../../context/ToastContext'
import { fadeUp } from './landingMotion'

const QUICK_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Properties', href: '/properties' },
  { label: 'About', href: '#popular-properties' },
  { label: 'Testimonials', href: '#testimonials' },
]

const RESOURCES = [
  { label: 'Student Sign Up', href: '/signup' },
  { label: 'Landlord Sign Up', href: '/signup' },
  { label: 'Sign In', href: '/signin' },
  { label: 'Testimonials', href: '#testimonials' },
]

function FooterLink({ href, label }) {
  const className = 'text-sm text-[#2D3748]/70 transition-colors duration-300 hover:text-[#E88D5B]'
  if (href.startsWith('/')) {
    return (
      <Link to={href} className={className}>
        {label}
      </Link>
    )
  }
  return (
    <a href={href} className={className}>
      {label}
    </a>
  )
}

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
    <footer id="footer" className="border-t border-[#2D3748]/10 bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="rounded-2xl bg-gradient-to-br from-[#2D3748] to-[#2D3748]/90 px-6 py-10 text-center text-white sm:px-10"
        >
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
              className="flex-1 rounded-full border-0 px-5 py-3 text-sm text-[#2D3748] outline-none ring-2 ring-transparent focus:ring-[#E88D5B]"
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-full bg-[#E88D5B] px-6 py-3 text-sm font-bold text-[#2D3748] shadow-lg shadow-[#E88D5B]/30"
            >
              Notify Me
            </motion.button>
          </form>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={0.1}
          className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <Link to="/" className="font-display text-2xl text-[#2D3748] transition hover:text-[#E88D5B]">
              🏠 MySewa
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-[#2D3748]/65">
              Your trusted student rental platform for Terengganu universities.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#2D3748]">Quick Links</h3>
            <nav className="mt-4 flex flex-col gap-2" aria-label="Quick links">
              {QUICK_LINKS.map((link) => (
                <FooterLink key={link.label} {...link} />
              ))}
            </nav>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#2D3748]">Resources</h3>
            <nav className="mt-4 flex flex-col gap-2" aria-label="Resources">
              {RESOURCES.map((link) => (
                <FooterLink key={link.label} {...link} />
              ))}
            </nav>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#2D3748]">Contact</h3>
            <p className="mt-4 text-sm text-[#2D3748]/70">
              <a href="mailto:mysewa.fyp@gmail.com" className="transition-colors hover:text-[#E88D5B]">
                mysewa.fyp@gmail.com
              </a>
            </p>
            <p className="mt-1 text-sm text-[#2D3748]/70">Kuala Terengganu, Malaysia</p>
          </div>
        </motion.div>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={0.15}
          className="mt-10 border-t border-[#2D3748]/10 pt-8 text-center text-xs text-[#2D3748]/50"
        >
          © 2026 MySewa. All rights reserved.
        </motion.p>
      </div>
    </footer>
  )
}
