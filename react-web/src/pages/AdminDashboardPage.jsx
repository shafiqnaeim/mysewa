import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardShell from '../components/DashboardShell'
import { ADMIN_QUICK_ACTIONS } from '../admin/adminNav'
import { useAdminGuard } from '../hooks/useAdminGuard'
import { useToast } from '../context/ToastContext'

function AdminQuickIcon({ name }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }
  if (name === 'property') {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" strokeLinejoin="round" />
      </svg>
    )
  }
  if (name === 'settings') {
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (name === 'dashboard') {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    )
  }
  if (name === 'database') {
    return (
      <svg {...common} aria-hidden="true">
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
        <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
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
  return null
}

function arcSlicePath(cx, cy, r, a0, a1) {
  const x0 = cx + r * Math.cos(a0)
  const y0 = cy + r * Math.sin(a0)
  const x1 = cx + r * Math.cos(a1)
  const y1 = cy + r * Math.sin(a1)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`
}

function AdminPieChart({ title, slices, size = 168 }) {
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.36
  const total = slices.reduce((s, x) => s + Math.max(0, Number(x.value) || 0), 0)
  let angle = -Math.PI / 2
  const paths = []
  if (total > 0) {
    slices.forEach((slice, i) => {
      const v = Math.max(0, Number(slice.value) || 0)
      const frac = v / total
      if (frac <= 0) return
      const a0 = angle
      angle += frac * 2 * Math.PI
      const a1 = angle
      paths.push(
        <path key={i} d={arcSlicePath(cx, cy, r, a0, a1)} fill={slice.color} opacity={0.9}>
          <title>{`${slice.label}: ${v}`}</title>
        </path>,
      )
    })
  }
  return (
    <div className="admin-dash-chart-card">
      <h3 className="admin-dash-chart-title">{title}</h3>
      {total <= 0 ? (
        <p className="admin-dash-chart-empty">No data yet.</p>
      ) : (
        <div className="admin-dash-chart-body">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="admin-dash-pie-svg" role="img" aria-label={title}>
            {paths}
          </svg>
          <ul className="admin-dash-legend">
            {slices.map((s) => (
              <li key={s.label}>
                <span className="admin-dash-legend-swatch" style={{ background: s.color }} />
                <span className="admin-dash-legend-label">{s.label}</span>
                <span className="admin-dash-legend-val">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function AdminBarTotals({ stats }) {
  const items = [
    { label: 'Properties', value: stats.propertiesTotal, color: 'var(--student-accent, #2563eb)' },
    { label: 'Applications', value: stats.applicationsTotal, color: '#7c3aed' },
    { label: 'Universities', value: stats.universitiesTotal, color: '#0d9488' },
  ]
  const maxH = 132
  const max = Math.max(...items.map((i) => Number(i.value) || 0), 1)
  return (
    <div className="admin-dash-chart-card">
      <h3 className="admin-dash-chart-title">Key totals</h3>
      <div className="admin-dash-bar-wrap" role="img" aria-label="Bar chart of totals">
        {items.map((it) => {
          const v = Number(it.value) || 0
          const h = Math.round((v / max) * maxH)
          return (
            <div key={it.label} className="admin-dash-bar-item">
              <div className="admin-dash-bar-track" style={{ height: maxH }}>
                <div className="admin-dash-bar-fill" style={{ height: h, background: it.color }} title={`${it.label}: ${v}`} />
              </div>
              <span className="admin-dash-bar-label">{it.label}</span>
              <span className="admin-dash-bar-val">{v}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const { user, loading, error } = useAdminGuard()
  const { pushToast } = useToast()
  const [greetingName, setGreetingName] = useState('')

  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersLoading, setUsersLoading] = useState(false)
  const [accountStatusSavingId, setAccountStatusSavingId] = useState(null)

  useEffect(() => {
    if (!user?.id) {
      setGreetingName('')
      return
    }
    try {
      const nick = localStorage.getItem(`mysewa_admin_nickname_${user.id}`) || ''
      const parts = String(user.fullName || '').trim().split(/\s+/).filter(Boolean)
      setGreetingName(nick || parts[0] || 'Administrator')
    } catch {
      setGreetingName('Administrator')
    }
  }, [user?.id, user?.fullName])

  useEffect(() => {
    function refresh() {
      if (!user?.id) return
      try {
        const nick = localStorage.getItem(`mysewa_admin_nickname_${user.id}`) || ''
        const parts = String(user.fullName || '').trim().split(/\s+/).filter(Boolean)
        setGreetingName(nick || parts[0] || 'Administrator')
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('mysewa-local-profile-saved', refresh)
    return () => window.removeEventListener('mysewa-local-profile-saved', refresh)
  }, [user?.id, user?.fullName])

  useEffect(() => {
    if (!user?.id) return
    const token = localStorage.getItem('mysewa_token')
    if (!token) return
    let cancelled = false
    async function loadStats() {
      setStatsLoading(true)
      try {
        const res = await fetch('/api/v1/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.message || `Stats failed (HTTP ${res.status})`)
        if (!cancelled) setStats(data)
      } catch (e) {
        if (!cancelled) {
          setStats(null)
          pushToast({ message: e.message || 'Unable to load platform statistics.', type: 'error' })
        }
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    }
    async function loadUsers() {
      setUsersLoading(true)
      try {
        const res = await fetch('/api/v1/admin/users?page=0&size=100', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.message || `Users failed (HTTP ${res.status})`)
        if (!cancelled) {
          setUsers(Array.isArray(data.items) ? data.items : [])
          setUsersTotal(Number(data.totalElements) || 0)
        }
      } catch (e) {
        if (!cancelled) {
          setUsers([])
          pushToast({ message: e.message || 'Unable to load user list.', type: 'error' })
        }
      } finally {
        if (!cancelled) setUsersLoading(false)
      }
    }
    loadStats()
    loadUsers()
    return () => {
      cancelled = true
    }
  }, [user?.id, pushToast])

  async function updateUserAccountStatus(targetId, accountStatus) {
    const token = localStorage.getItem('mysewa_token')
    if (!token) return
    setAccountStatusSavingId(targetId)
    try {
      const res = await fetch(`/api/v1/admin/users/${targetId}/account-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ accountStatus }),
      })
      const raw = await res.text()
      let data = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {
        data = {}
      }
      if (!res.ok) {
        throw new Error(data.message || `Update failed (HTTP ${res.status})`)
      }
      const item = data.item
      if (item && item.id != null) {
        setUsers((prev) => prev.map((u) => (Number(u.id) === Number(item.id) ? { ...u, ...item } : u)))
      }
      pushToast({ message: `Account is now ${accountStatus}.`, type: 'success' })
    } catch (e) {
      pushToast({ message: e.message || 'Could not update account status.', type: 'error' })
    } finally {
      setAccountStatusSavingId(null)
    }
  }

  const roleLabel = useMemo(() => 'System Administrator', [])

  return (
    <DashboardShell properties>
      <article className="dashboard-page-intro student-my-dashboard student-dash-home student-dash-v2">
        {loading ? <div className="auth-toast">Verifying privileges…</div> : null}
        {!loading && error ? <div className="auth-toast auth-toast-error">{error}</div> : null}
        {!loading && !error && user ? (
          <>
            <header className="student-dash-hero">
              <div className="student-dash-hero-copy">
                <p className="student-dash-hero-eyebrow">myDashboard</p>
                <h1 className="student-dash-hero-title">Hi, {greetingName}</h1>
                <p className="student-dash-hero-lead">
                  Manage campus pins, platform configuration, and privileged tools for the MySewa system.
                </p>
                <div className="student-dash-hero-actions">
                  <button
                    type="button"
                    className="student-dash-hero-btn student-dash-hero-btn--primary"
                    onClick={() => navigate('/admin/settings')}
                  >
                    Campus settings
                  </button>
                  <button
                    type="button"
                    className="student-dash-hero-btn student-dash-hero-btn--ghost"
                    onClick={() => navigate('/admin/settings')}
                  >
                    mySettings
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
                <section className="student-dash-v2-section" aria-labelledby="admin-dash-quick-heading">
                  <div className="student-dash-v2-section-head">
                    <h2 id="admin-dash-quick-heading" className="student-dash-v2-section-title">
                      Quick access
                    </h2>
                    <button type="button" className="student-dash-v2-section-link" onClick={() => navigate('/admin/settings')}>
                      Open mySettings
                    </button>
                  </div>
                  <p className="student-dash-v2-section-lead">Administrator-only shortcuts — same navigation as the sidebar menu.</p>
                  <div className="student-dash-quick-actions-grid student-dash-v2-actions">
                    {ADMIN_QUICK_ACTIONS.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="student-dash-action-card student-dash-action-card--v2"
                        onClick={() => navigate(a.path)}
                      >
                        <span className="student-dash-action-icon student-dash-action-icon--v2">
                          <AdminQuickIcon name={a.icon} />
                        </span>
                        <span className="student-dash-action-title">{a.title}</span>
                        <span className="student-dash-action-hint">{a.hint}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="student-dash-v2-section" aria-labelledby="admin-dash-stats-heading">
                  <div className="student-dash-v2-section-head">
                    <h2 id="admin-dash-stats-heading" className="student-dash-v2-section-title">
                      Platform statistics
                    </h2>
                  </div>
                  <p className="student-dash-v2-section-lead">
                    Snapshot of registered users, listings, applications, and universities (prototype counts).
                  </p>
                  {statsLoading ? <p className="auth-toast">Loading statistics…</p> : null}
                  {!statsLoading && stats ? (
                    <>
                      <div className="admin-dash-charts-row">
                        <AdminPieChart
                          title="Users by role"
                          slices={[
                            { label: 'Students', value: stats.usersStudents, color: '#2563eb' },
                            { label: 'Landlords', value: stats.usersLandlords, color: '#ea580c' },
                            { label: 'Admins', value: stats.usersAdmins, color: '#64748b' },
                          ]}
                        />
                        <AdminPieChart
                          title="Applications by status"
                          slices={[
                            { label: 'Pending', value: stats.applicationsPending, color: '#ca8a04' },
                            { label: 'Accepted', value: stats.applicationsAccepted, color: '#16a34a' },
                            { label: 'Rejected', value: stats.applicationsRejected, color: '#dc2626' },
                          ]}
                        />
                        <AdminBarTotals stats={stats} />
                      </div>
                    <div className="admin-stats-grid" aria-label="Platform statistics">
                      <div className="admin-stat-card">
                        <span className="admin-stat-value">{stats.usersTotal}</span>
                        <span className="admin-stat-label">Users (all)</span>
                      </div>
                      <div className="admin-stat-card">
                        <span className="admin-stat-value">{stats.usersStudents}</span>
                        <span className="admin-stat-label">Students</span>
                      </div>
                      <div className="admin-stat-card">
                        <span className="admin-stat-value">{stats.usersLandlords}</span>
                        <span className="admin-stat-label">Landlords</span>
                      </div>
                      <div className="admin-stat-card">
                        <span className="admin-stat-value">{stats.usersAdmins}</span>
                        <span className="admin-stat-label">Admins</span>
                      </div>
                      <div className="admin-stat-card">
                        <span className="admin-stat-value">{stats.propertiesTotal}</span>
                        <span className="admin-stat-label">Properties</span>
                      </div>
                      <div className="admin-stat-card">
                        <span className="admin-stat-value">{stats.applicationsTotal}</span>
                        <span className="admin-stat-label">Applications</span>
                      </div>
                      <div className="admin-stat-card">
                        <span className="admin-stat-value">{stats.applicationsPending}</span>
                        <span className="admin-stat-label">Pending apps</span>
                      </div>
                      <div className="admin-stat-card">
                        <span className="admin-stat-value">{stats.applicationsAccepted}</span>
                        <span className="admin-stat-label">Accepted</span>
                      </div>
                      <div className="admin-stat-card">
                        <span className="admin-stat-value">{stats.applicationsRejected}</span>
                        <span className="admin-stat-label">Rejected</span>
                      </div>
                      <div className="admin-stat-card">
                        <span className="admin-stat-value">{stats.universitiesTotal}</span>
                        <span className="admin-stat-label">Universities</span>
                      </div>
                    </div>
                    </>
                  ) : null}
                </section>

                <section className="student-dash-v2-section" aria-labelledby="admin-dash-users-heading">
                  <div className="student-dash-v2-section-head">
                    <h2 id="admin-dash-users-heading" className="student-dash-v2-section-title">
                      User accounts
                    </h2>
                    <span className="student-dash-v2-section-lead admin-users-count-pill">
                      {usersLoading ? '…' : `${users.length} shown${usersTotal > users.length ? ` of ${usersTotal}` : ''}`}
                    </span>
                  </div>
                  <p className="student-dash-v2-section-lead">
                    Activate or suspend accounts (suspended users cannot sign in). You cannot suspend your own admin
                    session.
                  </p>
                  {usersLoading ? <p className="auth-toast">Loading users…</p> : null}
                  {!usersLoading && users.length === 0 ? (
                    <div className="student-dash-card student-rental-empty">
                      <p>No users returned.</p>
                    </div>
                  ) : null}
                  {!usersLoading && users.length > 0 ? (
                    <div className="admin-users-table-wrap">
                      <table className="admin-users-table">
                        <thead>
                          <tr>
                            <th scope="col">ID</th>
                            <th scope="col">Email</th>
                            <th scope="col">Name</th>
                            <th scope="col">Role</th>
                            <th scope="col">Verified</th>
                            <th scope="col">Account</th>
                            <th scope="col">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => {
                            const st = String(u.accountStatus || 'active').toLowerCase()
                            const isSelf = Number(u.id) === Number(user.id)
                            const busy = accountStatusSavingId === u.id
                            return (
                              <tr key={u.id}>
                                <td>{u.id}</td>
                                <td title={u.email}>{u.email}</td>
                                <td>{u.fullName || '—'}</td>
                                <td>{u.role || '—'}</td>
                                <td>{u.verified ? 'Yes' : 'No'}</td>
                                <td>
                                  <span className={`admin-user-status admin-user-status--${st}`}>{st}</span>
                                </td>
                                <td>
                                  <div className="admin-user-actions">
                                    {st !== 'suspended' ? (
                                      <button
                                        type="button"
                                        className="admin-user-action-btn admin-user-action-btn--danger"
                                        disabled={busy || isSelf}
                                        title={isSelf ? 'Use another admin account to suspend yourself' : 'Suspend user'}
                                        onClick={() => updateUserAccountStatus(u.id, 'suspended')}
                                      >
                                        {busy ? '…' : 'Suspend'}
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="admin-user-action-btn"
                                        disabled={busy}
                                        onClick={() => updateUserAccountStatus(u.id, 'active')}
                                      >
                                        {busy ? '…' : 'Activate'}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </section>

                <section className="student-dash-v2-section" aria-labelledby="admin-dash-overview-heading">
                  <div className="student-dash-v2-section-head">
                    <h2 id="admin-dash-overview-heading" className="student-dash-v2-section-title">
                      Overview
                    </h2>
                  </div>
                  <p className="student-dash-v2-section-lead">
                    Campus coordinates in MySQL drive road-distance calculations on landlord property forms.
                  </p>
                  <div className="student-dash-quick-views-grid student-dash-v2-views">
                    <div className="student-dash-view-card">
                      <h3 className="student-dash-view-title">Campus coordinates</h3>
                      <p className="student-dash-view-body">
                        Pin UMT, UniSZA, ILPKT, and IPGM in mySettings. Road distances on listings use these fixed points.
                      </p>
                      <button type="button" className="student-dash-view-link" onClick={() => navigate('/admin/settings')}>
                        Open mySettings →
                      </button>
                    </div>
                    <div className="student-dash-view-card">
                      <h3 className="student-dash-view-title">Data explorer</h3>
                      <p className="student-dash-view-body">
                        Inspect users, properties, applications, and universities in a grid with safe edits — no phpMyAdmin
                        required.
                      </p>
                      <button type="button" className="student-dash-view-link" onClick={() => navigate('/admin/database')}>
                        Open myDatabase →
                      </button>
                    </div>
                    <div className="student-dash-view-card">
                      <h3 className="student-dash-view-title">Public site</h3>
                      <p className="student-dash-view-body">
                        Preview the student-facing landing page and search experience.
                      </p>
                      <button type="button" className="student-dash-view-link" onClick={() => navigate('/')}>
                        View Home →
                      </button>
                    </div>
                  </div>
                </section>
              </div>

              <aside className="student-dash-v2-aside" aria-label="Administrator summary">
                <div className="student-dash-widget">
                  <h3 className="student-dash-widget-title">Your account</h3>
                  <dl className="student-dash-widget-dl">
                    <div className="student-dash-widget-row">
                      <dt>Email</dt>
                      <dd title={user.email}>{user.email}</dd>
                    </div>
                    <div className="student-dash-widget-row">
                      <dt>Role</dt>
                      <dd>{roleLabel}</dd>
                    </div>
                    <div className="student-dash-widget-row">
                      <dt>Name</dt>
                      <dd title={user.fullName || undefined}>{user.fullName || '—'}</dd>
                    </div>
                  </dl>
                </div>
                <div className="student-dash-widget student-dash-widget--accent">
                  <h3 className="student-dash-widget-title">Campus pins</h3>
                  <p className="student-dash-widget-body">
                    After moving a pin, save it so property listings pick up the new road distances on the next edit.
                  </p>
                  <button type="button" className="student-dash-widget-cta" onClick={() => navigate('/admin/settings')}>
                    Edit campuses →
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
