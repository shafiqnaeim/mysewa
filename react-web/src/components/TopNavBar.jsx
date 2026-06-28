import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { dashboardPathForRole, normalizeRole } from '../auth/dashboardPaths'
import { ADMIN_NAV_ITEMS } from '../admin/adminNav'

function StudentDrawerIcon({ name }) {
  const p = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }
  if (name === 'search') {
    return (
      <svg {...p}>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4.3-4.3" />
      </svg>
    )
  }
  if (name === 'home') {
    return (
      <svg {...p}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    )
  }
  if (name === 'dashboard') {
    return (
      <svg {...p}>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    )
  }
  if (name === 'property') {
    return (
      <svg {...p}>
        <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
        <path d="M9 9v0M9 13v0M9 17v0M13 13v0M13 17v0" />
      </svg>
    )
  }
  if (name === 'application') {
    return (
      <svg {...p}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M8 13h8M8 17h8M8 9h2" />
      </svg>
    )
  }
  if (name === 'account') {
    return (
      <svg {...p}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )
  }
  if (name === 'settings') {
    return (
      <svg {...p}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    )
  }
  if (name === 'database') {
    return (
      <svg {...p}>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
        <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
      </svg>
    )
  }
  return null
}

export default function TopNavBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentUser, setCurrentUser] = useState(null)
  const [studentDrawerOpen, setStudentDrawerOpen] = useState(false)
  const [studentProfileOpen, setStudentProfileOpen] = useState(false)
  const [studentNotifyOpen, setStudentNotifyOpen] = useState(false)
  const [landingScrolled, setLandingScrolled] = useState(false)

  const drawerRef = useRef(null)
  const profileMenuRef = useRef(null)
  const notifyMenuRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('mysewa_token')
    if (!token) {
      setCurrentUser(null)
      return undefined
    }
    let cancelled = false
    async function loadMe() {
      try {
        const res = await fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) {
          if (!cancelled) setCurrentUser(null)
          return
        }
        const data = await res.json()
        if (!cancelled) setCurrentUser(data.user || null)
      } catch {
        if (!cancelled) setCurrentUser(null)
      }
    }
    loadMe()
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  function closeStudentOverlays() {
    setStudentDrawerOpen(false)
    setStudentProfileOpen(false)
    setStudentNotifyOpen(false)
  }

  useEffect(() => {
    setStudentDrawerOpen(false)
    setStudentProfileOpen(false)
    setStudentNotifyOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!studentDrawerOpen && !studentProfileOpen && !studentNotifyOpen) return undefined
    function onKey(e) {
      if (e.key === 'Escape') closeStudentOverlays()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [studentDrawerOpen, studentProfileOpen, studentNotifyOpen])

  useEffect(() => {
    if (!studentProfileOpen) return undefined
    function onPointerDown(e) {
      if (!profileMenuRef.current?.contains(e.target)) setStudentProfileOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [studentProfileOpen])

  useEffect(() => {
    if (!studentNotifyOpen) return undefined
    function onPointerDown(e) {
      if (!notifyMenuRef.current?.contains(e.target)) setStudentNotifyOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [studentNotifyOpen])

  function signOut() {
    localStorage.removeItem('mysewa_token')
    setCurrentUser(null)
    closeStudentOverlays()
    navigate('/')
  }

  const pathname = location.pathname
  const pathNorm = (pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname) || '/'
  const path = pathNorm

  const isHome = path === '/'
  const isDashboard = path.startsWith('/dashboard')
  const isAdmin = path === '/admin' || path.startsWith('/admin/')
  const isProperties =
    path.startsWith('/my-properties') || path.startsWith('/dashboard/landlord/properties')
  const role = String(currentUser?.role || '').toLowerCase()
  const dashTarget = currentUser ? dashboardPathForRole(currentUser.role) : '/dashboard'
  const isAccountArea = isDashboard || isAdmin

  const token = typeof window !== 'undefined' ? window.localStorage.getItem('mysewa_token') : ''
  const hasToken = Boolean(token?.length)

  const onStudentStudentNavPaths =
    pathNorm === '/' ||
    pathNorm === '/dashboard/student' ||
    pathNorm === '/dashboard/student/account' ||
    pathNorm === '/dashboard/student/property'

  const onLandlordNavPaths =
    pathNorm === '/' ||
    pathNorm === '/dashboard/landlord' ||
    pathNorm === '/dashboard/landlord/account' ||
    pathNorm === '/dashboard/landlord/properties' ||
    pathNorm === '/dashboard/landlord/applications' ||
    pathNorm === '/my-properties' ||
    pathNorm.startsWith('/my-properties/')

  const onAdminNavPaths =
    pathNorm === '/' ||
    pathNorm === '/admin' ||
    pathNorm === '/admin/universities' ||
    pathNorm === '/admin/settings'

  const isConfirmedStudent = Boolean(currentUser) && normalizeRole(currentUser.role) === 'student'
  const isConfirmedLandlord = Boolean(currentUser) && normalizeRole(currentUser.role) === 'landlord'
  const isConfirmedAdmin = Boolean(currentUser) && normalizeRole(currentUser.role) === 'admin'

  const studentMinimalNav = hasToken && isConfirmedStudent && onStudentStudentNavPaths

  const studentMinimalNavWhileLoadingStudentDash =
    hasToken &&
    !currentUser &&
    (pathNorm === '/dashboard/student' ||
      pathNorm === '/dashboard/student/account' ||
      pathNorm === '/dashboard/student/property')

  const landlordMinimalNav = hasToken && isConfirmedLandlord && onLandlordNavPaths

  const landlordMinimalNavWhileLoading =
    hasToken &&
    !currentUser &&
    (pathNorm === '/dashboard/landlord' ||
      pathNorm === '/dashboard/landlord/account' ||
      pathNorm === '/dashboard/landlord/properties' ||
    pathNorm === '/dashboard/landlord/applications' ||
      pathNorm === '/my-properties' ||
      pathNorm.startsWith('/my-properties/'))

  const adminMinimalNav = hasToken && isConfirmedAdmin && onAdminNavPaths

  const adminMinimalNavWhileLoading =
    hasToken &&
    !currentUser &&
    (pathNorm === '/admin' || pathNorm === '/admin/universities' || pathNorm === '/admin/settings')

  const compactDashNavLayout =
    studentMinimalNav ||
    studentMinimalNavWhileLoadingStudentDash ||
    landlordMinimalNav ||
    landlordMinimalNavWhileLoading ||
    adminMinimalNav ||
    adminMinimalNavWhileLoading

  const isLandingGuest = isHome && !currentUser && !compactDashNavLayout

  useEffect(() => {
    if (!isLandingGuest) {
      setLandingScrolled(false)
      return undefined
    }
    const onScroll = () => setLandingScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isLandingGuest])

  const [localGreetingName, setLocalGreetingName] = useState('')
  const [studentAvatarUrl, setStudentAvatarUrl] = useState('')

  useEffect(() => {
    function readStoredDashProfile() {
      if (!currentUser?.id) {
        setLocalGreetingName('')
        setStudentAvatarUrl('')
        return
      }
      const nr = normalizeRole(currentUser.role)
      if (nr !== 'student' && nr !== 'landlord' && nr !== 'admin') {
        setLocalGreetingName('')
        setStudentAvatarUrl('')
        return
      }
      try {
        if (nr === 'student') {
          setLocalGreetingName(localStorage.getItem(`mysewa_student_nickname_${currentUser.id}`) || '')
          setStudentAvatarUrl(localStorage.getItem(`mysewa_student_avatar_${currentUser.id}`) || '')
        } else if (nr === 'landlord') {
          setLocalGreetingName(localStorage.getItem(`mysewa_landlord_nickname_${currentUser.id}`) || '')
          setStudentAvatarUrl(localStorage.getItem(`mysewa_landlord_avatar_${currentUser.id}`) || '')
        } else {
          setLocalGreetingName(localStorage.getItem(`mysewa_admin_nickname_${currentUser.id}`) || '')
          setStudentAvatarUrl(localStorage.getItem(`mysewa_admin_avatar_${currentUser.id}`) || '')
        }
      } catch {
        setLocalGreetingName('')
        setStudentAvatarUrl('')
      }
    }
    readStoredDashProfile()
    async function onProfileSaved() {
      readStoredDashProfile()
      const token = localStorage.getItem('mysewa_token')
      if (!token) return
      try {
        const res = await fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return
        const data = await res.json()
        setCurrentUser(data.user || null)
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('mysewa-local-profile-saved', onProfileSaved)
    return () => window.removeEventListener('mysewa-local-profile-saved', onProfileSaved)
  }, [currentUser?.id, currentUser?.role, location.pathname])

  const dashFirstName = useMemo(() => {
    if (!currentUser) return 'User'
    const nr = normalizeRole(currentUser.role)
    if (nr === 'student' || nr === 'landlord' || nr === 'admin') {
      const fallback = nr === 'admin' ? 'Administrator' : 'User'
      return localGreetingName || currentUser.fullName?.split(/\s+/).filter(Boolean)[0] || fallback
    }
    return currentUser.fullName?.split(/\s+/).filter(Boolean)[0] || 'User'
  }, [currentUser, localGreetingName])

  const profileInitials = useMemo(() => {
    const parts = String(currentUser?.fullName || 'User').trim().split(/\s+/).filter(Boolean)
    if (!parts.length) return 'U'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }, [currentUser?.fullName])

  const topbarClass = [
    'topbar',
    'topbar--story',
    isLandingGuest ? 'topbar--landing' : '',
    isLandingGuest && !landingScrolled ? 'topbar--hero' : '',
    compactDashNavLayout ? 'topbar-student-dash' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <header className={topbarClass}>
        <div className="topbar-inner">
          <div
            className={`navpill${compactDashNavLayout ? ' navpill-student-dash' : ''}${isLandingGuest ? ' navpill-landing' : ''}`}
          >
            {compactDashNavLayout ? (
              <>
                <div className="student-dash-nav-left">
                  <button
                    type="button"
                    className="student-nav-hamburger"
                    aria-expanded={studentDrawerOpen}
                    aria-controls="student-nav-drawer"
                    aria-label="Open navigation menu"
                    onClick={() => {
                      setStudentProfileOpen(false)
                      setStudentNotifyOpen(false)
                      setStudentDrawerOpen((o) => !o)
                    }}
                  >
                    <span className="student-nav-hamburger-bars" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                  </button>
                  <button type="button" className="logo logo-link" onClick={() => navigate('/')}>
                    MySewa
                  </button>
                </div>

                <div className="student-dash-nav-right">
                  <div className="student-nav-notify-wrap" ref={notifyMenuRef}>
                    <button
                      type="button"
                      className="student-nav-notify-btn"
                      aria-expanded={studentNotifyOpen}
                      aria-haspopup="true"
                      aria-controls="student-notify-popover"
                      aria-label="Notifications"
                      onClick={() => {
                        setStudentDrawerOpen(false)
                        setStudentProfileOpen(false)
                        setStudentNotifyOpen((o) => !o)
                      }}
                    >
                      <span className="student-nav-notify-dot" aria-hidden="true" />
                      <svg className="student-nav-notify-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
                        />
                      </svg>
                    </button>
                    {studentNotifyOpen ? (
                      <div id="student-notify-popover" className="student-nav-notify-panel" role="dialog" aria-label="Notifications">
                        <p className="student-nav-notify-title">Notifications</p>
                        <p className="student-nav-notify-empty">You&apos;re all caught up — no new alerts.</p>
                      </div>
                    ) : null}
                  </div>
                  <span className="student-dash-greeting">Hi, {dashFirstName}</span>
                  <div className="student-profile-wrap" ref={profileMenuRef}>
                    <button
                      type="button"
                      className="student-profile-trigger"
                      aria-expanded={studentProfileOpen}
                      aria-haspopup="menu"
                      aria-controls="student-profile-menu"
                      aria-label="Account menu"
                      onClick={() => {
                        setStudentDrawerOpen(false)
                        setStudentNotifyOpen(false)
                        setStudentProfileOpen((o) => !o)
                      }}
                    >
                      <span className="student-profile-avatar" aria-hidden="true">
                        {studentAvatarUrl ? (
                          <img src={studentAvatarUrl} alt="" className="student-profile-avatar-img" />
                        ) : (
                          profileInitials
                        )}
                      </span>
                    </button>
                    {studentProfileOpen ? (
                      <div id="student-profile-menu" role="menu" className="student-profile-dropdown">
                        <div className="student-profile-dropdown-head">
                          <p className="student-profile-dropdown-name">
                            {currentUser?.fullName || dashFirstName}
                          </p>
                          <p className="student-profile-dropdown-email">{currentUser?.email || '—'}</p>
                        </div>
                        <div className="student-profile-dropdown-divider" role="separator" />
                        <button
                          type="button"
                          role="menuitem"
                          className="student-profile-dropdown-item student-profile-dropdown-item--danger"
                          onClick={signOut}
                        >
                          Sign Out
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </>
            ) : isLandingGuest ? (
              <>
                <div className="nav-left">
                  <button type="button" className="logo logo-link" onClick={() => navigate('/')}>
                    MySewa
                  </button>
                </div>

                <div className="nav-right landing-nav-actions">
                  <button type="button" className="nav-btn nav-btn-ghost" onClick={() => navigate('/signin')}>
                    Sign In
                  </button>
                  <button type="button" className="nav-btn nav-btn-accent" onClick={() => navigate('/signup')}>
                    List Your Property
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="nav-left">
                  <button type="button" className="logo logo-link" onClick={() => navigate('/')}>
                    MySewa
                  </button>
                  {currentUser ? (
                    <>
                      <button
                        type="button"
                        className={`nav-btn${isAccountArea ? ' nav-btn-active' : ''}`}
                        onClick={() => navigate(dashTarget)}
                      >
                        Account
                      </button>
                      <button type="button" className="nav-btn nav-btn-signout" onClick={signOut}>
                        Sign Out
                      </button>
                    </>
                  ) : null}
                </div>
                <div className="nav-right">
                  {currentUser ? (
                    <>
                      <span className="nav-user">Hi, {currentUser.fullName?.split(' ')[0] || 'User'}</span>
                      <button
                        type="button"
                        className={`nav-btn${isHome ? ' nav-btn-active' : ''}`}
                        onClick={() => navigate('/')}
                      >
                        Home
                      </button>
                      {role === 'landlord' ? (
                        <button
                          type="button"
                          className={`nav-btn${isProperties ? ' nav-btn-active' : ''}`}
                          onClick={() => navigate('/dashboard/landlord/properties')}
                        >
                          My Properties
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={`nav-btn${isAccountArea ? ' nav-btn-active' : ''}`}
                        onClick={() => navigate('/dashboard')}
                      >
                        Dashboard
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="nav-btn nav-btn-ghost" onClick={() => navigate('/signin')}>
                        Sign In
                      </button>
                      <button type="button" className="nav-btn nav-btn-accent" onClick={() => navigate('/signup')}>
                        Sign Up
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {compactDashNavLayout && studentDrawerOpen ? (
        <>
          <button
            type="button"
            className="student-drawer-backdrop"
            aria-label="Close navigation menu"
            tabIndex={-1}
            onClick={() => setStudentDrawerOpen(false)}
          />
          <aside
            id="student-nav-drawer"
            ref={drawerRef}
            className="student-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="student-drawer-head">
              <span className="student-drawer-title">Menu</span>
              <button
                type="button"
                className="student-drawer-close"
                aria-label="Close menu"
                onClick={() => setStudentDrawerOpen(false)}
              >
                ×
              </button>
            </div>
            <nav className="student-drawer-nav" aria-label="Quick links">
              {isConfirmedAdmin || adminMinimalNavWhileLoading ? (
                <>
                  {ADMIN_NAV_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="student-drawer-link"
                      onClick={() => {
                        setStudentDrawerOpen(false)
                        navigate(item.path)
                      }}
                    >
                      <span className="student-drawer-link-ico">
                        <StudentDrawerIcon name={item.icon} />
                      </span>
                      {item.label}
                    </button>
                  ))}
                </>
              ) : isConfirmedLandlord || landlordMinimalNavWhileLoading ? (
                <>
                  <button
                    type="button"
                    className="student-drawer-link"
                    onClick={() => {
                      setStudentDrawerOpen(false)
                      navigate('/')
                    }}
                  >
                    <span className="student-drawer-link-ico">
                      <StudentDrawerIcon name="home" />
                    </span>
                    Home
                  </button>
                  <button
                    type="button"
                    className="student-drawer-link"
                    onClick={() => {
                      setStudentDrawerOpen(false)
                      navigate('/dashboard/landlord')
                    }}
                  >
                    <span className="student-drawer-link-ico">
                      <StudentDrawerIcon name="dashboard" />
                    </span>
                    myDashboard
                  </button>
                  <button
                    type="button"
                    className="student-drawer-link"
                    onClick={() => {
                      setStudentDrawerOpen(false)
                      navigate('/dashboard/landlord/properties')
                    }}
                  >
                    <span className="student-drawer-link-ico">
                      <StudentDrawerIcon name="property" />
                    </span>
                    myProperty
                  </button>
                  <button
                    type="button"
                    className="student-drawer-link"
                    onClick={() => {
                      setStudentDrawerOpen(false)
                      navigate('/dashboard/landlord/account')
                    }}
                  >
                    <span className="student-drawer-link-ico">
                      <StudentDrawerIcon name="account" />
                    </span>
                    myAccount
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="student-drawer-link"
                    onClick={() => {
                      setStudentDrawerOpen(false)
                      navigate('/')
                    }}
                  >
                    <span className="student-drawer-link-ico">
                      <StudentDrawerIcon name="home" />
                    </span>
                    Home
                  </button>
                  <button
                    type="button"
                    className="student-drawer-link"
                    onClick={() => {
                      setStudentDrawerOpen(false)
                      navigate('/dashboard/student')
                    }}
                  >
                    <span className="student-drawer-link-ico">
                      <StudentDrawerIcon name="dashboard" />
                    </span>
                    myDashboard
                  </button>
                  <button
                    type="button"
                    className="student-drawer-link"
                    onClick={() => {
                      setStudentDrawerOpen(false)
                      navigate('/dashboard/student/property')
                    }}
                  >
                    <span className="student-drawer-link-ico">
                      <StudentDrawerIcon name="property" />
                    </span>
                    myProperty
                  </button>
                  <button
                    type="button"
                    className="student-drawer-link"
                    onClick={() => {
                      setStudentDrawerOpen(false)
                      navigate('/dashboard/student/account')
                    }}
                  >
                    <span className="student-drawer-link-ico">
                      <StudentDrawerIcon name="account" />
                    </span>
                    myAccount
                  </button>
                </>
              )}
            </nav>
          </aside>
        </>
      ) : null}
    </>
  )
}
