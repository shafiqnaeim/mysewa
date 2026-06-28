import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { EyeClosedIcon, EyeOpenIcon } from '../components/AuthIcons'
import { dashboardPathForRole } from '../auth/dashboardPaths'

const LAST_SIGNIN_EMAIL_KEY = 'mysewa_last_signin_email'

const DEMO_CREDENTIALS = [
  { role: 'Student', icon: '🎓', username: 'Student', password: 'Student123' },
  { role: 'Landlord', icon: '🏠', username: 'Landlord', password: 'Landlord123' },
  { role: 'Admin', icon: '⚙️', username: 'Admin', password: 'Admin123' },
]

const inputClass =
  'w-full rounded-lg border border-[#E2E8F0] bg-white p-3 text-sm text-[#2D3748] outline-none transition placeholder:text-[#A0AEC0] focus:border-[#E88D5B] focus:ring-2 focus:ring-[#E88D5B]'

export default function SignInPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [authMessage, setAuthMessage] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return Boolean(localStorage.getItem(LAST_SIGNIN_EMAIL_KEY))
    } catch {
      return false
    }
  })
  const [loginForm, setLoginForm] = useState(() => {
    try {
      const saved = localStorage.getItem(LAST_SIGNIN_EMAIL_KEY)
      return { email: saved ? saved.trim() : '', password: '' }
    } catch {
      return { email: '', password: '' }
    }
  })

  useEffect(() => {
    if (searchParams.get('registered') === '1') {
      setAuthMessage('Registration completed. Check your email and verify your account before signing in.')
    }
  }, [searchParams])

  async function submitLogin(event) {
    event.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    setAuthMessage('')
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      const raw = await res.text()
      let data = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {
        data = {}
      }
      if (!res.ok) throw new Error(data.message || data.error || `Login failed (HTTP ${res.status})`)
      if (data.token) localStorage.setItem('mysewa_token', data.token)
      try {
        const trimmedEmail = loginForm.email.trim()
        if (rememberMe && trimmedEmail) {
          localStorage.setItem(LAST_SIGNIN_EMAIL_KEY, trimmedEmail)
        } else {
          localStorage.removeItem(LAST_SIGNIN_EMAIL_KEY)
        }
      } catch {
        /* ignore */
      }
      const next = dashboardPathForRole(data.user?.role)
      navigate(next)
    } catch (e) {
      setAuthError(e.message || 'Unable to sign in.')
    } finally {
      setAuthLoading(false)
    }
  }

  function fillDemoCredentials({ username, password }) {
    setLoginForm({ email: username, password })
    setAuthError('')
    setAuthMessage('')
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#F7FAFC] to-[#EDF2F7] font-sans text-[#2D3748]">
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-xl">
            {/* Logo */}
            <div className="mb-8 text-center">
              <p className="text-2xl font-bold text-[#2D3748]">
                <span aria-hidden="true">🏠 </span>
                MySewa
              </p>
              <p className="mt-1 text-sm text-[#A0AEC0]">House Rental System for Students</p>
            </div>

            {/* Header */}
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-[#2D3748]">
                Welcome Back! <span aria-hidden="true">👋</span>
              </h1>
              <p className="mt-2 text-sm text-[#A0AEC0]">Sign in to your MySewa account</p>
            </div>

            {authMessage ? (
              <p
                className="mb-4 rounded-lg border border-[#48BB78]/30 bg-[#48BB78]/10 px-4 py-3 text-sm text-[#276749]"
                role="status"
              >
                {authMessage}
              </p>
            ) : null}
            {authError ? (
              <p
                className="mb-4 rounded-lg border border-[#FC8181]/30 bg-[#FC8181]/10 px-4 py-3 text-sm text-[#C53030]"
                role="alert"
              >
                {authError}
              </p>
            ) : null}

            <form className="space-y-5" onSubmit={submitLogin}>
              <label className="block text-sm font-medium text-[#4A5568]">
                <span className="mb-1.5 block">
                  <span aria-hidden="true">📧 </span>
                  Email or Username
                </span>
                <input
                  type="text"
                  className={inputClass}
                  autoComplete="username"
                  placeholder="you@example.com or admin"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </label>

              <label className="block text-sm font-medium text-[#4A5568]">
                <span className="mb-1.5 block">
                  <span aria-hidden="true">🔒 </span>
                  Password
                </span>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    className={`${inputClass} pr-11`}
                    autoComplete="current-password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#A0AEC0] hover:bg-[#F7FAFC] hover:text-[#4A5568]"
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                  >
                    {showLoginPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                  </button>
                </div>
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-[#4A5568]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-[#E2E8F0] text-[#E88D5B] focus:ring-[#E88D5B]"
                  />
                  Remember me
                </label>
                <Link to="/forgot-password" className="font-medium text-[#E88D5B] hover:text-[#D97747]">
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E88D5B] py-3 text-sm font-semibold text-white transition hover:bg-[#D97747] disabled:opacity-50"
              >
                <span aria-hidden="true">🔐</span>
                {authLoading ? 'Signing in…' : 'Login'}
              </button>
            </form>

            <section className="mt-6 rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] p-4" aria-label="Demo credentials">
              <h2 className="text-center text-xs font-semibold tracking-wide text-[#718096]">
                <span aria-hidden="true">🎯 </span>
                Demo Credentials
              </h2>
              <p className="mt-1 text-center text-xs text-[#A0AEC0]">Click a row to fill the form</p>
              <div className="mt-3 overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
                <table className="w-full text-left text-xs text-[#4A5568]">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#FAFAFA] text-[#718096]">
                      <th className="px-3 py-2 font-medium">Role</th>
                      <th className="px-3 py-2 font-medium">Username</th>
                      <th className="px-3 py-2 font-medium">Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DEMO_CREDENTIALS.map((row) => (
                      <tr
                        key={row.role}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer border-b border-[#E2E8F0] last:border-b-0 transition hover:bg-[#EDF2F7]"
                        onClick={() => fillDemoCredentials(row)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            fillDemoCredentials(row)
                          }
                        }}
                      >
                        <td className="px-3 py-2.5 font-medium text-[#2D3748]">
                          <span aria-hidden="true">{row.icon} </span>
                          {row.role}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[#4A5568]">{row.username}</td>
                        <td className="px-3 py-2.5 font-mono text-[#718096]">{row.password}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <p className="mt-6 text-center text-sm text-[#4A5568]">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="font-semibold text-[#E88D5B] hover:text-[#D97747]">
                Sign Up →
              </Link>
            </p>

            <p className="mt-8 text-center text-xs text-[#A0AEC0]">
              <span aria-hidden="true">🔹 </span>
              500+ Properties
              <span className="mx-2" aria-hidden="true">
                🔹
              </span>
              1000+ Students
              <span className="mx-2" aria-hidden="true">
                🔹
              </span>
              4.8★ Rating
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-[#A0AEC0]">© 2026 MySewa. All rights reserved.</p>
        </div>
      </main>
    </div>
  )
}
