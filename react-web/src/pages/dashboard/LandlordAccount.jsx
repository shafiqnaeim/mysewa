const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'security', label: 'Security' },
  { key: 'preferences', label: 'Preferences' },
  { key: 'verification', label: 'Verification' },
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

function Field({ label, children, hint, badge }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="font-medium text-[#4A5568]">{label}</span>
        {badge}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-[#A0AEC0]">{hint}</span> : null}
    </label>
  )
}

const inputClass =
  'w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#2D3748] outline-none focus:border-[#E88D5B] focus:ring-2 focus:ring-[#E88D5B]/20 disabled:bg-[#F7FAFC] disabled:text-[#4A5568]'

function Toggle({ checked, onChange, label, description, accent = '#E88D5B' }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] px-4 py-3">
      <div>
        <p className="text-sm font-medium text-[#2D3748]">{label}</p>
        {description ? <p className="text-xs text-[#4A5568]">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative h-6 w-11 shrink-0 rounded-full transition"
        style={{ backgroundColor: checked ? accent : '#D1D5DB' }}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  )
}

function ProgressDots({ steps, total = 4 }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-sm" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < steps ? 'text-[#2D3748]' : 'text-[#D1D5DB]'}>
          {i < steps ? '●' : '○'}
        </span>
      ))}
    </span>
  )
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#48BB78]">
      <span aria-hidden="true">✅</span> Verified
    </span>
  )
}

export default function LandlordAccount({
  user,
  displayName,
  displayInitials,
  avatarDataUrl,
  verifiedEmail,
  verificationState,
  verificationLabel,
  firstName,
  lastName,
  phone,
  icDisplay,
  country,
  countries,
  hasMalaysianIc,
  dobDisplay,
  genderDisplay,
  stateDisplay,
  raceDisplay,
  profileSaving,
  savedFlash,
  notifyEnabled,
  twoFactorEnabled,
  language,
  currency,
  timezone,
  lastLoginDisplay,
  profileCompleteness,
  profileMissingHint,
  verificationProgressSteps,
  verificationProgressPercent,
  icUploaded,
  grantUploaded,
  selfieUploaded,
  activeTab = 'profile',
  onTabChange,
  onAvatarClick,
  onFirstNameChange,
  onLastNameChange,
  onPhoneChange,
  onCountryChange,
  onNotifyChange,
  onTwoFactorChange,
  onLanguageChange,
  onCurrencyChange,
  onTimezoneChange,
  onSaveProfile,
  onCancelProfile,
  onCompleteVerification,
  onUploadDocuments,
  onCompleteProfile,
  onChangePassword,
}) {
  const verificationEmoji =
    verificationState === 'verified' ? '✅' : verificationState === 'rejected' ? '❌' : '⚠️'

  const statusEmoji = verificationState === 'verified' ? '✅' : '⚠️'

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#2D3748]">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2D3748] sm:text-3xl">
              <span aria-hidden="true">👤 </span>
              My Account
            </h1>
            <p className="mt-2 text-sm text-[#4A5568]">
              Manage your profile, preferences, and verification status
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full bg-[#FFF8F3] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#E88D5B]">
            Landlord
          </span>
        </header>

        {/* Profile overview */}
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <button
              type="button"
              onClick={onAvatarClick}
              className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2D3748] text-2xl font-bold text-white ring-4 ring-[#EDF2F7] transition hover:opacity-90"
              aria-label="Change profile photo"
            >
              {avatarDataUrl ? (
                <img src={avatarDataUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                displayInitials
              )}
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-[#2D3748]">{displayName}</h2>
              <p className="mt-2 text-sm text-[#4A5568]">
                {user?.email}
                {verifiedEmail ? (
                  <span className="ml-2 font-semibold text-[#48BB78]">
                    <span aria-hidden="true">✅ </span>
                    Verified
                  </span>
                ) : null}
              </p>
              {phone ? <p className="mt-1 text-sm text-[#4A5568]">{phone}</p> : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-[#FFF8F3] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#E88D5B]">
                  Landlord
                </span>
                <span className="text-sm text-[#4A5568]">
                  <span aria-hidden="true">{statusEmoji} </span>
                  {verificationLabel}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Verification CTA */}
        {verificationState !== 'verified' ? (
          <section className="rounded-xl border border-[#E88D5B] bg-[#FFFAF0] p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[#2D3748]">Verification Status</p>
                <p className="mt-1 text-sm text-[#4A5568]">
                  <span aria-hidden="true">{verificationEmoji} </span>
                  {verificationLabel}
                </p>
                <p className="mt-1 text-xs text-[#4A5568]">
                  Complete your verification to get the &apos;Verified Landlord&apos; badge
                </p>
              </div>
              <button
                type="button"
                onClick={onCompleteVerification}
                className="shrink-0 rounded-lg bg-[#E88D5B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D97A4C]"
              >
                Complete Verification →
              </button>
            </div>
          </section>
        ) : null}

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
                  onClick={() => onTabChange(tab.key)}
                  className={`shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
                    active ? 'bg-[#E88D5B] text-white' : 'bg-[#EDF2F7] text-[#4A5568] hover:bg-[#E2E8F0]'
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
                <h2 className="text-lg font-bold text-[#2D3748]">Personal Information</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="First Name">
                    <input
                      className={inputClass}
                      value={firstName}
                      onChange={(e) => onFirstNameChange(e.target.value)}
                      autoComplete="given-name"
                      placeholder="Encik"
                    />
                  </Field>
                  <Field label="Last Name">
                    <input
                      className={inputClass}
                      value={lastName}
                      onChange={(e) => onLastNameChange(e.target.value)}
                      autoComplete="family-name"
                      placeholder="Hassan"
                    />
                  </Field>
                  <Field
                    label="Email"
                    badge={verifiedEmail ? <VerifiedBadge /> : null}
                  >
                    <input
                      className={inputClass}
                      type="email"
                      value={user?.email || ''}
                      readOnly
                      disabled
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      type="tel"
                      className={inputClass}
                      value={phone}
                      onChange={(e) => onPhoneChange(e.target.value)}
                      autoComplete="tel"
                      placeholder="+6019-8765432"
                    />
                  </Field>
                  <Field label="Identity Card" hint="Registered at sign-up">
                    <input className={inputClass} value={icDisplay} readOnly disabled />
                  </Field>
                  <Field label="Date of Birth" hint={hasMalaysianIc ? 'Derived from your IC number' : undefined}>
                    <input className={inputClass} value={dobDisplay} readOnly disabled />
                  </Field>
                  <Field label="Gender" hint={hasMalaysianIc ? 'Derived from your IC number' : undefined}>
                    <input className={inputClass} value={genderDisplay} readOnly disabled />
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
                </div>

                {savedFlash ? (
                  <p className="rounded-lg bg-[#F0FFF4] px-4 py-2 text-sm font-medium text-[#276749]" role="status">
                    Profile saved successfully.
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="rounded-lg bg-[#E88D5B] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#D97A4C] disabled:opacity-50"
                  >
                    {profileSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={onCancelProfile}
                    disabled={profileSaving}
                    className="rounded-lg border border-[#2D3748] bg-white px-6 py-2.5 text-sm font-semibold text-[#2D3748] hover:bg-[#F7FAFC]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}

            {activeTab === 'security' ? (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-[#2D3748]">Security Settings</h2>
                <Field label="Email">
                  <input className={inputClass} type="email" value={user?.email || ''} readOnly disabled />
                </Field>
                <div className="rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] p-4">
                  <p className="text-sm font-medium text-[#2D3748]">Password</p>
                  <p className="mt-1 text-xs text-[#4A5568]">Use a strong password you don&apos;t use elsewhere.</p>
                  <button
                    type="button"
                    onClick={onChangePassword}
                    className="mt-3 rounded-lg border border-[#E88D5B] bg-white px-4 py-2 text-sm font-semibold text-[#E88D5B] hover:bg-[#FFF8F3]"
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
                {lastLoginDisplay ? (
                  <p className="text-sm text-[#4A5568]">
                    <span className="font-medium text-[#2D3748]">Recent Login:</span> Last login: {lastLoginDisplay}
                  </p>
                ) : null}
              </div>
            ) : null}

            {activeTab === 'preferences' ? (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-[#2D3748]">Preferences</h2>
                <Toggle
                  label="Email Notifications"
                  description="Receive email notifications for new bookings"
                  checked={notifyEnabled}
                  onChange={onNotifyChange}
                />
                <Field label="Language">
                  <select className={inputClass} value={language} onChange={(e) => onLanguageChange(e.target.value)}>
                    <option value="en">English</option>
                    <option value="ms">Bahasa Malaysia</option>
                  </select>
                </Field>
                <Field label="Currency">
                  <select className={inputClass} value={currency} onChange={(e) => onCurrencyChange(e.target.value)}>
                    <option value="MYR">RM — Ringgit Malaysia</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </Field>
                <Field label="Timezone">
                  <select className={inputClass} value={timezone} onChange={(e) => onTimezoneChange(e.target.value)}>
                    <option value="Asia/Kuala_Lumpur">GMT+8 — Malaysia</option>
                    <option value="Asia/Singapore">GMT+8 — Singapore</option>
                    <option value="UTC">UTC</option>
                  </select>
                </Field>
              </div>
            ) : null}

            {activeTab === 'verification' ? (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-[#2D3748]">Verification Status</h2>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#2D3748]">
                      <span aria-hidden="true">
                        {verificationState === 'verified' ? '✅ ' : '⏳ '}
                      </span>
                      {verificationLabel}
                    </p>
                    {verificationState !== 'verified' ? (
                      <div className="mt-2">
                        <ProgressDots steps={verificationProgressSteps} />
                        <p className="mt-1 text-sm font-semibold text-[#2D3748]">
                          {verificationProgressPercent}% Complete
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] p-4">
                  <p className="text-sm font-medium text-[#2D3748]">Documents Uploaded</p>
                  <ul className="mt-3 space-y-2 text-sm text-[#4A5568]">
                    <li>
                      <span aria-hidden="true">{icUploaded ? '✅' : '⏳'} </span>
                      Identity Card
                    </li>
                    <li>
                      <span aria-hidden="true">{grantUploaded ? '✅' : '⏳'} </span>
                      Grant / Property Tax Receipt
                    </li>
                    <li>
                      <span aria-hidden="true">{selfieUploaded ? '✅' : '⏳'} </span>
                      Selfie
                    </li>
                  </ul>
                </div>

                {verificationState !== 'verified' ? (
                  <>
                    <p className="text-sm text-[#4A5568]">
                      Upload the required documents to verify your identity
                    </p>
                    <button
                      type="button"
                      onClick={onUploadDocuments}
                      className="rounded-lg bg-[#E88D5B] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#D97A4C]"
                    >
                      Upload Documents →
                    </button>
                  </>
                ) : (
                  <p className="rounded-lg bg-[#F0FFF4] px-4 py-3 text-sm font-medium text-[#276749]">
                    Your identity has been verified. You have the Verified Landlord badge.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Profile completeness */}
        {profileCompleteness < 100 ? (
          <section className="rounded-xl bg-[#F0F7FF] p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#2D3748]">
                  Profile Completeness: {profileCompleteness}%
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
                  <div
                    className="h-full rounded-full bg-[#E88D5B] transition-all"
                    style={{ width: `${profileCompleteness}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-[#4A5568]">{profileMissingHint}</p>
              </div>
              <button
                type="button"
                onClick={onCompleteProfile}
                className="shrink-0 rounded-lg border border-[#2D3748] bg-white px-4 py-2 text-sm font-semibold text-[#2D3748] hover:bg-[#EDF2F7]"
              >
                Complete Profile
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}
