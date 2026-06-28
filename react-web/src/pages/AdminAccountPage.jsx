import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'
import { useAdminGuard } from '../hooks/useAdminGuard'
import { useToast } from '../context/ToastContext'
import AdminAccount from './dashboard/AdminAccount'

const LS_NICKNAME = (id) => `mysewa_admin_nickname_${id}`
const LS_PREFS = (id) => `mysewa_admin_prefs_${id}`

function readPrefs(userId) {
  try {
    const raw = localStorage.getItem(LS_PREFS(userId))
    if (!raw) {
      return { notify: true, twoFactor: false, language: 'en', timezone: 'Asia/Kuala_Lumpur' }
    }
    const p = JSON.parse(raw)
    return {
      notify: p.notify !== false,
      twoFactor: Boolean(p.twoFactor),
      language: p.language || 'en',
      timezone: p.timezone || 'Asia/Kuala_Lumpur',
    }
  } catch {
    return { notify: true, twoFactor: false, language: 'en', timezone: 'Asia/Kuala_Lumpur' }
  }
}

function writePrefs(userId, prefs) {
  try {
    localStorage.setItem(LS_PREFS(userId), JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
}

function initialsFromName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return 'AD'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export default function AdminAccountPage() {
  const navigate = useNavigate()
  const { user, loading, error, reloadUser } = useAdminGuard()
  const { pushToast } = useToast()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [notifyEnabled, setNotifyEnabled] = useState(true)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [language, setLanguage] = useState('en')
  const [timezone, setTimezone] = useState('Asia/Kuala_Lumpur')

  useEffect(() => {
    if (!user?.id) return
    const storedNickname = (() => {
      try {
        return localStorage.getItem(LS_NICKNAME(user.id)) || ''
      } catch {
        return ''
      }
    })()
    setFullName(storedNickname || user.fullName || 'System Administrator')
    setPhone(user.phoneNumber ? String(user.phoneNumber) : '')
    const prefs = readPrefs(user.id)
    setNotifyEnabled(prefs.notify)
    setTwoFactorEnabled(prefs.twoFactor)
    setLanguage(prefs.language)
    setTimezone(prefs.timezone)
  }, [user])

  const verifiedEmail = Boolean(user?.isVerified ?? user?.verified)

  const displayName = useMemo(() => {
    if (!user) return 'System Administrator'
    try {
      const nick = localStorage.getItem(LS_NICKNAME(user.id))
      if (nick?.trim()) return nick.trim()
    } catch {
      /* ignore */
    }
    return user.fullName?.trim() || 'System Administrator'
  }, [user, fullName])

  const displayInitials = useMemo(() => initialsFromName(displayName), [displayName])

  function persistPrefs(next) {
    if (!user?.id) return
    writePrefs(user.id, next)
  }

  function handleNotifyChange(value) {
    setNotifyEnabled(value)
    persistPrefs({ notify: value, twoFactor: twoFactorEnabled, language, timezone })
  }

  function handleTwoFactorChange(value) {
    setTwoFactorEnabled(value)
    persistPrefs({ notify: notifyEnabled, twoFactor: value, language, timezone })
  }

  function handleLanguageChange(value) {
    setLanguage(value)
    persistPrefs({ notify: notifyEnabled, twoFactor: twoFactorEnabled, language: value, timezone })
  }

  function handleTimezoneChange(value) {
    setTimezone(value)
    persistPrefs({ notify: notifyEnabled, twoFactor: twoFactorEnabled, language, timezone: value })
  }

  async function saveProfile(e) {
    e.preventDefault()
    if (!user?.id) return
    const token = localStorage.getItem('mysewa_token')
    if (!token) {
      pushToast({ message: 'Please sign in again.', type: 'error' })
      return
    }
    const name = fullName.trim()
    if (!name) {
      pushToast({ message: 'Please enter your full name.', type: 'error' })
      return
    }
    setProfileSaving(true)
    try {
      const res = await fetch('/api/v1/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: name,
          phoneNumber: phone.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not save profile (${res.status})`)
      try {
        localStorage.setItem(LS_NICKNAME(user.id), name)
      } catch {
        /* quota */
      }
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

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA]">
          <p className="text-sm text-[#6B7280]">Verifying privileges…</p>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA]">
          <p className="text-sm text-[#DC2626]">{error}</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <AdminAccount
        displayName={displayName}
        displayInitials={displayInitials}
        user={user}
        verifiedEmail={verifiedEmail}
        fullName={fullName}
        phone={phone}
        profileSaving={profileSaving}
        savedFlash={savedFlash}
        notifyEnabled={notifyEnabled}
        twoFactorEnabled={twoFactorEnabled}
        language={language}
        timezone={timezone}
        onFullNameChange={setFullName}
        onPhoneChange={setPhone}
        onNotifyChange={handleNotifyChange}
        onTwoFactorChange={handleTwoFactorChange}
        onLanguageChange={handleLanguageChange}
        onTimezoneChange={handleTimezoneChange}
        onSaveProfile={saveProfile}
        onChangePassword={() => navigate('/reset-password')}
      />
    </AdminLayout>
  )
}
