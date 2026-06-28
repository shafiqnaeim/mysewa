import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const REDIRECT_SECONDS = 5

const inputClass =
  'w-full rounded-lg border border-[#E2E8F0] bg-white p-3 text-sm text-[#2D3748] outline-none transition placeholder:text-[#A0AEC0] focus:border-[#E88D5B] focus:ring-2 focus:ring-[#E88D5B]'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('idle')
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS)

  useEffect(() => {
    if (status !== 'success') return

    setCountdown(REDIRECT_SECONDS)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/login')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [status, navigate])

  async function submitForgotPassword(event) {
    event.preventDefault()
    setLoading(true)
    setStatus('idle')

    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const raw = await res.text()
      let data = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {
        data = {}
      }

      if (!res.ok) {
        const message = data.message || `Request failed (HTTP ${res.status})`
        if (
          res.status === 404 ||
          /not found|no account/i.test(message)
        ) {
          setStatus('not-found')
        } else {
          setStatus('error')
        }
        return
      }

      setStatus('success')
    } catch {
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const showForm = status === 'idle' || status === 'error'

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#F7FAFC] to-[#EDF2F7] font-sans text-[#2D3748]">
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-xl">
            {/* Logo */}
            <div className="mb-6 text-center">
              <p className="text-2xl font-bold text-[#2D3748]">
                <span aria-hidden="true">🏠 </span>
                MySewa
              </p>
              <p className="mt-1 text-sm text-[#A0AEC0]">House Rental System for Students</p>
            </div>

            {/* Header */}
            <div className="mb-6 text-center">
              <p className="text-3xl" aria-hidden="true">
                🔒
              </p>
              <h1 className="mt-2 text-2xl font-bold text-[#2D3748]">Forgot Password?</h1>
              <p className="mt-2 text-sm text-[#A0AEC0]">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            {/* Success */}
            {status === 'success' ? (
              <div
                className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-center"
                role="status"
              >
                <p className="text-lg font-semibold text-[#276749]">
                  <span aria-hidden="true">✅ </span>
                  Password reset link sent!
                </p>
                <p className="mt-2 text-sm text-[#2F855A]">Check your email for the reset link.</p>
                <p className="mt-3 text-xs text-[#48BB78]">
                  Redirecting to Sign In in {countdown} second{countdown === 1 ? '' : 's'}…
                </p>
              </div>
            ) : null}

            {/* Email not found */}
            {status === 'not-found' ? (
              <div
                className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-center"
                role="alert"
              >
                <p className="text-lg font-semibold text-[#C53030]">
                  <span aria-hidden="true">❌ </span>
                  Email not found
                </p>
                <p className="mt-2 text-sm text-[#E53E3E]">No account found with this email address.</p>
              </div>
            ) : null}

            {/* Form */}
            {showForm ? (
              <form className="space-y-5" onSubmit={submitForgotPassword}>
                <label className="block text-sm font-medium text-[#4A5568]">
                  <span className="mb-1.5 block">
                    <span aria-hidden="true">📧 </span>
                    Email Address
                  </span>
                  <input
                    type="email"
                    className={inputClass}
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E88D5B] py-3 text-sm font-semibold text-white transition hover:bg-[#D97747] disabled:opacity-50"
                >
                  <span aria-hidden="true">📤</span>
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            ) : null}

            {/* Retry after not-found */}
            {status === 'not-found' ? (
              <button
                type="button"
                onClick={() => setStatus('idle')}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E88D5B] py-3 text-sm font-semibold text-white transition hover:bg-[#D97747]"
              >
                <span aria-hidden="true">📤</span>
                Try another email
              </button>
            ) : null}

            <p className="mt-6 text-center text-sm text-[#4A5568]">
              Remember your password?{' '}
              <Link to="/login" className="font-semibold text-[#E88D5B] hover:text-[#D97747]">
                Sign In →
              </Link>
            </p>

            <p className="mt-8 text-center text-xs leading-relaxed text-[#A0AEC0]">
              <span aria-hidden="true">🔹 </span>
              500+ Properties
              <span className="mx-2" aria-hidden="true">
                ·
              </span>
              <span aria-hidden="true">🔹 </span>
              1000+ Students
              <span className="mx-2" aria-hidden="true">
                ·
              </span>
              <span aria-hidden="true">🔹 </span>
              4.8★ Rating
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-[#A0AEC0]">
            © {new Date().getFullYear()} MySewa. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  )
}
