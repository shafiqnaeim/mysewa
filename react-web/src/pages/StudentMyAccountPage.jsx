import { useEffect, useMemo, useRef, useState } from 'react'
import DashboardShell from '../components/DashboardShell'
import StudentAccountSiteFooter from '../components/StudentAccountSiteFooter'
import { useStudentGuard } from '../hooks/useStudentGuard'
import { useToast } from '../context/ToastContext'
import {
  deriveBirthDateIsoFromNric,
  deriveBirthStateFromNric,
  deriveGenderFromNric,
} from '../utils/malaysianNric'
import { getUniversityDisplayName } from '../utils/universityDisplayName'

const LS_AVATAR = (id) => `mysewa_student_avatar_${id}`
const LS_VERIFY_IC = (id) => `mysewa_student_verify_ic_${id}`
const LS_VERIFY_MATRIC = (id) => `mysewa_student_verify_matric_${id}`
const LS_VERIFY_SELFIE = (id) => `mysewa_student_verify_selfie_${id}`

const COUNTRIES = ['Malaysia', 'Singapore', 'Indonesia', 'Brunei', 'Thailand', 'Bangladesh', 'India', 'Other']

const ACADEMIC_YEAR_OPTIONS = [
  'Year 1',
  'Year 2',
  'Year 3',
  'Year 4',
  'Year 5',
  'Year 6',
  'Year 7',
  'Year 8',
]

function splitFullName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return { first: '', last: '' }
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

function formatDobDdMmYyyy(iso) {
  if (!iso) return '—'
  try {
    const [y, m, day] = iso.split('-')
    if (!y || !m || !day) return iso
    return `${day.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
  } catch {
    return iso
  }
}

/** Maps API `documentVerificationStatus` to pending | verified | rejected. */
function getVerificationState(raw) {
  const s = String(raw || '').trim()
  if (!s) return 'pending'
  const u = s.toUpperCase()
  if (u.includes('VERIF') && !u.includes('UNVER')) return 'verified'
  if (u.includes('REJECT') || u.includes('FAIL') || u.includes('INVALID')) return 'rejected'
  return 'pending'
}

const VERIFICATION_STATE_LABEL = {
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
}

function VerificationStateOrb({ state }) {
  const label = VERIFICATION_STATE_LABEL[state] || 'Pending'
  return (
    <div className={`student-account-status-wrap student-account-status-wrap--${state}`}>
      <div
        className={`student-account-status-orb student-account-status-orb--${state}`}
        role="img"
        aria-label={`Verification status: ${label}`}
      >
        {state === 'pending' ? (
          <svg className="student-account-status-orb-svg" viewBox="0 0 48 48" width="72" height="72" aria-hidden="true">
            <circle cx="24" cy="24" r="22" fill="#9ca3af" />
            <rect x="14" y="21.5" width="20" height="5" rx="1.25" fill="#ffffff" />
          </svg>
        ) : null}
        {state === 'verified' ? (
          <svg className="student-account-status-orb-svg" viewBox="0 0 48 48" width="72" height="72" aria-hidden="true">
            <circle cx="24" cy="24" r="19.5" fill="none" stroke="#22c55e" strokeWidth="3" />
            <path
              fill="none"
              stroke="#22c55e"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.5 24.5l7 7 15-15"
            />
          </svg>
        ) : null}
        {state === 'rejected' ? (
          <svg className="student-account-status-orb-svg" viewBox="0 0 48 48" width="72" height="72" aria-hidden="true">
            <circle cx="24" cy="24" r="22" fill="#ef4444" />
            <path
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              d="M17 17l14 14M31 17L17 31"
            />
          </svg>
        ) : null}
      </div>
      <p className="student-account-status-caption">{label}</p>
    </div>
  )
}

export default function StudentMyAccountPage() {
  const { user, loading, error, reloadUser } = useStudentGuard()
  const { pushToast } = useToast()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [country, setCountry] = useState('Malaysia')
  const [programStudy, setProgramStudy] = useState('')
  const [academicYear, setAcademicYear] = useState('Year 1')
  const [savedFlash, setSavedFlash] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [avatarDataUrl, setAvatarDataUrl] = useState('')
  const avatarInputRef = useRef(null)
  const [verifyIcUrl, setVerifyIcUrl] = useState('')
  const [verifyMatricUrl, setVerifyMatricUrl] = useState('')
  const [verifySelfieUrl, setVerifySelfieUrl] = useState('')
  const verifyIcInputRef = useRef(null)
  const verifyMatricInputRef = useRef(null)
  const verifySelfieInputRef = useRef(null)

  const verifiedEmail = Boolean(user?.isVerified ?? user?.verified)

  const dobFromIcIso = useMemo(() => deriveBirthDateIsoFromNric(user?.icNumber), [user?.icNumber])
  const genderFromIc = useMemo(() => deriveGenderFromNric(user?.icNumber), [user?.icNumber])
  const stateFromIc = useMemo(() => deriveBirthStateFromNric(user?.icNumber), [user?.icNumber])

  const hasMalaysianIc = useMemo(() => {
    const d = String(user?.icNumber ?? '').replace(/\D/g, '')
    return d.length === 12
  }, [user?.icNumber])

  const verificationState = useMemo(
    () => getVerificationState(user?.documentVerificationStatus),
    [user?.documentVerificationStatus],
  )

  const universityDisplay = useMemo(
    () => getUniversityDisplayName(user?.university),
    [user?.university],
  )

  useEffect(() => {
    if (!user?.id) return
    const split = splitFullName(user.fullName)
    setFirstName(split.first)
    setLastName(split.last)
    const digits = String(user.icNumber ?? '').replace(/\D/g, '')
    if (digits.length === 12) {
      setCountry('Malaysia')
    } else {
      setCountry(user.country && String(user.country).trim() ? String(user.country).trim() : 'Malaysia')
    }
    setProgramStudy(user.programStudy != null ? String(user.programStudy) : '')
    const ay = user.academicYear != null ? String(user.academicYear) : ''
    setAcademicYear(ay && ACADEMIC_YEAR_OPTIONS.includes(ay) ? ay : 'Year 1')
    try {
      setAvatarDataUrl(localStorage.getItem(LS_AVATAR(user.id)) ?? '')
      setVerifyIcUrl(localStorage.getItem(LS_VERIFY_IC(user.id)) ?? '')
      setVerifyMatricUrl(localStorage.getItem(LS_VERIFY_MATRIC(user.id)) ?? '')
      setVerifySelfieUrl(localStorage.getItem(LS_VERIFY_SELFIE(user.id)) ?? '')
    } catch {
      setAvatarDataUrl('')
    }
  }, [user])

  const displayInitials = useMemo(() => {
    const f = firstName.trim()
    const l = lastName.trim()
    if (f && l) return (f[0] + l[0]).toUpperCase()
    if (f) return f.slice(0, 2).toUpperCase()
    return user?.fullName ? splitFullName(user.fullName).first.slice(0, 2).toUpperCase() : 'U'
  }, [firstName, lastName, user?.fullName])

  async function saveProfile(e) {
    e.preventDefault()
    if (!user?.id) return
    const token = localStorage.getItem('mysewa_token')
    if (!token) {
      pushToast({ message: 'Please sign in again.', type: 'error' })
      return
    }
    const f = firstName.trim()
    const l = lastName.trim()
    const fullName = [f, l].filter(Boolean).join(' ').trim()
    if (!fullName) {
      pushToast({ message: 'Please enter at least a first or last name.', type: 'error' })
      return
    }
    setProfileSaving(true)
    try {
      const countryVal = hasMalaysianIc ? 'Malaysia' : country.trim() || null
      const body = {
        fullName,
        phoneNumber: user.phoneNumber || undefined,
        country: countryVal,
        programStudy: programStudy.trim() || null,
        academicYear: academicYear || null,
      }
      const res = await fetch('/api/v1/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not save profile (${res.status})`)
      await reloadUser()
      window.dispatchEvent(new CustomEvent('mysewa-local-profile-saved'))
      pushToast({ message: 'Profile saved to your account.', type: 'success' })
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2800)
    } catch (err) {
      pushToast({ message: err.message || 'Could not save profile.', type: 'error' })
    } finally {
      setProfileSaving(false)
    }
  }

  function onAvatarSelected(e) {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result || '')
      if (!url) return
      try {
        localStorage.setItem(LS_AVATAR(user.id), url)
        setAvatarDataUrl(url)
        window.dispatchEvent(new CustomEvent('mysewa-local-profile-saved'))
      } catch {
        /* quota or disabled */
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function onVerificationImageChosen(slot, e) {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result || '')
      if (!url) return
      try {
        if (slot === 'ic') {
          localStorage.setItem(LS_VERIFY_IC(user.id), url)
          setVerifyIcUrl(url)
        } else if (slot === 'matric') {
          localStorage.setItem(LS_VERIFY_MATRIC(user.id), url)
          setVerifyMatricUrl(url)
        } else {
          localStorage.setItem(LS_VERIFY_SELFIE(user.id), url)
          setVerifySelfieUrl(url)
        }
      } catch {
        /* quota */
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function clearAllVerificationImages() {
    if (!user?.id) return
    try {
      localStorage.removeItem(LS_VERIFY_IC(user.id))
      localStorage.removeItem(LS_VERIFY_MATRIC(user.id))
      localStorage.removeItem(LS_VERIFY_SELFIE(user.id))
      setVerifyIcUrl('')
      setVerifyMatricUrl('')
      setVerifySelfieUrl('')
      if (verifyIcInputRef.current) verifyIcInputRef.current.value = ''
      if (verifyMatricInputRef.current) verifyMatricInputRef.current.value = ''
      if (verifySelfieInputRef.current) verifySelfieInputRef.current.value = ''
    } catch {
      /* ignore */
    }
  }

  return (
    <DashboardShell properties blend>
      <div className="student-account-page-with-footer">
        <div className="student-account-info-layout student-account-page-blend">
        <h1 className="student-account-info-title">Account Information</h1>
        {loading ? <div className="auth-toast">Loading your account…</div> : null}
        {!loading && error ? <div className="auth-toast auth-toast-error">Error: {error}</div> : null}
        {!loading && !error && user ? (
          <>
            <form className="student-account-info-card" onSubmit={saveProfile}>
              <div className="student-account-info-avatar-block">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="visually-hidden"
                  aria-hidden="true"
                  tabIndex={-1}
                  onChange={onAvatarSelected}
                />
                <div className="student-account-info-avatar-wrap">
                  <button
                    type="button"
                    className="student-account-info-avatar-btn"
                    onClick={() => avatarInputRef.current?.click()}
                    aria-label="Choose profile photo from your device"
                  >
                    {avatarDataUrl ? (
                      <img src={avatarDataUrl} alt="" className="student-account-info-avatar-img" />
                    ) : (
                      <span className="student-account-info-avatar-fallback">{displayInitials}</span>
                    )}
                  </button>
                </div>
                <p className="student-account-info-avatar-hint">Click to upload profile picture</p>
              </div>

              <div className="student-account-info-grid">
                <div className="student-account-field-stack">
                  <div className="student-account-field">
                    <div className="student-account-field-label-row">
                      <label className="student-account-field-label" htmlFor="acc-first">
                        First name (Display name)
                      </label>
                    </div>
                    <div className="student-account-field-input-wrap">
                      <input
                        id="acc-first"
                        className="student-account-field-input"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        autoComplete="given-name"
                      />
                      <span className="student-account-field-icon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 20c1.5-4 4-6 8-6s6.5 2 8 6" strokeLinecap="round" />
                        </svg>
                      </span>
                    </div>
                  </div>

                  <div className="student-account-field">
                    <div className="student-account-field-label-row">
                      <label className="student-account-field-label" htmlFor="acc-univ">
                        University
                      </label>
                    </div>
                    <div className="student-account-field-input-wrap student-account-field-input-wrap--readonly student-account-field-input-wrap--univ-multiline">
                      <input
                        id="acc-univ"
                        className="student-account-field-input student-account-field-input--multiline-readonly"
                        value={universityDisplay}
                        readOnly
                        tabIndex={-1}
                        title={universityDisplay}
                      />
                      <span className="student-account-field-icon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" />
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="student-account-field">
                  <div className="student-account-field-label-row">
                    <label className="student-account-field-label" htmlFor="acc-last">
                      Last name
                    </label>
                  </div>
                  <div className="student-account-field-input-wrap">
                    <input
                      id="acc-last"
                      className="student-account-field-input"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                    />
                    <span className="student-account-field-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c1.5-4 4-6 8-6s6.5 2 8 6" strokeLinecap="round" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="student-account-field">
                  <div className="student-account-field-label-row">
                    <label className="student-account-field-label" htmlFor="acc-email">
                      Email
                    </label>
                    {verifiedEmail ? (
                      <span className="student-account-verified">
                        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                          <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                        Verified
                      </span>
                    ) : null}
                  </div>
                  <div className="student-account-field-input-wrap student-account-field-input-wrap--readonly">
                    <input
                      id="acc-email"
                      type="email"
                      className="student-account-field-input"
                      value={user.email || ''}
                      readOnly
                      tabIndex={-1}
                    />
                    <span className="student-account-field-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <path d="M3 7l9 6 9-6" strokeLinecap="round" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="student-account-field">
                  <div className="student-account-field-label-row">
                    <label className="student-account-field-label" htmlFor="acc-phone">
                      Phone number
                    </label>
                    {user.phoneNumber ? (
                      <span className="student-account-verified">
                        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                          <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                        On file
                      </span>
                    ) : null}
                  </div>
                  <div className="student-account-field-input-wrap student-account-field-input-wrap--readonly">
                    <input
                      id="acc-phone"
                      type="tel"
                      className="student-account-field-input"
                      value={user.phoneNumber || ''}
                      readOnly
                      tabIndex={-1}
                    />
                    <span className="student-account-field-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.86.33 1.7.63 2.5a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.58-1.2a2 2 0 0 1 2.11-.45c.8.3 1.64.5 2.5.63A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="student-account-field">
                  <div className="student-account-field-label-row">
                    <label className="student-account-field-label" htmlFor="acc-ic">
                      Identity Card
                    </label>
                  </div>
                  <div className="student-account-field-input-wrap student-account-field-input-wrap--readonly">
                    <input
                      id="acc-ic"
                      className="student-account-field-input"
                      value={user.icNumber ? maskIc(user.icNumber) : ''}
                      readOnly
                      tabIndex={-1}
                    />
                    <span className="student-account-field-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="4" y="5" width="16" height="14" rx="2" />
                        <path d="M8 9h8M8 13h5" strokeLinecap="round" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="student-account-field">
                  <div className="student-account-field-label-row">
                    <label className="student-account-field-label" htmlFor="acc-dob-display">
                      Date of birth
                    </label>
                  </div>
                  <div className="student-account-field-input-wrap student-account-field-input-wrap--readonly">
                    <input
                      id="acc-dob-display"
                      className="student-account-field-input"
                      value={dobFromIcIso ? formatDobDdMmYyyy(dobFromIcIso) : '—'}
                      readOnly
                      tabIndex={-1}
                    />
                    <span className="student-account-field-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="student-account-field">
                  <div className="student-account-field-label-row">
                    <label className="student-account-field-label" htmlFor="acc-gender-display">
                      Gender
                    </label>
                  </div>
                  <div className="student-account-field-input-wrap student-account-field-input-wrap--readonly">
                    <input
                      id="acc-gender-display"
                      className="student-account-field-input"
                      value={genderFromIc ?? '—'}
                      readOnly
                      tabIndex={-1}
                    />
                    <span className="student-account-field-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c1.5-4 4-6 8-6s6.5 2 8 6" strokeLinecap="round" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="student-account-field">
                  <div className="student-account-field-label-row">
                    <label className="student-account-field-label" htmlFor="acc-state-display">
                      State
                    </label>
                  </div>
                  <div className="student-account-field-input-wrap student-account-field-input-wrap--readonly">
                    <input
                      id="acc-state-display"
                      className="student-account-field-input"
                      value={stateFromIc ?? '—'}
                      readOnly
                      tabIndex={-1}
                    />
                    <span className="student-account-field-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" strokeLinecap="round" />
                        <circle cx="12" cy="10" r="2.5" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="student-account-field student-account-field--full">
                  <div className="student-account-field-label-row">
                    <label className="student-account-field-label" htmlFor="acc-country">
                      Country
                    </label>
                  </div>
                  {hasMalaysianIc ? (
                    <div className="student-account-field-input-wrap student-account-field-input-wrap--readonly">
                      <input
                        id="acc-country"
                        className="student-account-field-input"
                        value="Malaysia"
                        readOnly
                        tabIndex={-1}
                      />
                      <span className="student-account-field-icon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
                        </svg>
                      </span>
                    </div>
                  ) : (
                    <div className="student-account-field-input-wrap student-account-field-select-wrap">
                      <select
                        id="acc-country"
                        className="student-account-field-input student-account-field-select"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <span className="student-account-field-icon student-account-field-chevron" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 9l6 6 6-6" strokeLinecap="round" />
                        </svg>
                      </span>
                    </div>
                  )}
                </div>

                <div className="student-account-field">
                  <div className="student-account-field-label-row">
                    <label className="student-account-field-label" htmlFor="acc-race-display">
                      Race
                    </label>
                  </div>
                  <div className="student-account-field-input-wrap student-account-field-input-wrap--readonly">
                    <input
                      id="acc-race-display"
                      className="student-account-field-input"
                      value={user.race?.trim() ? user.race : '—'}
                      readOnly
                      tabIndex={-1}
                    />
                    <span className="student-account-field-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c1.5-4 4-6 8-6s6.5 2 8 6" strokeLinecap="round" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="student-account-field">
                  <div className="student-account-field-label-row">
                    <label className="student-account-field-label" htmlFor="acc-religion-display">
                      Religion
                    </label>
                  </div>
                  <div className="student-account-field-input-wrap student-account-field-input-wrap--readonly">
                    <input
                      id="acc-religion-display"
                      className="student-account-field-input"
                      value={user.religion?.trim() ? user.religion : '—'}
                      readOnly
                      tabIndex={-1}
                    />
                    <span className="student-account-field-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c1.5-4 4-6 8-6s6.5 2 8 6" strokeLinecap="round" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="student-account-field">
                  <div className="student-account-field-label-row">
                    <label className="student-account-field-label" htmlFor="acc-program">
                      Programme of study
                    </label>
                  </div>
                  <div className="student-account-field-input-wrap">
                    <input
                      id="acc-program"
                      className="student-account-field-input"
                      value={programStudy}
                      onChange={(e) => setProgramStudy(e.target.value)}
                      placeholder="e.g. Bachelor of Computer Science"
                      autoComplete="off"
                    />
                    <span className="student-account-field-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="student-account-field">
                  <div className="student-account-field-label-row">
                    <label className="student-account-field-label" htmlFor="acc-academic-year">
                      Current academic year
                    </label>
                  </div>
                  <div className="student-account-field-input-wrap student-account-field-select-wrap">
                    <select
                      id="acc-academic-year"
                      className="student-account-field-input student-account-field-select"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                    >
                      {ACADEMIC_YEAR_OPTIONS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    <span className="student-account-field-icon student-account-field-chevron" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" />
                      </svg>
                    </span>
                  </div>
                </div>

              </div>

              <div className="student-account-info-actions">
                {savedFlash ? (
                  <p className="student-account-inline-toast" role="status">
                    Profile saved — stored on the server.
                  </p>
                ) : null}
                <div className="student-account-info-buttons">
                  <button type="submit" className="student-account-btn-primary" disabled={profileSaving}>
                    {profileSaving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            </form>

            <section className="student-account-verify-section" aria-labelledby="account-verify-heading">
              <h2 id="account-verify-heading" className="student-account-verify-heading">
                Account Verification
              </h2>
              <div className="student-account-verify-identity" role="status">
                <VerificationStateOrb state={verificationState} />
              </div>
              <p className="student-account-verify-lead">
                Students need to upload three files according as below to confirm your identity. Uploads are reviewed by
                the MySewa system.
              </p>
              <div className="student-account-verify-grid">
                <div className="student-account-verify-card">
                  <input
                    ref={verifyIcInputRef}
                    type="file"
                    accept="image/*"
                    className="visually-hidden"
                    aria-hidden="true"
                    tabIndex={-1}
                    onChange={(e) => onVerificationImageChosen('ic', e)}
                  />
                  <button
                    type="button"
                    className="student-account-verify-placeholder student-account-verify-placeholder--interactive"
                    onClick={() => verifyIcInputRef.current?.click()}
                    aria-label="Choose Identity Card photo"
                  >
                    {verifyIcUrl ? (
                      <img src={verifyIcUrl} alt="" className="student-account-verify-preview-img" />
                    ) : (
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <rect x="4" y="5" width="16" height="14" rx="2" />
                        <circle cx="12" cy="10" r="2.5" />
                        <path d="M8 17c1.2-2 3.4-3 4-3s2.8 1 4 3" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                  <p className="student-account-verify-card-title">Identity Card</p>
                  <p className="student-account-verify-card-hint">Photo of the front of your Identity Card.</p>
                  <button
                    type="button"
                    className="student-account-verify-btn student-account-verify-btn--active"
                    onClick={() => verifyIcInputRef.current?.click()}
                  >
                    {verifyIcUrl ? 'Replace image' : 'Choose file'}
                  </button>
                </div>
                <div className="student-account-verify-card">
                  <input
                    ref={verifyMatricInputRef}
                    type="file"
                    accept="image/*"
                    className="visually-hidden"
                    aria-hidden="true"
                    tabIndex={-1}
                    onChange={(e) => onVerificationImageChosen('matric', e)}
                  />
                  <button
                    type="button"
                    className="student-account-verify-placeholder student-account-verify-placeholder--interactive"
                    onClick={() => verifyMatricInputRef.current?.click()}
                    aria-label="Choose University Matric Card photo"
                  >
                    {verifyMatricUrl ? (
                      <img src={verifyMatricUrl} alt="" className="student-account-verify-preview-img" />
                    ) : (
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path d="M7 4h10v16H7z" />
                        <path d="M9 8h6M9 12h6M9 16h4" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                  <p className="student-account-verify-card-title">University Matric Card</p>
                  <p className="student-account-verify-card-hint">Photo of the front of your University Matric Card.</p>
                  <button
                    type="button"
                    className="student-account-verify-btn student-account-verify-btn--active"
                    onClick={() => verifyMatricInputRef.current?.click()}
                  >
                    {verifyMatricUrl ? 'Replace image' : 'Choose file'}
                  </button>
                </div>
                <div className="student-account-verify-card">
                  <input
                    ref={verifySelfieInputRef}
                    type="file"
                    accept="image/*"
                    className="visually-hidden"
                    aria-hidden="true"
                    tabIndex={-1}
                    onChange={(e) => onVerificationImageChosen('selfie', e)}
                  />
                  <button
                    type="button"
                    className="student-account-verify-placeholder student-account-verify-placeholder--interactive"
                    onClick={() => verifySelfieInputRef.current?.click()}
                    aria-label="Choose selfie photo"
                  >
                    {verifySelfieUrl ? (
                      <img src={verifySelfieUrl} alt="" className="student-account-verify-preview-img" />
                    ) : (
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <circle cx="12" cy="9" r="3.5" />
                        <path d="M6 20c1.2-3 3.6-5 6-5s4.8 2 6 5" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                  <p className="student-account-verify-card-title">Selfie</p>
                  <p className="student-account-verify-card-hint">
                    Take a selfie just yourself or selfie with any of the cards
                  </p>
                  <button
                    type="button"
                    className="student-account-verify-btn student-account-verify-btn--active"
                    onClick={() => verifySelfieInputRef.current?.click()}
                  >
                    {verifySelfieUrl ? 'Replace image' : 'Choose file'}
                  </button>
                </div>
                <div className="student-account-verify-clear-row">
                  <button type="button" className="student-account-verify-clear-all-btn" onClick={clearAllVerificationImages}>
                    Clear All Files
                  </button>
                </div>
              </div>
            </section>
          </>
        ) : null}
        </div>
        <StudentAccountSiteFooter />
      </div>
    </DashboardShell>
  )
}

function maskIc(ic) {
  const d = String(ic).replace(/\D/g, '')
  if (d.length === 12) {
    return `••••••-••-${d.slice(-4)}`
  }
  const s = String(ic).trim()
  if (s.length <= 4) return '••••'
  return `${'•'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`
}
