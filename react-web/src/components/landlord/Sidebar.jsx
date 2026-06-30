import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BuildingOffice2Icon,
  ChartBarIcon,
  ChartPieIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  PlusCircleIcon,
  ShieldCheckIcon,
  StarIcon,
  UserCircleIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const MAIN_ITEMS = [
  { to: '/dashboard/landlord', label: 'Dashboard', icon: ChartPieIcon, end: true },
  {
    to: '/dashboard/landlord/properties',
    label: 'My Properties',
    icon: BuildingOffice2Icon,
    match: (path) =>
      path === '/dashboard/landlord/properties' ||
      /^\/dashboard\/landlord\/properties\/\d+\/edit$/.test(path),
  },
  {
    to: '/dashboard/landlord/properties/new',
    label: 'Add Property',
    icon: PlusCircleIcon,
    match: (path) => path === '/dashboard/landlord/properties/new',
  },
]

const MANAGEMENT_ITEMS = [
  {
    to: '/dashboard/landlord/applications',
    label: 'Applications',
    icon: ClipboardDocumentListIcon,
    badge: true,
  },
  { to: '/dashboard/landlord/maintenance', label: 'Maintenance', icon: WrenchScrewdriverIcon },
  { to: '/dashboard/landlord/payments', label: 'Payments', icon: CurrencyDollarIcon },
  { to: '/dashboard/landlord/reviews', label: 'Reviews', icon: StarIcon },
]

const ACCOUNT_ITEMS = [
  { to: '/dashboard/landlord/account', label: 'My Account', icon: UserCircleIcon },
  { to: '/dashboard/landlord/verification', label: 'Verification', icon: ShieldCheckIcon },
  { to: '/dashboard/landlord/reports', label: 'Reports', icon: ChartBarIcon },
]

function normalizePath(pathname) {
  if (!pathname) return '/'
  if (pathname.endsWith('/') && pathname !== '/') return pathname.slice(0, -1)
  return pathname
}

function getInitials(name) {
  const parts = String(name || 'Landlord').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'L'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
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
          'group relative flex items-center gap-3 rounded-r-lg py-3 pl-4 pr-3 text-sm font-medium transition',
          isActive
            ? 'border-l-4 border-[#E88D5B] bg-[#EBF4FF] font-semibold text-[#E88D5B]'
            : 'border-l-4 border-transparent text-[#4A5568] hover:bg-[#F7FAFC]',
        ].join(' ')
      }
    >
      <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-[#E88D5B]' : 'text-[#A0AEC0] group-hover:text-[#4A5568]'}`} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && pendingCount > 0 ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E53E3E] px-1.5 text-[10px] font-bold text-white">
          {pendingCount > 99 ? '99+' : pendingCount}
        </span>
      ) : null}
    </NavLink>
  )
}

function NavGroup({ title, children }) {
  return (
    <div className="mt-4">
      <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">{title}</p>
      <nav className="space-y-0.5">{children}</nav>
    </div>
  )
}

function SidebarPanel({ user, pendingCount, onNavigate, onLogout }) {
  const displayName = String(user?.fullName || 'Landlord').trim() || 'Landlord'
  const initials = getInitials(displayName)

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-[#E2E8F0] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2D3748] text-sm font-bold text-white">
            MS
          </div>
          <div>
            <p className="text-xl font-bold text-[#2D3748]">MySewa</p>
            <p className="text-xs text-[#A0AEC0]">House Rental System</p>
          </div>
        </div>
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

        <NavGroup title="Account">
          {ACCOUNT_ITEMS.map((item) => (
            <NavItem key={item.to} item={item} pendingCount={pendingCount} onNavigate={onNavigate} />
          ))}
        </NavGroup>
      </div>

      <div className="border-t border-[#E2E8F0] p-4">
        <div className="mb-3 rounded-xl border border-[#E2E8F0] bg-[#FFF8F3] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E88D5B] text-sm font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#2D3748]">{displayName}</p>
              <span className="mt-1 inline-flex rounded-full bg-[#E88D5B] px-2 py-0.5 text-xs font-semibold text-white">
                Landlord
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-[#4A5568] transition hover:bg-[#FFF5F5] hover:text-[#E53E3E]"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  )
}

export default function Sidebar({ mobileOpen, onClose }) {
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
          fetch('/api/v1/applications/for-landlord', { headers: { Authorization: `Bearer ${token}` } }),
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
    <>
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-[260px] border-r border-[#E2E8F0] bg-white shadow-lg transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Landlord navigation"
      >
        <SidebarPanel
          user={user}
          pendingCount={pendingCount}
          onNavigate={onClose}
          onLogout={handleLogout}
        />
      </aside>
    </>
  )
}

export function LandlordMobileHeader({ onOpenMenu, onCloseMenu, menuOpen }) {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 lg:hidden">
      <button
        type="button"
        onClick={menuOpen ? onCloseMenu : onOpenMenu}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#2D3748] hover:bg-[#F7FAFC]"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
      >
        {menuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
      </button>
      <p className="text-base font-bold text-[#2D3748]">MySewa</p>
      <div className="w-10" aria-hidden="true" />
    </header>
  )
}
