import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopNavBar from '../components/TopNavBar'
import { EyeClosedIcon, EyeOpenIcon } from '../components/AuthIcons'

const UNIVERSITY_OPTIONS = [
  { value: '', label: 'Select university', disabled: true },
  { value: 'UMT', label: 'UMT' },
  { value: 'UniSZA', label: 'UniSZA' },
  { value: 'ILPKT', label: 'ILPKT' },
  { value: '__other__', label: 'Other' },
]

const RACE_OPTIONS = [
  { value: '', label: 'Select race', disabled: true },
  { value: 'Malay', label: 'Malay' },
  { value: 'Chinese', label: 'Chinese' },
  { value: 'Indian', label: 'Indian' },
  { value: '__other__', label: 'Others' },
]

const RELIGION_OPTIONS = [
  { value: '', label: 'Select religion', disabled: true },
  { value: 'Islam', label: 'Islam' },
  { value: 'Buddhism', label: 'Buddhism' },
  { value: 'Hindu', label: 'Hindu' },
  { value: 'Christianity', label: 'Christianity' },
  { value: '__other__', label: 'Others' },
]

export default function SignUpPage() {
  const navigate = useNavigate()
  const [authMessage, setAuthMessage] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false)
  const [signupUniversityChoice, setSignupUniversityChoice] = useState('')
  const [signupRaceChoice, setSignupRaceChoice] = useState('')
  const [signupReligionChoice, setSignupReligionChoice] = useState('')
  const [customUniversity, setCustomUniversity] = useState('')
  const [customRace, setCustomRace] = useState('')
  const [customReligion, setCustomReligion] = useState('')
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    icNumber: '',
    university: '',
    role: 'student',
    race: '',
    religion: '',
    password: '',
    confirmPassword: '',
  })
  const phonePattern = '^\\d{2}-\\d{7,8}$'
  const icPattern = '^\\d{6}-\\d{2}-\\d{4}$'

  useEffect(() => {
    if (registerForm.role === 'landlord') {
      setRegisterForm((p) => ({ ...p, university: 'None' }))
      setSignupUniversityChoice('')
      setCustomUniversity('')
    }
  }, [registerForm.role])

  async function submitRegister(event) {
    event.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    setAuthMessage('')
    try {
      const universityValue =
        registerForm.role === 'student'
          ? signupUniversityChoice === '__other__'
            ? customUniversity.trim()
            : registerForm.university
          : 'None'
      const raceValue = signupRaceChoice === '__other__' ? customRace.trim() : registerForm.race
      const religionValue = signupReligionChoice === '__other__' ? customReligion.trim() : registerForm.religion

      if (registerForm.role === 'student' && !universityValue) {
        throw new Error('Please select or enter your university.')
      }
      if (!raceValue) throw new Error('Please select or enter your race.')
      if (!religionValue) throw new Error('Please select or enter your religion.')

      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...registerForm,
          university: universityValue,
          race: raceValue,
          religion: religionValue,
          phoneNumber: `+60${String(registerForm.phoneNumber || '').replace(/^\+?60/, '')}`,
        }),
      })
      const raw = await res.text()
      let data = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {
        data = {}
      }
      if (!res.ok) throw new Error(data.message || data.error || `Registration failed (HTTP ${res.status})`)
      setAuthMessage(`Success: ${data.message || 'Registration successful. Please verify your email.'}`)
      navigate('/signin?registered=1')
    } catch (e) {
      setAuthError(`Error: ${e.message || 'Unable to register.'}`)
    } finally {
      setAuthLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <TopNavBar />
      <main className="signin-page signup-page signin-page--in-shell">
        <section className="signin-visual signup-visual-plain" />
        <section className="signin-panel">
          <form className="signup-form" onSubmit={submitRegister}>
            <h2>Create Account</h2>
            <p>Enter your details below to create your MySewa account.</p>
            {authMessage ? <div className="auth-toast signin-toast">{authMessage}</div> : null}
            {authError ? <div className="auth-toast auth-toast-error signin-toast">{authError}</div> : null}

            <div className="signup-grid">
              <label>
                Full Name
                <input type="text" value={registerForm.fullName} onChange={(e) => setRegisterForm((p) => ({ ...p, fullName: e.target.value }))} required />
              </label>
              <label>
                Email
                <input type="email" placeholder="info@example.com" value={registerForm.email} onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))} required />
              </label>
              <div className="signup-field">
                <span className="signup-label">Phone Number</span>
                <div className="phone-field-wrap">
                  <div className="phone-country-fixed">
                    <img src="/malaysia-flag.png" alt="Malaysia" />
                    <span>+60</span>
                  </div>
                  <input
                    className="phone-number"
                    type="tel"
                    placeholder="12-3456789"
                    pattern={phonePattern}
                    title="Use format 12-3456789"
                    value={registerForm.phoneNumber}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <label>
                IC Number
                <input
                  type="text"
                  placeholder="123456-78-9010"
                  pattern={icPattern}
                  title="Use format 123456-78-9010"
                  value={registerForm.icNumber}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, icNumber: e.target.value }))}
                  required
                />
              </label>

              <div className="signup-field">
                <span className="signup-label">Role</span>
                <div className="radio-group">
                  <label className="radio-item">
                    <input
                      type="radio"
                      name="role"
                      value="student"
                      checked={registerForm.role === 'student'}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, role: e.target.value, university: p.university === 'None' ? '' : p.university }))}
                    />
                    <span className="radio-text">Student</span>
                  </label>
                  <label className="radio-item">
                    <input
                      type="radio"
                      name="role"
                      value="landlord"
                      checked={registerForm.role === 'landlord'}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, role: e.target.value, university: 'None' }))}
                    />
                    <span className="radio-text">Landlord</span>
                  </label>
                </div>
              </div>

              <div className="signup-field">
                <span className="signup-label">University</span>
                {registerForm.role === 'student' ? (
                  <>
                    <select
                      className="signup-select"
                      value={signupUniversityChoice}
                      onChange={(e) => {
                        const v = e.target.value
                        setSignupUniversityChoice(v)
                        if (v === '__other__') {
                          setRegisterForm((p) => ({ ...p, university: '' }))
                        } else {
                          setRegisterForm((p) => ({ ...p, university: v }))
                          setCustomUniversity('')
                        }
                      }}
                      required
                    >
                      {UNIVERSITY_OPTIONS.map((o) => (
                        <option key={o.value || 'placeholder'} value={o.value} disabled={o.disabled}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {signupUniversityChoice === '__other__' ? (
                      <input className="signup-select-other" type="text" placeholder="Type university name" value={customUniversity} onChange={(e) => setCustomUniversity(e.target.value)} required />
                    ) : null}
                  </>
                ) : (
                  <select className="signup-select" value="None" disabled aria-label="University not applicable for landlord">
                    <option value="None">Not applicable (landlord)</option>
                  </select>
                )}
              </div>

              <div className="signup-field">
                <span className="signup-label">Race</span>
                <select
                  className="signup-select"
                  value={signupRaceChoice}
                  onChange={(e) => {
                    const v = e.target.value
                    setSignupRaceChoice(v)
                    if (v === '__other__') {
                      setRegisterForm((p) => ({ ...p, race: '' }))
                    } else {
                      setRegisterForm((p) => ({ ...p, race: v }))
                      setCustomRace('')
                    }
                  }}
                  required
                >
                  {RACE_OPTIONS.map((o) => (
                    <option key={o.value || 'race-ph'} value={o.value} disabled={o.disabled}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {signupRaceChoice === '__other__' ? (
                  <input className="signup-select-other" type="text" placeholder="Type your race" value={customRace} onChange={(e) => setCustomRace(e.target.value)} required />
                ) : null}
              </div>

              <div className="signup-field">
                <span className="signup-label">Religion</span>
                <select
                  className="signup-select"
                  value={signupReligionChoice}
                  onChange={(e) => {
                    const v = e.target.value
                    setSignupReligionChoice(v)
                    if (v === '__other__') {
                      setRegisterForm((p) => ({ ...p, religion: '' }))
                    } else {
                      setRegisterForm((p) => ({ ...p, religion: v }))
                      setCustomReligion('')
                    }
                  }}
                  required
                >
                  {RELIGION_OPTIONS.map((o) => (
                    <option key={o.value || 'rel-ph'} value={o.value} disabled={o.disabled}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {signupReligionChoice === '__other__' ? (
                  <input className="signup-select-other" type="text" placeholder="Type your religion" value={customReligion} onChange={(e) => setCustomReligion(e.target.value)} required />
                ) : null}
              </div>

              <label>
                Password
                <div className="password-field-wrap">
                  <input type={showSignupPassword ? 'text' : 'password'} value={registerForm.password} onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))} required />
                  <button type="button" className="password-toggle-btn" aria-label={showSignupPassword ? 'Hide password' : 'Show password'} onClick={() => setShowSignupPassword((prev) => !prev)}>
                    {showSignupPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                  </button>
                </div>
              </label>
              <label>
                Confirm Password
                <div className="password-field-wrap">
                  <input type={showSignupConfirmPassword ? 'text' : 'password'} value={registerForm.confirmPassword} onChange={(e) => setRegisterForm((p) => ({ ...p, confirmPassword: e.target.value }))} required />
                  <button type="button" className="password-toggle-btn" aria-label={showSignupConfirmPassword ? 'Hide password' : 'Show password'} onClick={() => setShowSignupConfirmPassword((prev) => !prev)}>
                    {showSignupConfirmPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                  </button>
                </div>
              </label>
            </div>

            <button type="submit" className="signin-submit" disabled={authLoading}>
              {authLoading ? 'Creating...' : 'Create Account'}
            </button>
            <div className="signin-register-line">
              <span>Already have an account? </span>
              <button type="button" className="link-like" onClick={() => navigate('/signin')}>
                Sign In
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}
