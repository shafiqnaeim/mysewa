import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LandlordLayout from '../components/LandlordLayout'
import { useLandlordGuard } from '../hooks/useLandlordGuard'
import { useToast } from '../context/ToastContext'
import {
  deriveBirthDateIsoFromNric,
  deriveBirthStateFromNric,
  deriveGenderFromNric,
} from '../utils/malaysianNric'
import { computeUploadProgress, readVerificationDocs } from '../utils/landlordVerificationStorage'
import LandlordAccount from './dashboard/LandlordAccount'

const LS_AVATAR = (id) => `mysewa_landlord_avatar_${id}`
const LS_PREFS = (id) => `mysewa_landlord_prefs_${id}`
const LS_LAST_LOGIN = (id) => `mysewa_landlord_last_login_${id}`

const COUNTRIES = ['Malaysia', 'Singapore', 'Indonesia', 'Brunei', 'Thailand', 'Bangladesh', 'India', 'Other']

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

function formatLoginDisplay(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('en-MY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return ''
  }
}

function maskIc(ic) {
  const d = String(ic).replace(/\D/g, '')
  if (d.length === 12) {
    return `${d.slice(0, 6)}-${d.slice(6, 8)}-${d.slice(8)}`
  }
  const s = String(ic).trim()
  if (!s) return '—'
  if (s.length <= 4) return '••••'
  return `${'•'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`
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
    if (!raw) {
      return { notify: true, twoFactor: false, language: 'en', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' }
    }
    const p = JSON.parse(raw)
    return {
      notify: p.notify !== false,
      twoFactor: Boolean(p.twoFactor),
      language: p.language || 'en',
      currency: p.currency || 'MYR',
      timezone: p.timezone || 'Asia/Kuala_Lumpur',
    }
  } catch {
    return { notify: true, twoFactor: false, language: 'en', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' }
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
}

function computeProfileCompleteness({ user, firstName, lastName, phone, avatarDataUrl, verificationState }) {
  const checks = [
    Boolean(firstName.trim() && lastName.trim()),
    Boolean(user?.email),
    Boolean(phone.trim()),
    Boolean(user?.icNumber),
    Boolean(avatarDataUrl),
    verificationState === 'verified',
  ]
  const done = checks.filter(Boolean).length
  return Math.round((done / checks.length) * 100)
}

function getProfileMissingHint({ firstName, lastName, phone, avatarDataUrl, verificationState }) {
  const missing = []
  if (!firstName.trim() || !lastName.trim()) missing.push('name')
  if (!phone.trim()) missing.push('phone number')
  if (!avatarDataUrl) missing.push('profile photo')
  if (verificationState !== 'verified') missing.push('identity verification')
  if (!missing.length) return 'Your profile looks complete.'
  return `Complete your profile to get more bookings — add your ${missing.join(', ')}.`
}

export default function LandlordMyAccountPage() {
  const navigate = useNavigate()
  const { user, loading, error, reloadUser } = useLandlordGuard()
  const { pushToast } = useToast()
  const avatarInputRef = useRef(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('Malaysia')
  const [savedFlash, setSavedFlash] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [avatarDataUrl, setAvatarDataUrl] = useState('')
  const [notifyEnabled, setNotifyEnabled] = useState(true)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [language, setLanguage] = useState('en')
  const [currency, setCurrency] = useState('MYR')
  const [timezone, setTimezone] = useState('Asia/Kuala_Lumpur')
  const [lastLoginDisplay, setLastLoginDisplay] = useState('')
  const [activeTab, setActiveTab] = useState('profile')
  const [verifyDocs, setVerifyDocs] = useState({ icUrl: '', grantUrl: '', selfieUrl: '', submittedAt: null })

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

  const displayName = useMemo(() => {
    const full = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
    return full || user?.fullName || 'Landlord'
  }, [firstName, lastName, user?.fullName])

  const displayInitials = useMemo(() => {
    const f = firstName.trim()
    const l = lastName.trim()
    if (f && l) return (f[0] + l[0]).toUpperCase()
    if (f) return f.slice(0, 2).toUpperCase()
    return user?.fullName ? splitFullName(user.fullName).first.slice(0, 2).toUpperCase() : 'U'
  }, [firstName, lastName, user?.fullName])

  const { steps: verificationProgressSteps, percent: verificationProgressPercent } = useMemo(
    () =>
      computeUploadProgress({
        icUrl: verifyDocs.icUrl,
        grantUrl: verifyDocs.grantUrl,
        selfieUrl: verifyDocs.selfieUrl,
        submittedAt: verifyDocs.submittedAt,
      }),
    [verifyDocs],
  )

  const profileCompleteness = useMemo(
    () =>
      computeProfileCompleteness({
        user,
        firstName,
        lastName,
        phone,
        avatarDataUrl,
        verificationState,
      }),
    [user, firstName, lastName, phone, avatarDataUrl, verificationState],
  )

  const profileMissingHint = useMemo(
    () =>
      getProfileMissingHint({
        firstName,
        lastName,
        phone,
        avatarDataUrl,
        verificationState,
      }),
    [firstName, lastName, phone, avatarDataUrl, verificationState],
  )

  useEffect(() => {
    if (!user?.id) return
    resetFormFromUser(user, { setFirstName, setLastName, setPhone, setCountry })
    try {
      setAvatarDataUrl(localStorage.getItem(LS_AVATAR(user.id)) ?? '')
      const prefs = readPrefs(user.id)
      setNotifyEnabled(prefs.notify)
      setTwoFactorEnabled(prefs.twoFactor)
      setLanguage(prefs.language)
      setCurrency(prefs.currency)
      setTimezone(prefs.timezone)

      const storedLogin = localStorage.getItem(LS_LAST_LOGIN(user.id))
      const now = new Date().toISOString()
      if (storedLogin) {
        setLastLoginDisplay(formatLoginDisplay(storedLogin))
      }
      localStorage.setItem(LS_LAST_LOGIN(user.id), now)

      const docs = readVerificationDocs(user.id)
      setVerifyDocs({
        icUrl: docs.icUrl,
        grantUrl: docs.grantUrl,
        selfieUrl: docs.selfieUrl,
        submittedAt: docs.submittedAt,
      })
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
    persistPrefs({ notify: value, twoFactor: twoFactorEnabled, language, currency, timezone })
  }

  function handleTwoFactorChange(value) {
    setTwoFactorEnabled(value)
    persistPrefs({ notify: notifyEnabled, twoFactor: value, language, currency, timezone })
  }

  function handleLanguageChange(value) {
    setLanguage(value)
    persistPrefs({ notify: notifyEnabled, twoFactor: twoFactorEnabled, language: value, currency, timezone })
  }

  function handleCurrencyChange(value) {
    setCurrency(value)
    persistPrefs({ notify: notifyEnabled, twoFactor: twoFactorEnabled, language, currency: value, timezone })
  }

  function handleTimezoneChange(value) {
    setTimezone(value)
    persistPrefs({ notify: notifyEnabled, twoFactor: twoFactorEnabled, language, currency, timezone: value })
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
      const res = await fetch('/api/v1/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName,
          phoneNumber: phone.trim() || null,
          country: countryVal,
        }),
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
    resetFormFromUser(user, { setFirstName, setLastName, setPhone, setCountry })
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
      <LandlordLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA]">
          <p className="text-sm text-[#4A5568]">Loading your account…</p>
        </div>
      </LandlordLayout>
    )
  }

  if (error) {
    return (
      <LandlordLayout>
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Error: {error}
          </div>
        </div>
      </LandlordLayout>
    )
  }

  if (!user) {
    return (
      <LandlordLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA]">
          <p className="text-sm text-[#4A5568]">No account loaded.</p>
        </div>
      </LandlordLayout>
    )
  }

  return (
    <LandlordLayout>
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={onAvatarSelected}
      />
      <LandlordAccount
        user={user}
        displayName={displayName}
        displayInitials={displayInitials}
        avatarDataUrl={avatarDataUrl}
        verifiedEmail={verifiedEmail}
        verificationState={verificationState}
        verificationLabel={VERIFICATION_STATE_LABEL[verificationState] || 'Pending'}
        firstName={firstName}
        lastName={lastName}
        phone={phone}
        icDisplay={user.icNumber ? maskIc(user.icNumber) : '—'}
        country={country}
        countries={COUNTRIES}
        hasMalaysianIc={hasMalaysianIc}
        dobDisplay={dobFromIcIso ? formatDobDdMmYyyy(dobFromIcIso) : '—'}
        genderDisplay={genderFromIc ?? '—'}
        stateDisplay={stateFromIc ?? '—'}
        raceDisplay={user.race?.trim() ? user.race : '—'}
        profileSaving={profileSaving}
        savedFlash={savedFlash}
        notifyEnabled={notifyEnabled}
        twoFactorEnabled={twoFactorEnabled}
        language={language}
        currency={currency}
        timezone={timezone}
        lastLoginDisplay={lastLoginDisplay}
        profileCompleteness={profileCompleteness}
        profileMissingHint={profileMissingHint}
        verificationProgressSteps={verificationState === 'verified' ? 4 : verificationProgressSteps}
        verificationProgressPercent={verificationState === 'verified' ? 100 : verificationProgressPercent}
        icUploaded={Boolean(verifyDocs.icUrl)}
        grantUploaded={Boolean(verifyDocs.grantUrl)}
        selfieUploaded={Boolean(verifyDocs.selfieUrl)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAvatarClick={() => avatarInputRef.current?.click()}
        onFirstNameChange={setFirstName}
        onLastNameChange={setLastName}
        onPhoneChange={setPhone}
        onCountryChange={setCountry}
        onNotifyChange={handleNotifyChange}
        onTwoFactorChange={handleTwoFactorChange}
        onLanguageChange={handleLanguageChange}
        onCurrencyChange={handleCurrencyChange}
        onTimezoneChange={handleTimezoneChange}
        onSaveProfile={saveProfile}
        onCancelProfile={handleCancelProfile}
        onCompleteVerification={() => navigate('/dashboard/landlord/verification')}
        onUploadDocuments={() => navigate('/dashboard/landlord/verification')}
        onCompleteProfile={() => setActiveTab('profile')}
        onChangePassword={() => navigate('/reset-password')}
      />
    </LandlordLayout>
  )
}
