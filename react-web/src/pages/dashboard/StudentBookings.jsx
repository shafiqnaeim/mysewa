import { useMemo, useState } from 'react'
import { formatPropertyLocationLine } from '../../utils/propertyDisplay'
import { formatDepositAmount, isDepositPaid, resolveApplicationDeposit } from '../../utils/propertyDeposit'
import { LandlordMessagePreview } from '../../components/common/NotificationToast'
import StudentRentalHistory from '../../components/student/StudentRentalHistory'
import { canLeaveReview } from '../../utils/reviewEligibility'
import {
  canPayDeposit,
  getApplicationDisplayKey,
  getApplicationDisplayLabel,
  matchesApplicationFilter,
} from '../../utils/applicationDisplayStatus'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'completed', label: 'Completed' },
]

function formatMoveDate(value) {
  if (!value) return '—'
  try {
    const d = new Date(value.includes('T') ? value : `${value}T12:00:00`)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return String(value)
  }
}

function formatDuration(app) {
  if (app.leaseDays != null && app.leaseMonths != null) {
    return `${app.leaseDays} day${app.leaseDays === 1 ? '' : 's'} / ${app.leaseMonths} month${
      app.leaseMonths === 1 ? '' : 's'
    }`
  }
  if (app.leaseMonths != null) {
    return `${app.leaseMonths} month${app.leaseMonths === 1 ? '' : 's'}`
  }
  return '—'
}

function getBookingStatusBadge(app) {
  const key = getApplicationDisplayKey(app)
  const label = getApplicationDisplayLabel(app)

  switch (key) {
    case 'pending_payment':
      return { label, emoji: '⏳', className: 'bg-yellow-100 text-yellow-800' }
    case 'confirmed':
    case 'active':
      return {
        label: key === 'active' ? 'ACTIVE' : label,
        emoji: '✅',
        className: 'bg-green-100 text-green-800',
      }
    case 'completed':
      return { label, emoji: '🎓', className: 'bg-blue-100 text-blue-800' }
    case 'rejected':
      return { label, emoji: '❌', className: 'bg-red-100 text-red-800' }
    default:
      return { label: 'PENDING', emoji: '⏳', className: 'bg-yellow-100 text-yellow-800' }
  }
}

function resolvePropertyAddress(application, propertyById) {
  const property = propertyById?.[Number(application.propertyId)]
  if (property) {
    const line = formatPropertyLocationLine(property)
    if (line && line !== 'Location not set') return line
    if (property.location) return property.location
    if (property.city) return property.city
  }
  return application.propertyAddress || application.propertyCity || 'Address not available'
}

function StatCard({ label, children }) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">{label}</p>
      <div className="mt-2 text-sm text-[#2D3748]">{children}</div>
    </div>
  )
}

function BookingCard({ application, propertyById, onViewDetails, onPayDeposit, onLeaveReview, reviewedPropertyIds }) {
  const status = getBookingStatusBadge(application)
  const paid = isDepositPaid(application)
  const moveOut = application.leaseEnd || application.leaseEndDate || application.lease_end
  const showPayDeposit = canPayDeposit(application)
  const showLeaveReview = canLeaveReview(application, reviewedPropertyIds)
  const depositValue = resolveApplicationDeposit(application)
  const depositFormatted = formatDepositAmount(depositValue)
  const address = resolvePropertyAddress(application, propertyById)

  return (
    <article className="mb-4 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <header className="border-b border-[#E2E8F0] pb-4">
        <h3 className="text-xl font-bold text-[#2D3748]">
          {application.propertyName || `Property #${application.propertyId}`}
        </h3>
        <p className="mt-1 text-sm text-[#A0AEC0]">{address}</p>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Status">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}
          >
            <span aria-hidden="true">{status.emoji}</span>
            {status.label}
          </span>
        </StatCard>

        <StatCard label="Duration">
          <span className="font-semibold">{formatDuration(application)}</span>
        </StatCard>

        <StatCard label="Deposit">
          <p className="font-bold text-[#2D3748]">{depositFormatted}</p>
          <p className={`mt-1 text-xs font-semibold ${paid ? 'text-green-600' : 'text-red-600'}`}>
            {paid ? 'Paid' : 'Unpaid'}
          </p>
        </StatCard>

        <StatCard label="Move In">
          <span className="font-semibold">{formatMoveDate(application.preferredMoveIn)}</span>
        </StatCard>

        <StatCard label="Move Out">
          <span className="font-semibold">{formatMoveDate(moveOut)}</span>
        </StatCard>
      </div>

      {showPayDeposit ? (
        <div className="mt-4 rounded-lg border border-[#F59E0B] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
          <span aria-hidden="true">⚠️ </span>
          <strong>Action required:</strong> Your application was approved — pay your deposit of{' '}
          <strong>{depositFormatted}</strong> to confirm your booking.
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {showPayDeposit ? (
          <button
            type="button"
            onClick={() => onPayDeposit?.(application)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#E88D5B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d97a48]"
          >
            <span aria-hidden="true">💳</span>
            Pay Deposit
          </button>
        ) : null}
        {showLeaveReview ? (
          <button
            type="button"
            onClick={() => onLeaveReview?.(application)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#6C2BD9] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#5B21B6] hover:shadow-lg"
          >
            <span aria-hidden="true">✍️</span>
            Leave a Review
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onViewDetails?.(application)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-5 py-3 text-sm font-semibold text-[#2D3748] transition hover:bg-[#F7FAFC]"
        >
          <span aria-hidden="true">👁</span>
          View Details
        </button>
      </div>

      <LandlordMessagePreview application={application} className="mt-4" />
    </article>
  )
}

function EmptyState({ filter, onBrowse }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-12 text-center shadow-sm">
      <p className="text-4xl" aria-hidden="true">
        📋
      </p>
      <h2 className="mt-4 text-lg font-bold text-[#2D3748]">
        {filter === 'all' ? "You haven't made any bookings yet" : 'No bookings match this filter'}
      </h2>
      <p className="mt-2 text-sm text-[#A0AEC0]">
        {filter === 'all'
          ? 'Browse listings near your campus and submit a rental application to get started.'
          : 'Try another tab or browse more properties.'}
      </p>
      {filter === 'all' ? (
        <button
          type="button"
          onClick={onBrowse}
          className="mt-6 rounded-lg bg-[#E88D5B] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d97a48]"
        >
          Browse Properties
        </button>
      ) : null}
    </div>
  )
}

export default function StudentBookings({
  applications = [],
  propertyById = {},
  loading = false,
  onViewDetails,
  onPayDeposit,
  onLeaveReview,
  onBrowse,
  reviewedPropertyIds = new Set(),
}) {
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(
    () => applications.filter((app) => matchesApplicationFilter(app, filter)),
    [applications, filter],
  )

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#2D3748]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#2D3748] sm:text-3xl">
            <span aria-hidden="true">📋 </span>
            My Bookings
          </h1>
          <p className="mt-2 text-sm text-[#A0AEC0]">Track all your rental applications and bookings</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {FILTERS.map((item) => {
              const active = filter === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-[#2D3748] text-white'
                      : 'border border-[#E2E8F0] bg-white text-[#4A5568] hover:bg-[#F7FAFC]'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </header>

        <StudentRentalHistory
          applications={applications}
          propertyById={propertyById}
          reviewedPropertyIds={reviewedPropertyIds}
          onLeaveReview={onLeaveReview}
        />

        <section>
          {loading ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-12 text-center shadow-sm">
              <p className="text-sm text-[#A0AEC0]">Loading your bookings…</p>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState filter={filter} onBrowse={onBrowse} />
          ) : (
            filtered.map((application) => (
              <BookingCard
                key={application.id}
                application={application}
                propertyById={propertyById}
                onViewDetails={onViewDetails}
                onPayDeposit={onPayDeposit}
                onLeaveReview={onLeaveReview}
                reviewedPropertyIds={reviewedPropertyIds}
              />
            ))
          )}
        </section>
      </div>
    </div>
  )
}
