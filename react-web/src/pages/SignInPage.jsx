import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TopNavBar from '../components/TopNavBar'
import { EyeClosedIcon, EyeOpenIcon } from '../components/AuthIcons'
import { dashboardPathForRole } from '../auth/dashboardPaths'

const LAST_SIGNIN_EMAIL_KEY = 'mysewa_last_signin_email'

export default function SignInPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [authMessage, setAuthMessage] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [showForgotForm, setShowForgotForm] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
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
      setAuthMessage('Success: Registration completed. Check your email and verify your account before signing in.')
    }
  }, [searchParams])

  useEffect(() => {
    document.documentElement.classList.add('signin-no-scroll-root')
    return () => document.documentElement.classList.remove('signin-no-scroll-root')
  }, [])

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
      setAuthMessage('Success: Login successful.')
      const next = dashboardPathForRole(data.user?.role)
      navigate(next)
    } catch (e) {
      setAuthError(`Error: ${e.message || 'Unable to sign in.'}`)
    } finally {
      try {
        const trimmedEmail = loginForm.email.trim()
        if (trimmedEmail) localStorage.setItem(LAST_SIGNIN_EMAIL_KEY, trimmedEmail)
      } catch {
        /* ignore */
      }
      setAuthLoading(false)
    }
  }

  async function submitForgotPassword() {
    setForgotLoading(true)
    setAuthError('')
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const raw = await res.text()
      let data = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {
        data = {}
      }
      if (!res.ok) throw new Error(data.message || `Forgot password failed (HTTP ${res.status})`)
      setAuthMessage(`Success: ${data.message || 'If your email exists, reset instructions have been sent.'}`)
      setShowForgotForm(false)
    } catch (e) {
      setAuthError(`Error: ${e.message || 'Unable to process forgot password.'}`)
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <TopNavBar />
      <main className="signin-page signin-page--in-shell">
      <section className="signin-visual">
        <div className="signin-visual-copy">
          <h1>Sign in to MySewa</h1>
          <p>Access your account to continue managing rentals, applications, and updates.</p>
        </div>
      </section>

      <section className="signin-panel">

        <form className="signin-form" onSubmit={submitLogin}>
          <h2>Welcome Back to MySewa!</h2>
          <p>Sign in to your MySewa account and continue your rental journey with confidence.</p>
          {authMessage ? <div className="auth-toast signin-toast">{authMessage}</div> : null}
          {authError ? <div className="auth-toast auth-toast-error signin-toast">{authError}</div> : null}
          <label>
            Email or username
            <input
              type="text"
              autoComplete="username"
              placeholder="you@example.com or admin"
              value={loginForm.email}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </label>
          <label>
            Password<div className="password-field-wrap"><input type={showLoginPassword ? 'text' : 'password'} value={loginForm.password} onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))} required /><button type="button" className="password-toggle-btn" aria-label={showLoginPassword ? 'Hide password' : 'Show password'} onClick={() => setShowLoginPassword((prev) => !prev)}>{showLoginPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}</button></div></label>
          <div className="signin-options">
            <button type="button" className="link-like" onClick={() => setShowForgotForm((prev) => !prev)}>
              Forgot Password?
            </button>
          </div>
          {showForgotForm ? (
            <div className="forgot-password-form">
              <label>
                Enter your account email
                <input
                  type="email"
                  placeholder="info@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </label>
              <button type="button" className="signin-submit" onClick={submitForgotPassword} disabled={forgotLoading}>
                {forgotLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
              </button>
            </div>
          ) : null}
          <button type="submit" className="signin-submit" disabled={authLoading}>{authLoading ? 'Signing In...' : 'Login'}</button>
          <div className="signin-register-line"><span>Don&apos;t have any account? </span><button type="button" className="link-like" onClick={() => navigate('/signup')}>Sign Up</button></div>
        </form>
      </section>
      </main>
    </div>
  )
}
