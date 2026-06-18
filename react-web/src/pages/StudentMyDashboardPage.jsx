import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import DashboardShell from '../components/DashboardShell'
import StudentDepositModal from '../components/StudentDepositModal'
import { useStudentGuard } from '../hooks/useStudentGuard'
import { useToast } from '../context/ToastContext'
import { getUniversityDisplayName } from '../utils/universityDisplayName'

function formatApplicationWhen(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return String(iso)
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(iso)
  }
}

function formatRmMyr(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  return `RM ${Number(amount).toFixed(2)}`
}

function isLandlordDepositConfigured(app) {
  if (!app) return false
  if (app.depositSetByLandlord === true) return true
  const raw = app.landlordDepositAmount ?? app.landlord_deposit_amount
  if (raw == null) return false
  const n = Number(raw)
  return Number.isFinite(n) && n > 0
}

const QUICK_ACTIONS = [
  {
    id: 'search',
    title: 'Search listings',
    hint: 'Browse rentals on Home',
    path: '/',
    icon: 'search',
  },
  {
    id: 'property',
    title: 'myProperty',
    hint: 'Tenancy, payments & communication',
    path: '/dashboard/student/property',
    icon: 'home',
  },
  {
    id: 'account',
    title: 'myAccount',
    hint: 'Profile & preferences',
    path: '/dashboard/student/account',
    icon: 'user',
  },
]

function QuickIcon({ name }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }
  if (name === 'search') {
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4.3-4.3" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'home') {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9.5z" strokeLinejoin="round" />
      </svg>
    )
  }
  if (name === 'calendar') {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg {...common} aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 4-6 8-6s6.5 2 8 6" strokeLinecap="round" />
    </svg>
  )
}

export default function StudentMyDashboardPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, loading, error } = useStudentGuard()
  const { pushToast } = useToast()
  const universityLabel = user ? getUniversityDisplayName(user.university) : ''

  const [myApplications, setMyApplications] = useState([])
  const [myApplicationsLoading, setMyApplicationsLoading] = useState(false)
  const [depositModalApp, setDepositModalApp] = useState(null)
  const [agreementAppId, setAgreementAppId] = useState(null)
  const [depositResetAllowed, setDepositResetAllowed] = useState(false)
  const [depositResetSavingId, setDepositResetSavingId] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function loadPaymentFlags() {
      try {
        const res = await fetch('/api/v1/payments/toyyibpay/options')
        const data = await res.json().catch(() => ({}))
        if (!cancelled && res.ok) setDepositResetAllowed(Boolean(data.depositResetAllowed))
      } catch {
        if (!cancelled) setDepositResetAllowed(false)
      }
    }
    loadPaymentFlags()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    const token = localStorage.getItem('mysewa_token')
    if (!token) return
    let cancelled = false
    async function load() {
      setMyApplicationsLoading(true)
      try {
        const res = await fetch('/api/v1/applications/for-student', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.message || `Failed to load applications (HTTP ${res.status})`)
        if (!cancelled) setMyApplications(Array.isArray(data.items) ? data.items : [])
      } catch (e) {
        if (!cancelled) {
          setMyApplications([])
          pushToast({ message: e.message || 'Unable to load your applications.', type: 'error' })
        }
      } finally {
        if (!cancelled) setMyApplicationsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user?.id, pushToast])

  const reloadApplications = useCallback(async () => {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !user?.id) return
    try {
      const res = await fetch('/api/v1/applications/for-student', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setMyApplications(Array.isArray(data.items) ? data.items : [])
    } catch {
      /* ignore */
    }
  }, [user?.id])

  useEffect(() => {
    if (searchParams.get('deposit') !== 'return') return
    pushToast({
      message: 'Returned from ToyyibPay. If payment succeeded, your deposit status should update shortly — refresh if needed.',
      type: 'success',
    })
    setSearchParams({}, { replace: true })
    reloadApplications()
  }, [searchParams, setSearchParams, pushToast, reloadApplications])

  const firstName = useMemo(() => {
    const parts = String(user?.fullName || '').trim().split(/\s+/).filter(Boolean)
    return parts[0] || 'there'
  }, [user?.fullName])

  function mergeApplicationRow(updated) {
    if (!updated?.id) return
    setMyApplications((prev) =>
      prev.map((row) => {
        if (Number(row.id) !== Number(updated.id)) return row
        const merged = { ...row, ...updated }
        if (updated.depositPaid !== undefined) merged.depositPaid = updated.depositPaid
        else merged.depositPaid = true
        return merged
      }),
    )
  }

  async function resetDepositForTesting(app) {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !app?.id) return
    setDepositResetSavingId(app.id)
    try {
      const res = await fetch(`/api/v1/applications/${app.id}/deposit/reset-for-testing`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not clear deposit (${res.status})`)
      if (data.item) mergeApplicationRow(data.item)
      pushToast({ message: 'Deposit records cleared — you can use Pay deposit again (local test only).', type: 'success' })
    } catch (e) {
      pushToast({ message: e.message || 'Clear deposit failed.', type: 'error' })
    } finally {
      setDepositResetSavingId(null)
    }
  }

  async function openRentalAgreement(applicationId) {
    const token = localStorage.getItem('mysewa_token')
    if (!token) {
      pushToast({ message: 'Sign in again to continue.', type: 'error' })
      return
    }
    setAgreementAppId(applicationId)
    try {
      const res = await fetch(`/api/v1/applications/${applicationId}/agreement`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        let msg = `Could not load agreement (${res.status})`
        try {
          const data = text && text.trim().startsWith('{') ? JSON.parse(text) : null
          if (data?.message) msg = data.message
        } catch {
          /* ignore */
        }
        throw new Error(msg)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(url), 120000)
    } catch (e) {
      pushToast({ message: e.message || 'Agreement could not be opened.', type: 'error' })
    } finally {
      setAgreementAppId(null)
    }
  }

  return (
    <DashboardShell properties>
      {depositModalApp ? (
        <StudentDepositModal
          application={depositModalApp}
          onClose={() => setDepositModalApp(null)}
          onCompleted={(item) => mergeApplicationRow(item)}
        />
      ) : null}
      <article className="dashboard-page-intro student-my-dashboard student-dash-home student-dash-v2">
        {loading ? <div className="auth-toast">Loading your account…</div> : null}
        {!loading && error ? <div className="auth-toast auth-toast-error">Error: {error}</div> : null}
        {!loading && !error && user ? (
          <>
            <header className="student-dash-hero">
              <div className="student-dash-hero-copy">
                <p className="student-dash-hero-eyebrow">myDashboard</p>
                <h1 className="student-dash-hero-title">Hi, {firstName}</h1>
                <p className="student-dash-hero-lead">
                  Welcome back — explore listings, manage your tenancy tools, and keep your profile ready for
                  landlords.
                </p>
                <div className="student-dash-hero-actions">
                  <button
                    type="button"
                    className="student-dash-hero-btn student-dash-hero-btn--primary"
                    onClick={() => navigate('/')}
                  >
                    Browse listings
                  </button>
                  <button
                    type="button"
                    className="student-dash-hero-btn student-dash-hero-btn--ghost"
                    onClick={() => navigate('/dashboard/student/account')}
                  >
                    View profile
                  </button>
                </div>
              </div>
              <div className="student-dash-hero-art" aria-hidden="true">
                <span className="student-dash-hero-blob student-dash-hero-blob--a" />
                <span className="student-dash-hero-blob student-dash-hero-blob--b" />
                <span className="student-dash-hero-blob student-dash-hero-blob--c" />
              </div>
            </header>

            <div className="student-dash-v2-layout">
              <div className="student-dash-v2-main">
                <section className="student-dash-v2-section" aria-labelledby="student-dash-quick-heading">
                  <div className="student-dash-v2-section-head">
                    <h2 id="student-dash-quick-heading" className="student-dash-v2-section-title">
                      Quick access
                    </h2>
                    <button type="button" className="student-dash-v2-section-link" onClick={() => navigate('/')}>
                      View all
                    </button>
                  </div>
                  <p className="student-dash-v2-section-lead">Shortcuts to the main student areas of MySewa.</p>
                  <div className="student-dash-quick-actions-grid student-dash-v2-actions">
                    {QUICK_ACTIONS.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="student-dash-action-card student-dash-action-card--v2"
                        onClick={() => navigate(a.path)}
                      >
                        <span className="student-dash-action-icon student-dash-action-icon--v2">
                          <QuickIcon name={a.icon} />
                        </span>
                        <span className="student-dash-action-title">{a.title}</span>
                        <span className="student-dash-action-hint">{a.hint}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section
                  className="student-dash-v2-section student-my-applications-section"
                  aria-labelledby="student-my-apps-heading"
                >
                  <div className="student-dash-v2-section-head">
                    <h2 id="student-my-apps-heading" className="student-dash-v2-section-title">
                      My rental applications
                    </h2>
                    <button type="button" className="student-dash-v2-section-link" onClick={() => navigate('/')}>
                      Browse listings
                    </button>
                  </div>
                  <p className="student-my-applications-lead">
                    When a landlord <strong>accepts</strong> you, they set the <strong>deposit amount</strong> below. That
                    amount is <strong>not sent as cash automatically</strong> — it appears here so you can use{' '}
                    <strong>Pay deposit</strong> (bank / QR / cash / ToyyibPay prototype). For testing your own listing,
                    sign in as landlord on <strong>My properties</strong> to accept the application first.
                  </p>
                  {myApplicationsLoading ? <p className="auth-toast">Loading applications…</p> : null}
                  {!myApplicationsLoading && myApplications.length === 0 ? (
                    <div className="student-dash-card student-rental-empty">
                      <p>You have not submitted any rental applications yet.</p>
                      <p className="student-dash-muted">Apply from a property card on the Home page.</p>
                    </div>
                  ) : null}
                  {!myApplicationsLoading && myApplications.length > 0 ? (
                    <div className="landlord-application-list">
                      {myApplications.map((a) => {
                        const accepted = String(a.status || '').toLowerCase() === 'accepted'
                        const pending = String(a.status || '').toLowerCase() === 'pending'
                        const rejected = String(a.status || '').toLowerCase() === 'rejected'
                        return (
                          <article key={a.id} className="landlord-application-card student-rental-app-card">
                            <div className="landlord-application-card-top">
                              <div>
                                <p className="landlord-application-prop">{a.propertyName || `Property #${a.propertyId}`}</p>
                                <p className="landlord-application-meta">{formatApplicationWhen(a.createdAt)}</p>
                              </div>
                              <span className="landlord-application-status">{a.status || 'pending'}</span>
                            </div>
                            <dl className="landlord-application-grid">
                              <div>
                                <dt>Application</dt>
                                <dd>#{a.id}</dd>
                              </div>
                              <div>
                                <dt>Last updated</dt>
                                <dd>{a.updatedAt ? formatApplicationWhen(a.updatedAt) : '—'}</dd>
                              </div>
                              <div>
                                <dt>Preferred move-in</dt>
                                <dd>{a.preferredMoveIn || '—'}</dd>
                              </div>
                              <div>
                                <dt>Lease ends</dt>
                                <dd>{a.leaseEnd || a.leaseEndDate || a.lease_end || '—'}</dd>
                              </div>
                              <div>
                                <dt>Lease length</dt>
                                <dd>
                                  {a.leaseDays != null && a.leaseMonths != null
                                    ? `${a.leaseDays} day${a.leaseDays === 1 ? '' : 's'} / ${a.leaseMonths} month${
                                        a.leaseMonths === 1 ? '' : 's'
                                      }`
                                    : a.leaseMonths != null
                                      ? `${a.leaseMonths} months`
                                      : '—'}
                                </dd>
                              </div>
                              {accepted ? (
                                <div>
                                  <dt>Deposit to pay</dt>
                                  <dd>
                                    <span className="student-app-deposit-amount">
                                      {formatRmMyr(
                                        a.depositAmountSuggested != null
                                          ? a.depositAmountSuggested
                                          : a.landlordDepositAmount ?? a.landlord_deposit_amount,
                                      )}
                                    </span>
                                    {isLandlordDepositConfigured(a) ? (
                                      <span className="student-app-deposit-source">
                                        Your landlord set this amount when they accepted your application.
                                      </span>
                                    ) : (
                                      <span className="student-app-deposit-source">
                                        Default estimate — no landlord-set deposit is stored yet. Have your landlord
                                        accept again from <strong>My properties</strong> and enter the deposit amount.
                                      </span>
                                    )}
                                  </dd>
                                </div>
                              ) : (
                                <div>
                                  <dt>Deposit</dt>
                                  <dd className="student-app-deposit-pending-note">
                                    {pending
                                      ? 'You will see the landlord’s deposit amount here after they accept your application.'
                                      : rejected
                                        ? 'Not applicable — this application was not accepted.'
                                        : '—'}
                                  </dd>
                                </div>
                              )}
                            </dl>
                            {accepted ? (
                              <div className="landlord-application-actions">
                                {!a.depositPaid ? (
                                  <button
                                    type="button"
                                    className="landlord-application-status-btn"
                                    onClick={() => setDepositModalApp(a)}
                                  >
                                    Pay deposit
                                  </button>
                                ) : (
                                  <>
                                    <span className="student-app-deposit-paid">Demo deposit paid</span>
                                    {depositResetAllowed ? (
                                      <button
                                        type="button"
                                        className="landlord-application-status-btn landlord-application-status-btn--ghost"
                                        disabled={depositResetSavingId === a.id}
                                        onClick={() => resetDepositForTesting(a)}
                                      >
                                        {depositResetSavingId === a.id ? 'Clearing…' : 'Clear deposit (test)'}
                                      </button>
                                    ) : null}
                                  </>
                                )}
                                <button
                                  type="button"
                                  className="landlord-application-status-btn"
                                  disabled={agreementAppId === a.id}
                                  onClick={() => openRentalAgreement(a.id)}
                                >
                                  {agreementAppId === a.id ? 'Opening…' : 'Download agreement (HTML)'}
                                </button>
                              </div>
                            ) : null}
                          </article>
                        )
                      })}
                    </div>
                  ) : null}
                </section>

                <section className="student-dash-v2-section" aria-labelledby="student-dash-overview-heading">
                  <div className="student-dash-v2-section-head">
                    <h2 id="student-dash-overview-heading" className="student-dash-v2-section-title">
                      Overview
                    </h2>
                  </div>
                  <p className="student-dash-v2-section-lead">Open a hub for more detail — same tools, full pages.</p>
                  <div className="student-dash-quick-views-grid student-dash-v2-views">
                    <div className="student-dash-view-card">
                      <h3 className="student-dash-view-title">Property hub</h3>
                      <p className="student-dash-view-body">
                        Current listing, <strong>deposit</strong>, monthly rent calendar, <strong>reviews</strong>, and{' '}
                        <strong>reports</strong> — open <strong>myProperty</strong>.
                      </p>
                      <button
                        type="button"
                        className="student-dash-view-link"
                        onClick={() => navigate('/dashboard/student/property')}
                      >
                        Go to myProperty →
                      </button>
                    </div>
                    <div className="student-dash-view-card">
                      <h3 className="student-dash-view-title">Your profile</h3>
                      <p className="student-dash-view-body">
                        Signed in as <strong>{user.email}</strong>. Update your nickname, bio, and local preferences on{' '}
                        <strong>myAccount</strong>.
                      </p>
                      <button type="button" className="student-dash-view-link" onClick={() => navigate('/dashboard/student/account')}>
                        Edit myAccount →
                      </button>
                    </div>
                  </div>
                </section>
              </div>

              <aside className="student-dash-v2-aside" aria-label="Summary">
                <div className="student-dash-widget">
                  <h3 className="student-dash-widget-title">Your account</h3>
                  <dl className="student-dash-widget-dl">
                    <div className="student-dash-widget-row">
                      <dt>Email</dt>
                      <dd title={user.email}>{user.email}</dd>
                    </div>
                    <div className="student-dash-widget-row">
                      <dt>University</dt>
                      <dd title={universityLabel || undefined}>{universityLabel || '—'}</dd>
                    </div>
                    <div className="student-dash-widget-row">
                      <dt>Role</dt>
                      <dd>Student</dd>
                    </div>
                  </dl>
                </div>
                <div className="student-dash-widget student-dash-widget--accent">
                  <h3 className="student-dash-widget-title">Get the most from MySewa</h3>
                  <p className="student-dash-widget-body">
                    A complete profile and verification help landlords respond faster when you enquire.
                  </p>
                  <button type="button" className="student-dash-widget-cta" onClick={() => navigate('/dashboard/student/account')}>
                    Complete profile →
                  </button>
                </div>
              </aside>
            </div>
          </>
        ) : null}
      </article>
    </DashboardShell>
  )
}
