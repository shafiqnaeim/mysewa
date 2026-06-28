import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  HomeIcon,
  HomeModernIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  StarIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const MAIN_ITEMS = [
  { to: '/dashboard/student', label: 'Dashboard', icon: HomeIcon, end: true },
  { to: '/properties', label: 'Search Listings', icon: MagnifyingGlassIcon },
]

const MANAGEMENT_ITEMS = [
  {
    to: '/dashboard/student/bookings',
    label: 'My Bookings',
    icon: ClipboardDocumentListIcon,
    badge: true,
  },
  { to: '/dashboard/student/property', label: 'My Property', icon: HomeModernIcon },
  { to: '/dashboard/student/payments', label: 'Payments', icon: CreditCardIcon },
]

const ACTIVITY_ITEMS = [
  { to: '/dashboard/student/reviews', label: 'Reviews', icon: StarIcon },
  { to: '/dashboard/student/saved', label: 'Saved Properties', icon: HeartIcon },
  { to: '/dashboard/student/reports', label: 'Reports', icon: ExclamationTriangleIcon },
]

const ACCOUNT_ITEMS = [
  { to: '/dashboard/student/account', label: 'My Account', icon: UserCircleIcon },
  { to: '/dashboard/student/verification', label: 'Verification', icon: ShieldCheckIcon },
]

function normalizePath(pathname) {
  if (!pathname) return '/'
  if (pathname.endsWith('/') && pathname !== '/') return pathname.slice(0, -1)
  return pathname
}

function getInitials(name) {
  const parts = String(name || 'S').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'S'
  return parts[0][0].toUpperCase()
}

function NavItem({ item, pendingCount, onNavigate }) {
  const location = useLocation()
  const path = normalizePath(location.pathname)

  const isActive = item.match
    ? item.match(path)
    : item.end
      ? path === item.to
      : path === item.to || path.startsWith(`${item.to}/`)

  const Icon = item.icon

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={() =>
        [
          'group relative flex items-center gap-3 rounded-r-xl py-3 pl-4 pr-3 text-sm font-medium transition',
          isActive
            ? 'border-l-4 border-[#6C2BD9] bg-[#F3F0FF] font-semibold text-[#6C2BD9]'
            : 'border-l-4 border-transparent text-[#4B5563] hover:bg-[#F9F7FF]',
        ].join(' ')
      }
    >
      <Icon
        className={`h-5 w-5 shrink-0 ${
          isActive ? 'text-[#6C2BD9]' : 'text-[#9CA3AF] group-hover:text-[#8B5CF6]'
        }`}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && pendingCount > 0 ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F59E0B] px-1.5 text-[10px] font-bold text-white">
          {pendingCount > 99 ? '99+' : pendingCount}
        </span>
      ) : null}
    </NavLink>
  )
}

function NavGroup({ title, children }) {
  return (
    <div className="mt-4 first:mt-0">
      <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#8B5CF6]">{title}</p>
      <nav className="space-y-0.5">{children}</nav>
    </div>
  )
}

function SidebarPanel({ user, pendingCount, onNavigate, onLogout }) {
  const displayName = String(user?.fullName || 'Student').trim() || 'Student'
  const initials = getInitials(displayName)

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-[#E2E8F0] bg-gradient-to-r from-[#F9F7FF] to-white p-6">
        <p className="text-xl font-bold text-[#6C2BD9]">
          <span aria-hidden="true">🎓 </span>
          MySewa
        </p>
        <p className="mt-1 text-xs font-medium text-[#8B5CF6]">Student Housing</p>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <NavGroup title="Main">
          {MAIN_ITEMS.map((item) => (
            <NavItem key={item.to} item={item} pendingCount={pendingCount} onNavigate={onNavigate} />
          ))}
        </NavGroup>

        <NavGroup title="Management">
          {MANAGEMENT_ITEMS.map((item) => (
            <NavItem key={item.to} item={item} pendingCount={pendingCount} onNavigate={onNavigate} />
          ))}
        </NavGroup>

        <NavGroup title="Activity">
          {ACTIVITY_ITEMS.map((item) => (
            <NavItem key={item.to} item={item} pendingCount={pendingCount} onNavigate={onNavigate} />
          ))}
        </NavGroup>

        <NavGroup title="Account">
          {ACCOUNT_ITEMS.map((item) => (
            <NavItem key={item.to} item={item} pendingCount={pendingCount} onNavigate={onNavigate} />
          ))}
        </NavGroup>
      </div>

      <div className="border-t border-[#E2E8F0] p-4">
        <div className="mb-3 rounded-xl border border-[#E2E8F0] bg-[#F9F7FF] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#6C2BD9] text-sm font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#1A1A2E]">{displayName}</p>
              <span className="mt-1 inline-flex rounded-full bg-[#F3F0FF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#6C2BD9]">
                Student
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#4B5563] transition hover:bg-[#FFF5F5] hover:text-[#EF4444]"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  )
}

export default function StudentSidebar({ mobileOpen, onClose }) {
  const navigate = useNavigate()
  const [pendingCount, setPendingCount] = useState(0)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('mysewa_token')
    if (!token) return

    let cancelled = false

    async function loadSidebarData() {
      try {
        const [meRes, appRes] = await Promise.all([
          fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/v1/applications/for-student', { headers: { Authorization: `Bearer ${token}` } }),
        ])

        const meData = await meRes.json().catch(() => ({}))
        if (!cancelled && meRes.ok && meData.user) setUser(meData.user)

        const appData = await appRes.json().catch(() => ({}))
        if (!cancelled && appRes.ok) {
          const items = Array.isArray(appData.items) ? appData.items : []
          const pending = items.filter((a) => String(a.status || '').toLowerCase() === 'pending').length
          setPendingCount(pending)
        }
      } catch {
        /* ignore */
      }
    }

    loadSidebarData()
    return () => {
      cancelled = true
    }
  }, [])

  function handleLogout() {
    localStorage.removeItem('mysewa_token')
    navigate('/')
  }

  return (
    <aside
      className={`fixed left-0 top-0 z-50 h-full w-[260px] border-r border-[#E2E8F0] bg-white shadow-lg transition-transform duration-200 lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      aria-label="Student navigation"
    >
      <SidebarPanel
        user={user}
        pendingCount={pendingCount}
        onNavigate={onClose}
        onLogout={handleLogout}
      />
    </aside>
  )
}

export function StudentMobileHeader({ onOpenMenu, onCloseMenu, menuOpen }) {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 lg:hidden">
      <button
        type="button"
        onClick={menuOpen ? onCloseMenu : onOpenMenu}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#6C2BD9] hover:bg-[#F3F0FF]"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
      >
        {menuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
      </button>
      <p className="text-base font-bold text-[#6C2BD9]">
        <span aria-hidden="true">🎓 </span>
        MySewa
      </p>
      <div className="w-10" aria-hidden="true" />
    </header>
  )
}
