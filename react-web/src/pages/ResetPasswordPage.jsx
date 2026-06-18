import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TopNavBar from '../components/TopNavBar'
import { EyeClosedIcon, EyeOpenIcon } from '../components/AuthIcons'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })

  async function submitResetPassword(event) {
    event.preventDefault()
    const token = searchParams.get('token') || ''
    if (!token) {
      setError('Error: Reset token is missing. Please use the link from your email.')
      return
    }
    setLoading(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: form.newPassword,
          confirmPassword: form.confirmPassword,
        }),
      })
      const raw = await res.text()
      let data = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {
        data = {}
      }
      if (!res.ok) throw new Error(data.message || `Reset password failed (HTTP ${res.status})`)
      setMessage(`Success: ${data.message || 'Password reset successful.'}`)
    } catch (e) {
      setError(`Error: ${e.message || 'Unable to reset password.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <TopNavBar />
      <main className="auth-simple-page auth-simple-page--in-shell">
      <section className="auth-simple-card">
        <h2>Reset Password</h2>
        <p className="auth-simple-subtext">
          Enter your new password below. Use the latest link from your email for security.
        </p>
        {message ? <div className="auth-toast">{message}</div> : null}
        {error ? <div className="auth-toast auth-toast-error">{error}</div> : null}
        <form className="signin-form reset-password-form" onSubmit={submitResetPassword}>
          <label>
            New Password
            <div className="password-field-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.newPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                required
              />
              <button type="button" className="password-toggle-btn" onClick={() => setShowPassword((prev) => !prev)}>
                {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
              </button>
            </div>
          </label>
          <label>
            Confirm New Password
            <div className="password-field-wrap">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                required
              />
              <button type="button" className="password-toggle-btn" onClick={() => setShowConfirmPassword((prev) => !prev)}>
                {showConfirmPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
              </button>
            </div>
          </label>
          <div className="reset-password-actions">
            <button type="submit" className="signin-submit reset-password-submit" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <button type="button" className="reset-password-back-btn" onClick={() => navigate('/signin')}>
              Back to Sign In
            </button>
          </div>
        </form>
      </section>
      </main>
    </div>
  )
}
