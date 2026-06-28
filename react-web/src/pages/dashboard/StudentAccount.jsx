import { useState } from 'react'

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'security', label: 'Security' },
  { key: 'preferences', label: 'Preferences' },
]

const MALAYSIAN_STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Perak',
  'Perlis',
  'Pulau Pinang',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'Wilayah Persekutuan',
]

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
  'w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#1A1A2E] outline-none focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20 disabled:bg-[#F9FAFB] disabled:text-[#6B7280]'

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
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-[#6C2BD9]' : 'bg-[#D1D5DB]'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  )
}

export default function StudentAccount({
  user,
  displayName,
  displayInitials,
  avatarDataUrl,
  universityDisplay,
  verifiedEmail,
  verificationState,
  verificationLabel,
  firstName,
  lastName,
  phone,
  country,
  countries,
  programStudy,
  academicYear,
  academicYearOptions,
  hasMalaysianIc,
  dobDisplay,
  genderDisplay,
  stateDisplay,
  raceDisplay,
  religionDisplay,
  profileSaving,
  savedFlash,
  notifyEnabled,
  twoFactorEnabled,
  language,
  currency,
  onAvatarClick,
  onFirstNameChange,
  onLastNameChange,
  onPhoneChange,
  onCountryChange,
  onProgramStudyChange,
  onAcademicYearChange,
  onNotifyChange,
  onTwoFactorChange,
  onLanguageChange,
  onCurrencyChange,
  onSaveProfile,
  onCancelProfile,
  onCompleteVerification,
  onChangePassword,
}) {
  const [activeTab, setActiveTab] = useState('profile')

  const verificationEmoji =
    verificationState === 'verified' ? '✅' : verificationState === 'rejected' ? '❌' : '⚠️'

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
            <span aria-hidden="true">👤 </span>
            My Account
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">Manage your profile and preferences</p>
        </header>

        {/* Profile overview */}
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <button
              type="button"
              onClick={onAvatarClick}
              className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#6C2BD9] text-2xl font-bold text-white ring-4 ring-[#F3F0FF] transition hover:opacity-90"
              aria-label="Change profile photo"
            >
              {avatarDataUrl ? (
                <img src={avatarDataUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                displayInitials
              )}
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold uppercase tracking-wide text-[#1A1A2E]">{displayName}</h2>
              <p className="mt-2 text-sm text-[#4B5563]">
                {user?.email}
                {verifiedEmail ? (
                  <span className="ml-2 font-semibold text-[#10B981]">
                    <span aria-hidden="true">✅ </span>
                    Verified
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-[#6B7280]">{universityDisplay || '—'}</p>
              <span className="mt-3 inline-flex rounded-full bg-[#F3F0FF] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#6C2BD9]">
                Student
              </span>
            </div>
          </div>
        </section>

        {/* Verification */}
        <section className="rounded-xl bg-[#F3F0FF] p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[#1A1A2E]">Verification Status</p>
              <p className="mt-1 text-sm text-[#4B5563]">
                <span aria-hidden="true">{verificationEmoji} </span>
                {verificationLabel}
              </p>
            </div>
            {verificationState !== 'verified' ? (
              <button
                type="button"
                onClick={onCompleteVerification}
                className="shrink-0 rounded-lg bg-[#6C2BD9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6]"
              >
                Complete Verification →
              </button>
            ) : null}
          </div>
        </section>

        {/* Tabs */}
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
                    active ? 'bg-[#6C2BD9] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="First Name">
                    <input
                      className={inputClass}
                      value={firstName}
                      onChange={(e) => onFirstNameChange(e.target.value)}
                      autoComplete="given-name"
                    />
                  </Field>
                  <Field label="Last Name">
                    <input
                      className={inputClass}
                      value={lastName}
                      onChange={(e) => onLastNameChange(e.target.value)}
                      autoComplete="family-name"
                    />
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
                  <Field label="Gender" hint={hasMalaysianIc ? 'Derived from your IC number' : undefined}>
                    <input className={inputClass} value={genderDisplay} readOnly disabled />
                  </Field>
                  <Field label="Date of Birth" hint={hasMalaysianIc ? 'Derived from your IC number' : undefined}>
                    <input
                      type="text"
                      className={inputClass}
                      value={dobDisplay}
                      readOnly
                      disabled
                    />
                  </Field>
                  <Field label="State" hint={hasMalaysianIc ? 'Derived from your IC number' : undefined}>
                    {hasMalaysianIc ? (
                      <input className={inputClass} value={stateDisplay} readOnly disabled />
                    ) : (
                      <select className={inputClass} value={stateDisplay} disabled>
                        <option value="">—</option>
                        {MALAYSIAN_STATES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                  <Field label="Country">
                    {hasMalaysianIc ? (
                      <input className={inputClass} value="Malaysia" readOnly disabled />
                    ) : (
                      <select
                        className={inputClass}
                        value={country}
                        onChange={(e) => onCountryChange(e.target.value)}
                      >
                        {countries.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                  <Field label="Race">
                    <input className={inputClass} value={raceDisplay} readOnly disabled />
                  </Field>
                  <Field label="University">
                    <input className={inputClass} value={universityDisplay} readOnly disabled />
                  </Field>
                  <Field label="Programme of Study">
                    <input
                      className={inputClass}
                      value={programStudy}
                      onChange={(e) => onProgramStudyChange(e.target.value)}
                      placeholder="e.g. Bachelor of Computer Science"
                    />
                  </Field>
                  <Field label="Current Academic Year">
                    <select
                      className={inputClass}
                      value={academicYear}
                      onChange={(e) => onAcademicYearChange(e.target.value)}
                    >
                      {academicYearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {religionDisplay && religionDisplay !== '—' ? (
                    <Field label="Religion">
                      <input className={inputClass} value={religionDisplay} readOnly disabled />
                    </Field>
                  ) : null}
                </div>

                {savedFlash ? (
                  <p className="rounded-lg bg-[#D1FAE5] px-4 py-2 text-sm font-medium text-[#059669]" role="status">
                    Profile saved successfully.
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="rounded-lg bg-[#6C2BD9] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6] disabled:opacity-50"
                  >
                    {profileSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={onCancelProfile}
                    disabled={profileSaving}
                    className="rounded-lg border border-[#E2E8F0] bg-white px-6 py-2.5 text-sm font-semibold text-[#4B5563] hover:bg-[#FAFAFA]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}

            {activeTab === 'security' ? (
              <div className="space-y-6">
                <Field label="Email">
                  <input className={inputClass} type="email" value={user?.email || ''} readOnly disabled />
                </Field>
                <div className="rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] p-4">
                  <p className="text-sm font-medium text-[#1A1A2E]">Password</p>
                  <p className="mt-1 text-xs text-[#6B7280]">Use a strong password you don&apos;t use elsewhere.</p>
                  <button
                    type="button"
                    onClick={onChangePassword}
                    className="mt-3 rounded-lg border border-[#6C2BD9] bg-white px-4 py-2 text-sm font-semibold text-[#6C2BD9] hover:bg-[#F3F0FF]"
                  >
                    Change Password
                  </button>
                </div>
                <Toggle
                  label="Two-Factor Authentication"
                  description="Extra security for your account (demo toggle)"
                  checked={twoFactorEnabled}
                  onChange={onTwoFactorChange}
                />
              </div>
            ) : null}

            {activeTab === 'preferences' ? (
              <div className="space-y-4">
                <Toggle
                  label="Email Notifications"
                  description="Booking updates, payment reminders, and landlord messages"
                  checked={notifyEnabled}
                  onChange={onNotifyChange}
                />
                <Field label="Language">
                  <select className={inputClass} value={language} onChange={(e) => onLanguageChange(e.target.value)}>
                    <option value="en">English</option>
                    <option value="ms">Bahasa Melayu</option>
                  </select>
                </Field>
                <Field label="Currency">
                  <select className={inputClass} value={currency} onChange={(e) => onCurrencyChange(e.target.value)}>
                    <option value="MYR">MYR (RM)</option>
                    <option value="USD">USD ($)</option>
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
