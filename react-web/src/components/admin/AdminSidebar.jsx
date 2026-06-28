import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BellIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ChartPieIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const MAIN_ITEMS = [
  { to: '/dashboard/admin', label: 'Dashboard', icon: ChartPieIcon, end: true },
  { to: '/dashboard/admin/users', label: 'Users', icon: UsersIcon },
  { to: '/dashboard/admin/properties', label: 'Properties', icon: BuildingOfficeIcon },
  {
    to: '/dashboard/admin/verification',
    label: 'Verify Users',
    icon: ShieldCheckIcon,
    badgeKey: 'verification',
  },
]

const MANAGEMENT_ITEMS = [
  { to: '/dashboard/admin/bookings', label: 'Bookings', icon: ClipboardDocumentListIcon },
  { to: '/dashboard/admin/payments', label: 'Payments', icon: CurrencyDollarIcon },
  { to: '/dashboard/admin/reports', label: 'Reports', icon: ChartBarIcon },
  { to: '/dashboard/admin/database', label: 'Database', icon: ServerStackIcon },
]

const SYSTEM_ITEMS = [
  { to: '/dashboard/admin/settings', label: 'Settings', icon: Cog6ToothIcon },
  { to: '/dashboard/admin/logs', label: 'System Logs', icon: DocumentTextIcon },
  { to: '/dashboard/admin/notifications', label: 'Notifications', icon: BellIcon },
]

const ACCOUNT_ITEMS = [
  { to: '/dashboard/admin/account', label: 'My Account', icon: UserCircleIcon },
]

function normalizePath(pathname) {
  if (!pathname) return '/'
  if (pathname.endsWith('/') && pathname !== '/') return pathname.slice(0, -1)
  return pathname
}

function getInitials(name) {
  const parts = String(name || 'A').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'A'
  return parts[0][0].toUpperCase()
}

function NavItem({ item, badges, onNavigate, compact }) {
  const location = useLocation()
  const path = normalizePath(location.pathname)

  const isActive = item.match
    ? item.match(path)
    : item.end
      ? path === item.to
      : path === item.to || path.startsWith(`${item.to}/`)

  const Icon = item.icon
  const badgeCount = item.badgeKey ? badges[item.badgeKey] || 0 : 0

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={compact ? item.label : undefined}
      className={() =>
        [
          'group relative flex items-center gap-3 rounded-r-lg py-3 text-sm font-medium transition',
          compact ? 'justify-center px-2' : 'pl-4 pr-3',
          isActive
            ? 'border-l-4 border-[#DC2626] bg-[#FEF2F2] font-semibold text-[#DC2626]'
            : 'border-l-4 border-transparent text-[#4B5563] hover:bg-[#FEF2F2]',
        ].join(' ')
      }
    >
      <Icon
        className={`h-5 w-5 shrink-0 ${
          isActive ? 'text-[#DC2626]' : 'text-[#9CA3AF] group-hover:text-[#4B5563]'
        }`}
      />
      {!compact ? <span className="flex-1 truncate">{item.label}</span> : null}
      {!compact && badgeCount > 0 ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#DC2626] px-1.5 text-[10px] font-bold text-white">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      ) : null}
      {compact && badgeCount > 0 ? (
        <span className="absolute right-1 top-2 h-2 w-2 rounded-full bg-[#DC2626]" aria-hidden="true" />
      ) : null}
    </NavLink>
  )
}

function NavGroup({ title, children, compact }) {
  if (compact) {
    return <nav className="mt-2 space-y-0.5 border-t border-[#E2E8F0] pt-2 first:mt-0 first:border-t-0 first:pt-0">{children}</nav>
  }
  return (
    <div className="mt-4 first:mt-0">
      <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#991B1B]">{title}</p>
      <nav className="space-y-0.5">{children}</nav>
    </div>
  )
}

function SidebarPanel({ user, badges, onNavigate, onLogout, compact }) {
  const displayName = useMemo(() => {
    const full = String(user?.fullName || '').trim()
    if (full) return full
    return 'System Administrator'
  }, [user?.fullName])

  const initials = getInitials(displayName)

  const renderItems = (items) =>
    items.map((item) => (
      <NavItem key={item.to} item={item} badges={badges} onNavigate={onNavigate} compact={compact} />
    ))

  return (
    <div className="flex h-full flex-col bg-white">
      <div className={`border-b border-[#E2E8F0] ${compact ? 'p-3 text-center' : 'p-6'}`}>
        {compact ? (
          <p className="text-lg" aria-hidden="true">
            ⚙️
          </p>
        ) : (
          <>
            <p className="text-xl font-bold text-[#DC2626]">
              <span aria-hidden="true">⚙️ </span>
              MySewa
            </p>
            <p className="mt-1 text-xs font-medium text-[#991B1B]">Admin Panel</p>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <NavGroup title="Main" compact={compact}>
          {renderItems(MAIN_ITEMS)}
        </NavGroup>
        <NavGroup title="Management" compact={compact}>
          {renderItems(MANAGEMENT_ITEMS)}
        </NavGroup>
        <NavGroup title="System" compact={compact}>
          {renderItems(SYSTEM_ITEMS)}
        </NavGroup>
        <NavGroup title="Account" compact={compact}>
          {renderItems(ACCOUNT_ITEMS)}
        </NavGroup>
      </div>

      <div className="border-t border-[#E2E8F0] p-4">
        {!compact ? (
          <div className="mb-3 rounded-xl border border-[#E2E8F0] bg-[#FEF2F2] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#DC2626] text-sm font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#1A1A2E]">{displayName}</p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#DC2626]">
                  <span aria-hidden="true">🔴</span> Admin
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-3 flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DC2626] text-sm font-bold text-white">
              {initials}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onLogout}
          title="Logout"
          className={`flex w-full items-center gap-3 rounded-lg text-sm font-medium text-[#4B5563] transition hover:bg-[#FEF2F2] hover:text-[#DC2626] ${
            compact ? 'justify-center px-2 py-3' : 'px-4 py-3'
          }`}
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5 shrink-0" />
          {!compact ? (
            <>
              <span aria-hidden="true">🚪 </span>
              Logout
            </>
          ) : null}
        </button>
      </div>
    </div>
  )
}

export default function AdminSidebar({ mobileOpen, onClose }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [verificationPending, setVerificationPending] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem('mysewa_token')
    if (!token) return

    let cancelled = false

    async function loadSidebarData() {
      try {
        const [meRes, pendingRes] = await Promise.all([
          fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/v1/admin/verifications/pending', { headers: { Authorization: `Bearer ${token}` } }),
        ])

        const meData = await meRes.json().catch(() => ({}))
        if (!cancelled && meRes.ok && meData.user) setUser(meData.user)

        const pendingData = await pendingRes.json().catch(() => ({}))
        if (!cancelled && pendingRes.ok) {
          setVerificationPending(Number(pendingData.count) || 0)
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

  const badges = useMemo(() => ({ verification: verificationPending }), [verificationPending])

  function handleLogout() {
    localStorage.removeItem('mysewa_token')
    navigate('/')
  }

  return (
    <>
      {/* Full sidebar — desktop */}
      <aside
        className={`fixed left-0 top-0 z-50 hidden h-full w-[260px] border-r border-[#E2E8F0] bg-white shadow-lg lg:block`}
        aria-label="Admin navigation"
      >
        <SidebarPanel user={user} badges={badges} onNavigate={onClose} onLogout={handleLogout} compact={false} />
      </aside>

      {/* Icon rail — small tablets */}
      <aside
        className="fixed left-0 top-0 z-50 hidden h-full w-16 border-r border-[#E2E8F0] bg-white shadow-lg sm:block lg:hidden"
        aria-label="Admin navigation compact"
      >
        <SidebarPanel user={user} badges={badges} onNavigate={onClose} onLogout={handleLogout} compact />
      </aside>

      {/* Mobile drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-[260px] border-r border-[#E2E8F0] bg-white shadow-lg transition-transform duration-200 sm:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Admin navigation mobile"
      >
        <SidebarPanel user={user} badges={badges} onNavigate={onClose} onLogout={handleLogout} compact={false} />
      </aside>
    </>
  )
}

export function AdminMobileHeader({ onOpenMenu, onCloseMenu, menuOpen }) {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 sm:hidden">
      <button
        type="button"
        onClick={menuOpen ? onCloseMenu : onOpenMenu}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#DC2626] hover:bg-[#FEF2F2]"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
      >
        {menuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
      </button>
      <p className="text-base font-bold text-[#DC2626]">
        <span aria-hidden="true">⚙️ </span>
        MySewa
      </p>
      <div className="w-10" aria-hidden="true" />
    </header>
  )
}
