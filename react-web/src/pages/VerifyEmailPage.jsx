import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TopNavBar from '../components/TopNavBar'
import './VerifyEmailPage.css'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const attemptedRef = useRef(false)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('loading')
  const [feedback, setFeedback] = useState('Verifying your email...')
  const [countdown, setCountdown] = useState(5)

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
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/signin')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [loading, status, navigate])

  const stateClass = loading ? 'is-loading' : status === 'success' ? 'is-success' : 'is-error'

  return (
    <div className="app-shell">
      <TopNavBar />
      <main className="verify-email-page verify-email-page--in-shell">
        <div className={`verify-email-card ${stateClass}`}>
          <div className="verify-email-icon-wrap" aria-hidden="true">
            {loading ? (
              <span className="verify-email-spinner" />
            ) : status === 'success' ? (
              <svg className="verify-email-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" />
                <path d="M14 24l8 8 12-16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg className="verify-email-icon verify-email-icon--error" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" />
                <path d="M16 16l16 16M32 16L16 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            )}
          </div>

          <h1 className="verify-email-title">
            {loading ? 'Verifying email' : status === 'success' ? 'You are all set' : 'Verification issue'}
          </h1>
          <p className="verify-email-lead">
            {loading
              ? 'Hang on while we confirm your account link.'
              : status === 'success'
                ? 'Your MySewa account email has been confirmed successfully.'
                : 'We could not confirm this link. It may have expired or already been used.'}
          </p>

          <div className={`verify-email-panel ${status === 'error' ? 'verify-email-panel--error' : status === 'success' ? 'verify-email-panel--success' : ''}`}>
            <p className="verify-email-panel-text">{loading ? 'Checking token…' : feedback}</p>
            {!loading && status === 'success' ? (
              <p className="verify-email-countdown">Redirecting to Sign In in <strong>{countdown}</strong>s…</p>
            ) : null}
          </div>

          <div className="verify-email-actions">
            <button type="button" className="verify-email-btn verify-email-btn--primary" onClick={() => navigate('/signin')}>
              {status === 'success' ? 'Go to Sign In' : 'Back to Sign In'}
            </button>
            {!loading && status === 'error' ? (
              <button type="button" className="verify-email-btn verify-email-btn--ghost" onClick={() => navigate('/signup')}>
                Create account
              </button>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  )
}
