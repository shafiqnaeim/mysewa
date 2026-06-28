import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDepositAmount, isDepositPaid, resolveApplicationDeposit } from '../../utils/propertyDeposit'
import { getLandlordStatusBadge, matchesApplicationFilter } from '../../utils/applicationDisplayStatus'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'completed', label: 'Completed' },
]

function formatApplicationWhen(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return String(iso)
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(iso)
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

function normalizeStatus(status) {
  return String(status || 'pending').toLowerCase()
}

function matchesFilter(app, filter) {
  return matchesApplicationFilter(app, filter)
}

function getStatusBadge(app) {
  return getLandlordStatusBadge(app)
}

function getDepositBadge(app) {
  if (isDepositPaid(app)) {
    return { label: 'Paid', className: 'bg-[#F0FFF4] text-[#38A169]' }
  }
  return { label: 'Pending', className: 'bg-[#FFFAF0] text-[#D69E2E]' }
}

function DetailRow({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-[#2D3748]">{value}</dd>
    </div>
  )
}

function ApplicationCard({ application, saving, onApprove, onReject, onViewDetails }) {
  const navigate = useNavigate()
  const status = getStatusBadge(application)
  const depositBadge = getDepositBadge(application)
  const isPending = normalizeStatus(application.status) === 'pending'
  const isAccepted = normalizeStatus(application.status) === 'accepted'
  const depositAmount = formatDepositAmount(resolveApplicationDeposit(application))

  return (
    <article className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#2D3748]">
            {application.propertyName || `Property #${application.propertyId}`}
          </h3>
          <p className="mt-1 text-sm text-[#A0AEC0]">{formatApplicationWhen(application.createdAt)}</p>
        </div>
        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
          {status.label}
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DetailRow label="Applicant" value={application.student?.fullName?.trim() || 'Student'} />
        <DetailRow label="Move In" value={application.preferredMoveIn || '—'} />
        <DetailRow
          label="Move Out"
          value={application.leaseEnd || application.leaseEndDate || application.lease_end || '—'}
        />
        <DetailRow label="Duration" value={formatDuration(application)} />
        <DetailRow label="Deposit" value={depositAmount} />
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">Deposit Status</dt>
          <dd className="mt-1">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${depositBadge.className}`}>
              {depositBadge.label}
            </span>
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        {isPending ? (
          <>
            <button
              type="button"
              disabled={saving}
              onClick={() => onApprove?.(application)}
              className="rounded-full bg-[#E88D5B] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#d97a48] disabled:opacity-60"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => onReject?.(application)}
              className="rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-xs font-semibold text-[#2D3748] transition hover:bg-[#FAFAFA] disabled:opacity-60"
            >
              Reject
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => onViewDetails?.(application)}
          className="rounded-full border border-[#E88D5B] bg-white px-4 py-2 text-xs font-semibold text-[#E88D5B] transition hover:bg-[#FFF5F0]"
        >
          View
        </button>
        {isAccepted ? (
          <button
            type="button"
            onClick={() => navigate(`/dashboard/landlord/rent-tracker/${application.id}`)}
            className="rounded-full bg-[#E88D5B] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#d97a48]"
          >
            <span aria-hidden="true">📅 </span>
            Monthly Rent Tracker
          </button>
        ) : null}
      </div>
    </article>
  )
}

function EmptyIllustration() {
  return (
    <svg className="mx-auto h-20 w-20 text-[#E2E8F0]" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <rect x="24" y="28" width="72" height="64" rx="6" stroke="currentColor" strokeWidth="3" />
      <path d="M36 44h48M36 58h32M36 72h40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export default function Applications({
  applications = [],
  loading = false,
  savingId = null,
  onApprove,
  onReject,
  onViewDetails,
}) {
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(
    () => applications.filter((app) => matchesFilter(app, filter)),
    [applications, filter],
  )

  return (
    <div className="min-h-[calc(100vh-4.5rem)] w-full bg-[#FAFAFA] font-sans text-[#2D3748]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#2D3748]">Rental Applications</h1>
          <p className="mt-1 text-sm text-[#A0AEC0]">Review and manage student applications</p>

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
                      : 'border border-[#E2E8F0] bg-white text-[#4A5568] hover:bg-[#FAFAFA]'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </header>

        <section className="space-y-4">
          {loading ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-12 text-center shadow-sm">
              <p className="text-sm text-[#A0AEC0]">Loading applications…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-12 text-center shadow-sm">
              <EmptyIllustration />
              <h2 className="mt-6 text-lg font-semibold text-[#2D3748]">No applications found</h2>
              <p className="mt-2 text-sm text-[#A0AEC0]">
                {filter === 'all'
                  ? 'When students apply to your listings, they will appear here.'
                  : 'No applications match this filter.'}
              </p>
            </div>
          ) : (
            filtered.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                saving={savingId === application.id}
                onApprove={onApprove}
                onReject={onReject}
                onViewDetails={onViewDetails}
              />
            ))
          )}
        </section>
      </div>
    </div>
  )
}
