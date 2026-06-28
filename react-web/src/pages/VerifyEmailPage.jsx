import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

const REDIRECT_SECONDS = 3

function AnimatedCheckIcon() {
  return (
    <div
      className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#48BB78]/15"
      aria-hidden="true"
    >
      <svg
        className="h-12 w-12 text-[#48BB78] [animation:verify-check-pop_0.5s_ease-out]"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" className="opacity-30" />
        <path
          d="M14 24l8 8 12-16"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="[stroke-dasharray:32] [stroke-dashoffset:32] [animation:verify-check-draw_0.6s_ease-out_0.2s_forwards]"
        />
      </svg>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div
      className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#E88D5B]/10"
      aria-hidden="true"
    >
      <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#E88D5B]/25 border-t-[#E88D5B]" />
    </div>
  )
}

function ErrorIcon() {
  return (
    <div
      className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#FC8181]/15"
      aria-hidden="true"
    >
      <svg className="h-12 w-12 text-[#E53E3E]" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" className="opacity-30" />
        <path d="M16 16l16 16M32 16L16 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const attemptedRef = useRef(false)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('loading')
  const [feedback, setFeedback] = useState('Verifying your email...')
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (attemptedRef.current) return
    attemptedRef.current = true

    const token = searchParams.get('token') || ''
    async function verify() {
      if (!token) {
        setStatus('error')
        setFeedback('Verification token is missing. Please use the latest link from your email.')
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`)
        const raw = await res.text()
        let data = {}
        try {
          data = raw ? JSON.parse(raw) : {}
        } catch {
          data = {}
        }
        if (!res.ok) throw new Error(data.message || `Verification failed (HTTP ${res.status})`)
        setStatus('success')
        setFeedback(data.message || 'Your email is verified. You can sign in now.')
      } catch (e) {
        setStatus('error')
        setFeedback(e.message || 'Unable to verify email.')
      } finally {
        setLoading(false)
      }
    }
    verify()
  }, [searchParams])

  useEffect(() => {
    if (loading || status !== 'success') return

    setCountdown(REDIRECT_SECONDS)
    setProgress(0)

    const tickMs = 50
    const totalMs = REDIRECT_SECONDS * 1000
    let elapsed = 0
    const progressTimer = setInterval(() => {
      elapsed += tickMs
      setProgress(Math.min(100, (elapsed / totalMs) * 100))
      if (elapsed >= totalMs) clearInterval(progressTimer)
    }, tickMs)

    const countdownTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer)
          navigate('/login')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearInterval(progressTimer)
      clearInterval(countdownTimer)
    }
  }, [loading, status, navigate])

  const isSuccess = !loading && status === 'success'
  const isError = !loading && status === 'error'

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#F7FAFC] to-[#EDF2F7] font-sans text-[#2D3748]">
      <style>{`
        @keyframes verify-check-pop {
          from { transform: scale(0.6); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes verify-check-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div
            className={`rounded-2xl border bg-white p-8 shadow-xl ${
              isSuccess ? 'border-[#48BB78]/35' : isError ? 'border-[#FC8181]/40' : 'border-[#E2E8F0]'
            }`}
          >
            {/* Logo */}
            <div className="mb-6 text-center">
              <p className="text-2xl font-bold text-[#2D3748]">
                <span aria-hidden="true">🏠 </span>
                MySewa
              </p>
              <p className="mt-1 text-sm text-[#A0AEC0]">House Rental System for Students</p>
            </div>

            {/* Icon */}
            {loading ? <LoadingSpinner /> : isSuccess ? <AnimatedCheckIcon /> : <ErrorIcon />}

            {/* Header */}
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-[#2D3748]">
                {loading ? 'Verifying Email…' : isSuccess ? 'Email Verified!' : 'Verification Issue'}
              </h1>
              <p className="mt-2 text-sm text-[#A0AEC0]">
                {loading
                  ? 'Hang on while we confirm your account link.'
                  : isSuccess
                    ? 'Your MySewa account has been successfully verified.'
                    : 'We could not confirm this link. It may have expired or already been used.'}
              </p>
            </div>

            {/* Body */}
            {isSuccess ? (
              <p className="mb-6 text-center text-sm text-[#4A5568]">
                You can now sign in and start your rental journey.
              </p>
            ) : (
              <div
                className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
                  isError
                    ? 'border-[#FC8181]/30 bg-[#FC8181]/10 text-[#C53030]'
                    : 'border-[#E2E8F0] bg-[#F7FAFC] text-[#4A5568]'
                }`}
                role={isError ? 'alert' : 'status'}
              >
                {loading ? 'Checking token…' : feedback}
              </div>
            )}

            {/* Sign In / actions */}
            <div className="space-y-3">
              <Link
                to="/login"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E88D5B] py-3 text-center text-sm font-semibold text-white transition hover:bg-[#D97747]"
              >
                <span aria-hidden="true">🚀</span>
                {isSuccess ? 'Go to Sign In' : 'Back to Sign In'}
              </Link>
              {isError ? (
                <Link
                  to="/register"
                  className="flex w-full items-center justify-center rounded-lg border border-[#E2E8F0] py-3 text-center text-sm font-semibold text-[#4A5568] transition hover:bg-[#F7FAFC]"
                >
                  Create account
                </Link>
              ) : null}
            </div>

            {/* Progress bar (success only) */}
            {isSuccess ? (
              <div className="mt-6">
                <p className="mb-2 text-center text-xs text-[#A0AEC0]">
                  Redirecting to Sign In in {countdown} second{countdown === 1 ? '' : 's'}…
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-[#EDF2F7]">
                  <div
                    className="h-full rounded-full bg-[#E88D5B] transition-[width] duration-75 ease-linear"
                    style={{ width: `${progress}%` }}
                    role="progressbar"
                    aria-valuenow={Math.round(progress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Redirect progress"
                  />
                </div>
              </div>
            ) : null}

            {/* Social proof */}
            {isSuccess ? (
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
            ) : null}
          </div>

          <p className="mt-6 text-center text-xs text-[#A0AEC0]">
            © {new Date().getFullYear()} MySewa. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  )
}
