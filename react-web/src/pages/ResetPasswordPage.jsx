import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EyeClosedIcon, EyeOpenIcon } from '../components/AuthIcons'

const MIN_PASSWORD_LENGTH = 6

const inputClass =
  'w-full rounded-lg border border-[#E2E8F0] bg-white p-3 pr-11 text-sm text-[#2D3748] outline-none transition placeholder:text-[#A0AEC0] focus:border-[#E88D5B] focus:ring-2 focus:ring-[#E88D5B]'

function PasswordField({ id, label, value, onChange, show, onToggle, disabled }) {
  return (
    <label className="block text-sm font-medium text-[#4A5568]" htmlFor={id}>
      <span className="mb-1.5 block">{label}</span>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className={inputClass}
          autoComplete="new-password"
          value={value}
          onChange={onChange}
          required
          disabled={disabled}
          minLength={MIN_PASSWORD_LENGTH}
        />
        <button
          type="button"
          className="absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#A0AEC0] hover:bg-[#F7FAFC] hover:text-[#4A5568] disabled:opacity-50"
          aria-label={show ? 'Hide password' : 'Show password'}
          onClick={onToggle}
          disabled={disabled}
        >
          {show ? <EyeClosedIcon /> : <EyeOpenIcon />}
        </button>
      </div>
    </label>
  )
}

function SocialProof() {
  return (
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
  )
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(token ? 'idle' : 'fatal-error')
  const [formError, setFormError] = useState('')
  const [fatalMessage, setFatalMessage] = useState(
    token ? '' : 'The reset link is invalid or has expired.'
  )
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })

  useEffect(() => {
    if (!token) {
      setStatus('fatal-error')
      setFatalMessage('The reset link is invalid or has expired.')
    }
  }, [token])

  async function submitResetPassword(event) {
    event.preventDefault()

    if (!token) {
      setStatus('fatal-error')
      setFatalMessage('The reset link is invalid or has expired.')
      return
    }

    if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    if (form.newPassword !== form.confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }

    setLoading(true)
    setFormError('')

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

      if (!res.ok) {
        const message = data.message || `Reset password failed (HTTP ${res.status})`
        if (/invalid|expired|token/i.test(message)) {
          setStatus('fatal-error')
          setFatalMessage('The reset link is invalid or has expired.')
        } else {
          setFormError(message)
        }
        return
      }

      setStatus('success')
    } catch {
      setFormError('Unable to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isSuccess = status === 'success'
  const isFatalError = status === 'fatal-error'
  const showForm = !isSuccess && !isFatalError

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#F7FAFC] to-[#EDF2F7] font-sans text-[#2D3748]">
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div
            className={`rounded-2xl border bg-white p-8 shadow-xl ${
              isSuccess ? 'border-[#48BB78]/35' : isFatalError ? 'border-[#FC8181]/40' : 'border-[#E2E8F0]'
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

            {isSuccess ? (
              <div className="text-center">
                <p className="text-5xl" aria-hidden="true">
                  ✅
                </p>
                <h1 className="mt-4 text-2xl font-bold text-[#2D3748]">Password Reset Successful!</h1>
                <p className="mt-2 text-sm text-[#A0AEC0]">
                  Your password has been updated. You can now sign in.
                </p>
                <Link
                  to="/login"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#E88D5B] py-3 text-sm font-semibold text-white transition hover:bg-[#D97747]"
                >
                  Go to Sign In →
                </Link>
              </div>
            ) : null}

            {isFatalError ? (
              <div className="text-center">
                <p className="text-5xl" aria-hidden="true">
                  ❌
                </p>
                <div
                  className="mt-4 rounded-lg border border-[#FC8181]/30 bg-[#FC8181]/10 px-4 py-3 text-sm text-[#C53030]"
                  role="alert"
                >
                  {fatalMessage || 'The reset link is invalid or has expired.'}
                </div>
                <Link
                  to="/login"
                  className="mt-6 inline-block text-sm font-semibold text-[#E88D5B] hover:text-[#D97747]"
                >
                  Back to Sign In →
                </Link>
              </div>
            ) : null}

            {showForm ? (
              <>
                <div className="mb-6 text-center">
                  <p className="text-3xl" aria-hidden="true">
                    🔐
                  </p>
                  <h1 className="mt-2 text-2xl font-bold text-[#2D3748]">Reset Password</h1>
                  <p className="mt-2 text-sm text-[#A0AEC0]">
                    Enter your new password below. Use the latest link from your email for security.
                  </p>
                </div>

                {formError ? (
                  <div
                    className="mb-4 rounded-lg border border-[#FC8181]/30 bg-[#FC8181]/10 px-4 py-3 text-sm text-[#C53030]"
                    role="alert"
                  >
                    {formError}
                  </div>
                ) : null}

                <form className="space-y-5" onSubmit={submitResetPassword}>
                  <div>
                    <PasswordField
                      id="new-password"
                      label={
                        <>
                          <span aria-hidden="true">🔒 </span>
                          New Password
                        </>
                      }
                      value={form.newPassword}
                      onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                      show={showPassword}
                      onToggle={() => setShowPassword((prev) => !prev)}
                      disabled={loading}
                    />
                    <p className="mt-1.5 text-xs text-[#A0AEC0]">
                      <span aria-hidden="true">⚠️ </span>
                      Must be at least {MIN_PASSWORD_LENGTH} characters
                    </p>
                  </div>

                  <PasswordField
                    id="confirm-password"
                    label={
                      <>
                        <span aria-hidden="true">🔒 </span>
                        Confirm New Password
                      </>
                    }
                    value={form.confirmPassword}
                    onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    show={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((prev) => !prev)}
                    disabled={loading}
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E88D5B] py-3 text-sm font-semibold text-white transition hover:bg-[#D97747] disabled:opacity-50"
                  >
                    <span aria-hidden="true">✅</span>
                    {loading ? 'Resetting…' : 'Reset Password'}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm">
                  <Link to="/login" className="font-semibold text-[#E88D5B] hover:text-[#D97747]">
                    Back to Sign In →
                  </Link>
                </p>
              </>
            ) : null}

            <SocialProof />
          </div>

          <p className="mt-6 text-center text-xs text-[#A0AEC0]">
            © {new Date().getFullYear()} MySewa. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  )
}
