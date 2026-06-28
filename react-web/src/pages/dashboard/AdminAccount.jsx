import { useState } from 'react'

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'security', label: 'Security' },
  { key: 'preferences', label: 'Preferences' },
]

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kuala_Lumpur', label: 'Malaysia (GMT+8)' },
  { value: 'Asia/Singapore', label: 'Singapore (GMT+8)' },
  { value: 'Asia/Jakarta', label: 'Indonesia — Jakarta (GMT+7)' },
  { value: 'Asia/Bangkok', label: 'Thailand (GMT+7)' },
  { value: 'Asia/Dhaka', label: 'Bangladesh (GMT+6)' },
  { value: 'UTC', label: 'UTC' },
]

const ACCENT = '#DC2626'

function Field({ label, children, hint }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-[#4B5563]">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-[#6B7280]">{hint}</span> : null}
    </label>
  )
}

const inputClass =
  'w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#1A1A2E] outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 disabled:bg-[#F9FAFB] disabled:text-[#6B7280]'

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] px-4 py-3">
      <div>
        <p className="text-sm font-medium text-[#1A1A2E]">{label}</p>
        {description ? <p className="text-xs text-[#6B7280]">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative h-6 w-11 shrink-0 rounded-full transition"
        style={{ backgroundColor: checked ? ACCENT : '#D1D5DB' }}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  )
}

export default function AdminAccount({
  displayName,
  displayInitials,
  user,
  verifiedEmail,
  fullName,
  phone,
  profileSaving,
  savedFlash,
  notifyEnabled,
  twoFactorEnabled,
  language,
  timezone,
  onFullNameChange,
  onPhoneChange,
  onNotifyChange,
  onTwoFactorChange,
  onLanguageChange,
  onTimezoneChange,
  onSaveProfile,
  onChangePassword,
}) {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
              <span aria-hidden="true">👤 </span>
              My Account
            </h1>
            <p className="mt-2 text-sm text-[#6B7280]">Manage your profile and preferences</p>
          </div>
          <span className="inline-flex w-fit shrink-0 rounded-full bg-[#FEE2E2] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#DC2626]">
            Admin
          </span>
        </header>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white ring-4 ring-[#FEE2E2]"
              style={{ backgroundColor: ACCENT }}
              aria-hidden="true"
            >
              {displayInitials}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-[#1A1A2E]">{displayName}</h2>
              <p className="mt-2 text-sm text-[#4B5563]">
                {user?.email || '—'}
                {verifiedEmail ? (
                  <span className="ml-2 font-semibold text-[#10B981]">
                    <span aria-hidden="true">✅ </span>
                    Verified
                  </span>
                ) : null}
              </p>
              <span className="mt-3 inline-flex rounded-full bg-[#FEE2E2] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#DC2626]">
                Admin
              </span>
            </div>
          </div>
        </section>

        <div>
          <div className="-mb-px flex gap-1 overflow-x-auto border-b border-[#E2E8F0] pb-px" role="tablist">
            {TABS.map((tab) => {
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
                    active ? 'bg-[#DC2626] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="rounded-b-xl rounded-tr-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            {activeTab === 'profile' ? (
              <form className="space-y-6" onSubmit={onSaveProfile}>
                <Field label="Full Name">
                  <input
                    className={inputClass}
                    value={fullName}
                    onChange={(e) => onFullNameChange(e.target.value)}
                    autoComplete="name"
                    placeholder="System Administrator"
                  />
                </Field>
                <Field label="Email" hint="Contact support to change your login email.">
                  <input className={inputClass} type="email" value={user?.email || ''} readOnly disabled />
                </Field>
                <Field label="Phone">
                  <input
                    type="tel"
                    className={inputClass}
                    value={phone}
                    onChange={(e) => onPhoneChange(e.target.value)}
                    autoComplete="tel"
                    placeholder="+60 12-345 6789"
                  />
                </Field>

                {savedFlash ? (
                  <p className="rounded-lg bg-[#D1FAE5] px-4 py-2 text-sm font-medium text-[#059669]" role="status">
                    Profile saved successfully.
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="rounded-lg bg-[#DC2626] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-50"
                >
                  {profileSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </form>
            ) : null}

            {activeTab === 'security' ? (
              <div className="space-y-6">
                <div className="rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] p-4">
                  <p className="text-sm font-medium text-[#1A1A2E]">Password</p>
                  <p className="mt-1 text-xs text-[#6B7280]">Use a strong password you don&apos;t use elsewhere.</p>
                  <button
                    type="button"
                    onClick={onChangePassword}
                    className="mt-3 rounded-lg border border-[#DC2626] bg-white px-4 py-2 text-sm font-semibold text-[#DC2626] hover:bg-[#FEE2E2]"
                  >
                    Change Password
                  </button>
                </div>
                <Toggle
                  label="Two-Factor Authentication"
                  description="Extra security for your admin account (demo toggle)"
                  checked={twoFactorEnabled}
                  onChange={onTwoFactorChange}
                />
              </div>
            ) : null}

            {activeTab === 'preferences' ? (
              <div className="space-y-4">
                <Toggle
                  label="Notifications"
                  description="Platform alerts, verification requests, and system updates"
                  checked={notifyEnabled}
                  onChange={onNotifyChange}
                />
                <Field label="Language">
                  <select className={inputClass} value={language} onChange={(e) => onLanguageChange(e.target.value)}>
                    <option value="en">English</option>
                    <option value="ms">Bahasa Melayu</option>
                  </select>
                </Field>
                <Field label="Timezone">
                  <select className={inputClass} value={timezone} onChange={(e) => onTimezoneChange(e.target.value)}>
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
