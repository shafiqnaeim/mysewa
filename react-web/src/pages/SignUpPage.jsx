import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EyeClosedIcon, EyeOpenIcon } from '../components/AuthIcons'
import { fetchPublicUniversities } from '../utils/universitiesApi'

const FALLBACK_UNIVERSITIES = [
  { code: 'UMT', name: 'UMT' },
  { code: 'UniSZA', name: 'UniSZA' },
  { code: 'ILPKT', name: 'ILPKT' },
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

const inputClass =
  'w-full rounded-lg border border-[#E2E8F0] bg-white p-3 text-sm text-[#2D3748] outline-none transition placeholder:text-[#A0AEC0] focus:border-[#E88D5B] focus:ring-2 focus:ring-[#E88D5B] disabled:bg-[#F7FAFC] disabled:text-[#A0AEC0]'

const selectClass = `${inputClass} cursor-pointer`

function Section({ title, children }) {
  return (
    <section className="space-y-4">
      <h2 className="border-b border-[#E2E8F0] pb-2 text-sm font-bold uppercase tracking-wide text-[#4A5568]">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block text-sm font-medium text-[#4A5568] ${className}`}>
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  )
}

function PasswordField({ label, value, onChange, visible, onToggleVisible }) {
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          className={`${inputClass} pr-11`}
          value={value}
          onChange={onChange}
          autoComplete={label.includes('Confirm') ? 'new-password' : 'new-password'}
          required
        />
        <button
          type="button"
          className="absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#A0AEC0] hover:bg-[#F7FAFC] hover:text-[#4A5568]"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={onToggleVisible}
        >
          {visible ? <EyeClosedIcon /> : <EyeOpenIcon />}
        </button>
      </div>
    </Field>
  )
}

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
  const [universities, setUniversities] = useState(FALLBACK_UNIVERSITIES)
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
  const isStudent = registerForm.role === 'student'

  useEffect(() => {
    let cancelled = false
    async function loadUniversities() {
      try {
        const items = await fetchPublicUniversities()
        if (cancelled || !items.length) return
        const active = items
          .filter((u) => u.active !== false)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.name).localeCompare(String(b.name)))
        setUniversities(
          active.map((u) => ({
            id: u.id,
            code: u.code || u.name,
            name: u.name || u.code,
          })),
        )
      } catch {
        /* keep fallback list */
      }
    }
    loadUniversities()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (registerForm.role === 'landlord') {
      setRegisterForm((p) => ({ ...p, university: 'None' }))
      setSignupUniversityChoice('')
      setCustomUniversity('')
    }
  }, [registerForm.role])

  const universityOptions = useMemo(
    () => [
      { value: '', label: 'Select university', disabled: true },
      ...universities.map((u) => ({
        value: u.code,
        label: u.name !== u.code ? `${u.name} (${u.code})` : u.name,
      })),
      { value: '__other__', label: 'Other' },
    ],
    [universities],
  )

  async function submitRegister(event) {
    event.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    setAuthMessage('')
    try {
      const universityValue = isStudent
        ? signupUniversityChoice === '__other__'
          ? customUniversity.trim()
          : registerForm.university
        : 'None'
      const raceValue = signupRaceChoice === '__other__' ? customRace.trim() : registerForm.race
      const religionValue = signupReligionChoice === '__other__' ? customReligion.trim() : registerForm.religion
      const selectedUni = universities.find((u) => u.code === signupUniversityChoice)

      if (isStudent && !universityValue) {
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
          universityId: isStudent && selectedUni?.id ? selectedUni.id : null,
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
      setAuthMessage(data.message || 'Registration successful. Please verify your email.')
      navigate('/login?registered=1')
    } catch (e) {
      setAuthError(e.message || 'Unable to register.')
    } finally {
      setAuthLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#F7FAFC] to-[#EDF2F7] font-sans text-[#2D3748]">
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
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
                Create Account <span aria-hidden="true">✨</span>
              </h1>
              <p className="mt-2 text-sm text-[#A0AEC0]">Enter your details below to get started</p>
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

            <form className="space-y-8" onSubmit={submitRegister}>
              <Section title="Personal Information">
                <Field label="Full Name">
                  <input
                    type="text"
                    className={inputClass}
                    value={registerForm.fullName}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, fullName: e.target.value }))}
                    autoComplete="name"
                    required
                  />
                </Field>
                <Field label="IC Number">
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="123456-78-9010"
                    pattern={icPattern}
                    title="Use format 123456-78-9010"
                    value={registerForm.icNumber}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, icNumber: e.target.value }))}
                    required
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    className={inputClass}
                    placeholder="you@example.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
                    autoComplete="email"
                    required
                  />
                </Field>
                <Field label="Phone Number">
                  <div className="flex overflow-hidden rounded-lg border border-[#E2E8F0] focus-within:border-[#E88D5B] focus-within:ring-2 focus-within:ring-[#E88D5B]">
                    <span className="flex shrink-0 items-center gap-1.5 border-r border-[#E2E8F0] bg-[#F7FAFC] px-3 text-sm text-[#4A5568]">
                      <img src="/malaysia-flag.png" alt="" className="h-4 w-6 object-cover" aria-hidden="true" />
                      +60
                    </span>
                    <input
                      type="tel"
                      className="w-full border-0 bg-white p-3 text-sm text-[#2D3748] outline-none placeholder:text-[#A0AEC0]"
                      placeholder="12-3456789"
                      pattern={phonePattern}
                      title="Use format 12-3456789"
                      value={registerForm.phoneNumber}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                      required
                    />
                  </div>
                </Field>
              </Section>

              <Section title="Academic Information">
                <Field label="Role">
                  <select
                    className={selectClass}
                    value={registerForm.role}
                    onChange={(e) => {
                      const role = e.target.value
                      setRegisterForm((p) => ({
                        ...p,
                        role,
                        university: role === 'landlord' ? 'None' : p.university === 'None' ? '' : p.university,
                      }))
                    }}
                    required
                  >
                    <option value="student">Student</option>
                    <option value="landlord">Landlord</option>
                  </select>
                </Field>

                <Field label="University">
                  {isStudent ? (
                    <>
                      <select
                        className={selectClass}
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
                        {universityOptions.map((o) => (
                          <option key={o.value || 'placeholder'} value={o.value} disabled={o.disabled}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {signupUniversityChoice === '__other__' ? (
                        <input
                          type="text"
                          className={`${inputClass} mt-2`}
                          placeholder="Type university name"
                          value={customUniversity}
                          onChange={(e) => setCustomUniversity(e.target.value)}
                          required
                        />
                      ) : null}
                    </>
                  ) : (
                    <select className={selectClass} value="None" disabled aria-label="University not applicable for landlord">
                      <option value="None">Not applicable (landlord)</option>
                    </select>
                  )}
                </Field>

                <Field label="Race">
                  <select
                    className={selectClass}
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
                    <input
                      type="text"
                      className={`${inputClass} mt-2`}
                      placeholder="Type your race"
                      value={customRace}
                      onChange={(e) => setCustomRace(e.target.value)}
                      required
                    />
                  ) : null}
                </Field>

                <Field label="Religion">
                  <select
                    className={selectClass}
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
                    <input
                      type="text"
                      className={`${inputClass} mt-2`}
                      placeholder="Type your religion"
                      value={customReligion}
                      onChange={(e) => setCustomReligion(e.target.value)}
                      required
                    />
                  ) : null}
                </Field>
              </Section>

              <Section title="Security">
                <PasswordField
                  label="Password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
                  visible={showSignupPassword}
                  onToggleVisible={() => setShowSignupPassword((prev) => !prev)}
                />
                <PasswordField
                  label="Confirm Password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  visible={showSignupConfirmPassword}
                  onToggleVisible={() => setShowSignupConfirmPassword((prev) => !prev)}
                />
              </Section>

              <button
                type="submit"
                disabled={authLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E88D5B] py-3 text-sm font-semibold text-white transition hover:bg-[#D97747] disabled:opacity-50"
              >
                <span aria-hidden="true">✅</span>
                {authLoading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#4A5568]">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-[#E88D5B] hover:text-[#D97747]">
                Sign In →
              </Link>
            </p>

            <p className="mt-6 text-center text-xs text-[#A0AEC0]">
              By signing up, you agree to our Terms of Service &amp; Privacy Policy.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-[#A0AEC0]">© 2026 MySewa. All rights reserved.</p>
        </div>
      </main>
    </div>
  )
}
