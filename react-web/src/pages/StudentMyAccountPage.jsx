import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudentLayout from '../components/StudentLayout'
import { useStudentGuard } from '../hooks/useStudentGuard'
import { useToast } from '../context/ToastContext'
import {
  deriveBirthDateIsoFromNric,
  deriveBirthStateFromNric,
  deriveGenderFromNric,
} from '../utils/malaysianNric'
import { getUniversityDisplayName } from '../utils/universityDisplayName'
import StudentAccount from './dashboard/StudentAccount'

const LS_AVATAR = (id) => `mysewa_student_avatar_${id}`
const LS_PREFS = (id) => `mysewa_student_prefs_${id}`

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

const VERIFICATION_STATE_LABEL = {
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
}

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

function getVerificationState(raw) {
  const s = String(raw || '').trim()
  if (!s) return 'pending'
  const u = s.toUpperCase()
  if (u.includes('VERIF') && !u.includes('UNVER')) return 'verified'
  if (u.includes('REJECT') || u.includes('FAIL') || u.includes('INVALID')) return 'rejected'
  return 'pending'
}

function readPrefs(userId) {
  try {
    const raw = localStorage.getItem(LS_PREFS(userId))
    if (!raw) return { notify: true, twoFactor: false, language: 'en', currency: 'MYR' }
    const p = JSON.parse(raw)
    return {
      notify: p.notify !== false,
      twoFactor: Boolean(p.twoFactor),
      language: p.language || 'en',
      currency: p.currency || 'MYR',
    }
  } catch {
    return { notify: true, twoFactor: false, language: 'en', currency: 'MYR' }
  }
}

function writePrefs(userId, prefs) {
  try {
    localStorage.setItem(LS_PREFS(userId), JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
}

function resetFormFromUser(user, setters) {
  const split = splitFullName(user.fullName)
  setters.setFirstName(split.first)
  setters.setLastName(split.last)
  setters.setPhone(user.phoneNumber ? String(user.phoneNumber) : '')
  const digits = String(user.icNumber ?? '').replace(/\D/g, '')
  if (digits.length === 12) {
    setters.setCountry('Malaysia')
  } else {
    setters.setCountry(user.country && String(user.country).trim() ? String(user.country).trim() : 'Malaysia')
  }
  setters.setProgramStudy(user.programStudy != null ? String(user.programStudy) : '')
  const ay = user.academicYear != null ? String(user.academicYear) : ''
  setters.setAcademicYear(ay && ACADEMIC_YEAR_OPTIONS.includes(ay) ? ay : 'Year 1')
}

export default function StudentMyAccountPage() {
  const navigate = useNavigate()
  const { user, loading, error, reloadUser } = useStudentGuard()
  const { pushToast } = useToast()
  const avatarInputRef = useRef(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('Malaysia')
  const [programStudy, setProgramStudy] = useState('')
  const [academicYear, setAcademicYear] = useState('Year 1')
  const [savedFlash, setSavedFlash] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [avatarDataUrl, setAvatarDataUrl] = useState('')
  const [notifyEnabled, setNotifyEnabled] = useState(true)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [language, setLanguage] = useState('en')
  const [currency, setCurrency] = useState('MYR')

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

  const displayName = useMemo(() => {
    const full = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
    return full || user?.fullName || 'Student'
  }, [firstName, lastName, user?.fullName])

  const displayInitials = useMemo(() => {
    const f = firstName.trim()
    const l = lastName.trim()
    if (f && l) return (f[0] + l[0]).toUpperCase()
    if (f) return f.slice(0, 2).toUpperCase()
    return user?.fullName ? splitFullName(user.fullName).first.slice(0, 2).toUpperCase() : 'U'
  }, [firstName, lastName, user?.fullName])

  useEffect(() => {
    if (!user?.id) return
    resetFormFromUser(user, {
      setFirstName,
      setLastName,
      setPhone,
      setCountry,
      setProgramStudy,
      setAcademicYear,
    })
    try {
      setAvatarDataUrl(localStorage.getItem(LS_AVATAR(user.id)) ?? '')
      const prefs = readPrefs(user.id)
      setNotifyEnabled(prefs.notify)
      setTwoFactorEnabled(prefs.twoFactor)
      setLanguage(prefs.language)
      setCurrency(prefs.currency)
    } catch {
      setAvatarDataUrl('')
    }
  }, [user])

  function persistPrefs(next) {
    if (!user?.id) return
    writePrefs(user.id, next)
  }

  function handleNotifyChange(value) {
    setNotifyEnabled(value)
    persistPrefs({ notify: value, twoFactor: twoFactorEnabled, language, currency })
  }

  function handleTwoFactorChange(value) {
    setTwoFactorEnabled(value)
    persistPrefs({ notify: notifyEnabled, twoFactor: value, language, currency })
  }

  function handleLanguageChange(value) {
    setLanguage(value)
    persistPrefs({ notify: notifyEnabled, twoFactor: twoFactorEnabled, language: value, currency })
  }

  function handleCurrencyChange(value) {
    setCurrency(value)
    persistPrefs({ notify: notifyEnabled, twoFactor: twoFactorEnabled, language, currency: value })
  }

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
        phoneNumber: phone.trim() || null,
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

  function handleCancelProfile() {
    if (!user) return
    resetFormFromUser(user, {
      setFirstName,
      setLastName,
      setPhone,
      setCountry,
      setProgramStudy,
      setAcademicYear,
    })
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
        /* quota */
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA]">
          <p className="text-sm text-[#6B7280]">Loading your account…</p>
        </div>
      </StudentLayout>
    )
  }

  if (error) {
    return (
      <StudentLayout>
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Error: {error}
          </div>
        </div>
      </StudentLayout>
    )
  }

  if (!user) {
    return (
      <StudentLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA]">
          <p className="text-sm text-[#6B7280]">No account loaded.</p>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={onAvatarSelected}
      />
      <StudentAccount
        user={user}
        displayName={displayName}
        displayInitials={displayInitials}
        avatarDataUrl={avatarDataUrl}
        universityDisplay={universityDisplay}
        verifiedEmail={verifiedEmail}
        verificationState={verificationState}
        verificationLabel={VERIFICATION_STATE_LABEL[verificationState] || 'Pending'}
        firstName={firstName}
        lastName={lastName}
        phone={phone}
        country={country}
        countries={COUNTRIES}
        programStudy={programStudy}
        academicYear={academicYear}
        academicYearOptions={ACADEMIC_YEAR_OPTIONS}
        hasMalaysianIc={hasMalaysianIc}
        dobDisplay={dobFromIcIso ? formatDobDdMmYyyy(dobFromIcIso) : '—'}
        genderDisplay={genderFromIc ?? '—'}
        stateDisplay={stateFromIc ?? '—'}
        raceDisplay={user.race?.trim() ? user.race : '—'}
        religionDisplay={user.religion?.trim() ? user.religion : '—'}
        profileSaving={profileSaving}
        savedFlash={savedFlash}
        notifyEnabled={notifyEnabled}
        twoFactorEnabled={twoFactorEnabled}
        language={language}
        currency={currency}
        onAvatarClick={() => avatarInputRef.current?.click()}
        onFirstNameChange={setFirstName}
        onLastNameChange={setLastName}
        onPhoneChange={setPhone}
        onCountryChange={setCountry}
        onProgramStudyChange={setProgramStudy}
        onAcademicYearChange={setAcademicYear}
        onNotifyChange={handleNotifyChange}
        onTwoFactorChange={handleTwoFactorChange}
        onLanguageChange={handleLanguageChange}
        onCurrencyChange={handleCurrencyChange}
        onSaveProfile={saveProfile}
        onCancelProfile={handleCancelProfile}
        onCompleteVerification={() => navigate('/dashboard/student/verification')}
        onChangePassword={() => navigate('/reset-password')}
      />
    </StudentLayout>
  )
}
