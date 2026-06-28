import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

const QUICK_ACTIONS = [
  {
    id: 'search',
    emoji: '🔍',
    label: 'Search Listings',
    description: 'Find your next home',
    button: 'Search →',
    path: '/properties',
  },
  {
    id: 'bookings',
    emoji: '📋',
    label: 'My Bookings',
    description: 'View all bookings',
    button: 'View →',
    path: '/dashboard/student/bookings',
  },
  {
    id: 'payments',
    emoji: '💰',
    label: 'Payments',
    description: 'Manage payments',
    button: 'Pay →',
    path: '/dashboard/student/payments',
  },
  {
    id: 'profile',
    emoji: '👤',
    label: 'My Profile',
    description: 'Update your info',
    button: 'Edit →',
    path: '/dashboard/student/account',
  },
]

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function getInitials(name) {
  const parts = String(name || 'S').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'S'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatRm(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n) || n <= 0) return 'RM 0'
  return `RM ${n.toFixed(n % 1 === 0 ? 0 : 2)}`
}

export default function StudentDashboard({
  firstName = 'there',
  fullName = '',
  email = '',
  universityLabel = '',
  emailVerified = false,
  verificationState = 'pending',
  stats = {},
  activities = [],
  notifications = [],
}) {
  const navigate = useNavigate()
  const greeting = useMemo(() => getGreeting(), [])
  const initials = useMemo(() => getInitials(fullName || firstName), [fullName, firstName])

  const activeBookings = stats.activeBookings ?? 0
  const savedCount = stats.savedCount ?? 0
  const pendingPaymentsCount = stats.pendingPaymentsCount ?? 0
  const pendingPaymentsAmount = stats.pendingPaymentsAmount ?? 0
  const totalReviews = stats.totalReviews ?? 0

  const statCards = [
    {
      label: 'Active Bookings',
      value: String(activeBookings),
      border: 'border-l-[#6C2BD9]',
    },
    {
      label: 'Saved Properties',
      value: String(savedCount),
      border: 'border-l-[#10B981]',
    },
    {
      label: 'Pending Payments',
      value: formatRm(pendingPaymentsAmount),
      border: 'border-l-[#F59E0B]',
    },
    {
      label: 'Total Reviews',
      value: String(totalReviews),
      border: 'border-l-[#3B82F6]',
    },
  ]

  const verificationLabel =
    verificationState === 'verified' ? '✅ Verified' : verificationState === 'rejected' ? '❌ Rejected' : '⚠️ Pending'

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* Header */}
        <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#6C2BD9] to-[#8B5CF6] px-6 py-8 text-white shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold">
                <span aria-hidden="true">👋 </span>
                {greeting}, {firstName.toUpperCase()}
              </h1>
              <p className="mt-2 text-sm text-purple-200">
                Welcome back! Here&apos;s what&apos;s happening with your rentals
              </p>
              <p className="mt-3 text-sm text-purple-100">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[#F59E0B]" aria-hidden="true">
                    ●
                  </span>
                  {activeBookings} active booking{activeBookings === 1 ? '' : 's'}
                </span>
                <span className="mx-2 text-purple-300" aria-hidden="true">
                  ●
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[#F59E0B]" aria-hidden="true">
                    ●
                  </span>
                  {savedCount} saved propert{savedCount === 1 ? 'y' : 'ies'}
                </span>
                <span className="mx-2 text-purple-300" aria-hidden="true">
                  ●
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[#F59E0B]" aria-hidden="true">
                    ●
                  </span>
                  {pendingPaymentsCount} pending payment{pendingPaymentsCount === 1 ? '' : 's'}
                </span>
              </p>
            </div>
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-white/20 text-lg font-bold backdrop-blur-sm"
              aria-hidden="true"
            >
              {initials}
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {statCards.map((card) => (
            <article
              key={card.label}
              className={`rounded-xl border border-[#E2E8F0] border-l-4 bg-white p-6 shadow-sm transition hover:shadow-md ${card.border}`}
            >
              <p className="text-sm text-[#6B7280]">{card.label}</p>
              <p className="mt-2 text-2xl font-bold text-[#1A1A2E]">{card.value}</p>
            </article>
          ))}
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <article
              key={action.id}
              className="flex flex-col rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <span className="text-3xl" aria-hidden="true">
                {action.emoji}
              </span>
              <h3 className="mt-3 text-sm font-bold text-[#1A1A2E]">{action.label}</h3>
              <p className="mt-1 flex-1 text-xs text-[#6B7280]">{action.description}</p>
              <button
                type="button"
                onClick={() => navigate(action.path)}
                className="mt-4 self-start rounded-lg bg-[#F3F0FF] px-3 py-1.5 text-xs font-semibold text-[#6C2BD9] transition hover:bg-[#6C2BD9] hover:text-white"
              >
                {action.button}
              </button>
            </article>
          ))}
        </section>

        {notifications.length > 0 ? (
          <section className="rounded-xl border border-[#6C2BD9]/20 bg-[#F9F7FF] p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1A1A2E]">
              <span aria-hidden="true">🔔 </span>
              Notifications
            </h2>
            <ul className="mt-4 space-y-3">
              {notifications.slice(0, 5).map((note) => (
                <li
                  key={note.id}
                  className={`rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm ${
                    note.read ? 'opacity-75' : ''
                  }`}
                >
                  <p className="font-semibold text-[#1A1A2E]">{note.title}</p>
                  <p className="mt-1 text-[#4B5563]">{note.message}</p>
                </li>
              ))}
            </ul>
            {pendingPaymentsCount > 0 ? (
              <button
                type="button"
                onClick={() => navigate('/dashboard/student/bookings')}
                className="mt-4 rounded-lg bg-[#6C2BD9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5B21B6]"
              >
                Pay deposit in My Bookings →
              </button>
            ) : null}
          </section>
        ) : null}

        {/* Main Content */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Recent Activity — 3/5 */}
          <div className="lg:col-span-3">
            <h2 className="mb-4 text-lg font-semibold text-[#1A1A2E]">
              <span aria-hidden="true">📋 </span>
              Recent Activity
            </h2>
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              {activities.length === 0 ? (
                <p className="text-sm text-[#6B7280]">No recent activity yet. Start by searching listings!</p>
              ) : (
                <ul className="space-y-4">
                  {activities.map((item) => (
                    <li key={item.id} className="border-b border-[#E2E8F0] pb-4 last:border-0 last:pb-0">
                      <p className="text-sm text-[#1A1A2E]">
                        <span aria-hidden="true">{item.icon} </span>
                        {item.message}
                      </p>
                      <p className="mt-1 text-xs text-[#6B7280]">{item.time}</p>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => navigate('/dashboard/student/bookings')}
                className="mt-4 text-sm font-semibold text-[#6C2BD9] transition hover:text-[#8B5CF6]"
              >
                View All Activity →
              </button>
            </div>
          </div>

          {/* Your Account — 2/5 */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-[#1A1A2E]">
              <span aria-hidden="true">👤 </span>
              Your Account
            </h2>
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Email</dt>
                  <dd className="mt-1 font-medium text-[#1A1A2E]">
                    {email || '—'}
                    {emailVerified ? (
                      <span className="ml-1 text-[#10B981]" aria-label="Email verified">
                        {' '}
                        ✅
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">University</dt>
                  <dd className="mt-1 font-medium text-[#1A1A2E]">{universityLabel || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Role</dt>
                  <dd className="mt-1">
                    <span className="inline-flex rounded-full bg-[#F3F0FF] px-2.5 py-0.5 text-xs font-bold text-[#6C2BD9]">
                      Student
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Verification</dt>
                  <dd className="mt-1 font-medium text-[#1A1A2E]">{verificationLabel}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => navigate('/dashboard/student/account')}
                className="mt-6 w-full rounded-lg bg-[#6C2BD9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5B21B6]"
              >
                Complete Profile →
              </button>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="rounded-xl bg-[#F3F0FF] p-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <p className="text-sm font-medium text-[#1A1A2E]">
              A complete profile and verification help landlords respond faster
            </p>
            <button
              type="button"
              onClick={() => navigate('/dashboard/student/account')}
              className="shrink-0 rounded-lg bg-[#6C2BD9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5B21B6]"
            >
              Complete Profile →
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
