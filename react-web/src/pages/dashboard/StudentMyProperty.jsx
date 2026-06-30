import { useEffect, useMemo, useState } from 'react'
import AvailabilityCalendar from '../../components/AvailabilityCalendar'
import { ReviewAggregatesPanel, ReviewCard } from '../../components/reviews/MultiCategoryReviewDisplay'
import { fetchPropertyReviews } from '../../services/reviewService'
import { formatPropertyLocationLine } from '../../utils/propertyDisplay'
import { resolvedStudentDepositAmount } from '../../utils/studentApplicationDeposit'

const TABS = [
  { key: 'property', label: 'Property' },
  { key: 'payment', label: 'Payment' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'reports', label: 'Reports' },
]

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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

function formatRmMyr(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  return `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function reportStatusClass(status) {
  const s = String(status || 'pending').toLowerCase()
  if (s === 'resolved') return 'bg-[#D1FAE5] text-[#059669]'
  if (s === 'received') return 'bg-[#DBEAFE] text-[#2563EB]'
  return 'bg-[#FEF3C7] text-[#D97706]'
}

function reportStatusLabel(status) {
  const s = String(status || 'pending').toLowerCase()
  if (s === 'resolved') return 'Resolved'
  if (s === 'received') return 'Received'
  return 'Pending'
}

function reportImageUrl(url) {
  if (!url) return ''
  const s = String(url).trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  return s.startsWith('/') ? s : `/${s}`
}

function propertyStatusBadge(status) {
  const s = String(status || 'active').toLowerCase()
  if (s === 'pending' || s === 'pending_review') {
    return { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' }
  }
  if (s === 'active' || s === 'open' || s === 'published' || s === 'available') {
    return { label: 'Active', className: 'bg-green-100 text-green-800' }
  }
  if (s === 'inactive' || s === 'closed' || s === 'unavailable' || s === 'archived') {
    return { label: 'Inactive', className: 'bg-gray-100 text-gray-800' }
  }
  return { label: 'Active', className: 'bg-green-100 text-green-800' }
}

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] px-3 py-4 text-center">
      <p className="text-xs font-medium text-[#A0AEC0]">
        <span aria-hidden="true">{icon} </span>
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-snug text-[#2D3748]">{value}</p>
    </div>
  )
}

function RentCalendarPanel({
  primaryApplication,
  payYear,
  yearOptions,
  monthCells,
  rentMonthRows = [],
  rentCalendarLoading,
  rentCalendarTenancyLine,
  payRentHintMonth,
  onYearChange,
  onMonthClick,
  onLogPayment,
  onViewMonthReceipt,
}) {
  if (!primaryApplication) {
    return (
      <p className="text-sm text-[#6B7280]">No accepted application — the rent calendar is not available yet.</p>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-[#1A1A2E]">
        <span aria-hidden="true">📅 </span>
        Monthly Rent Calendar
      </h3>
      {rentCalendarTenancyLine ? (
        <p className="mt-2 text-sm text-[#6B7280]">{rentCalendarTenancyLine}</p>
      ) : null}

      {yearOptions.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="student-mp-pay-year" className="text-sm font-medium text-[#4B5563]">
            Year
          </label>
          <select
            id="student-mp-pay-year"
            value={payYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            disabled={rentCalendarLoading}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm outline-none focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onLogPayment}
            className="rounded-lg bg-[#E88D5B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d97a48]"
          >
            Mark as Paid
          </button>
        </div>
      ) : null}

      {rentCalendarLoading && monthCells.every((c) => c.outsideLease) ? (
        <p className="mt-4 text-sm text-[#6B7280]">Loading rent calendar…</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {monthCells.map((cell) => (
              <button
                key={cell.key}
                type="button"
                disabled={cell.outsideLease || rentCalendarLoading || payRentHintMonth != null}
                onClick={() => onMonthClick(cell.m)}
                className={[
                  'rounded-lg border p-3 text-center text-sm transition',
                  cell.outsideLease
                    ? 'border-[#E2E8F0] bg-[#F9FAFB] text-[#9CA3AF]'
                    : cell.paid
                      ? 'border-[#10B981] bg-[#D1FAE5] text-[#059669]'
                      : cell.unavailable
                        ? 'border-[#E2E8F0] bg-[#F3F4F6] text-[#6B7280]'
                        : cell.studentLogged
                          ? 'border-[#F59E0B] bg-[#FEF3C7] text-[#D97706]'
                          : 'border-[#FCD34D] bg-[#FFFBEB] text-[#92400E] hover:border-[#F59E0B]',
                ].join(' ')}
              >
                <span className="block font-semibold">{cell.label}</span>
                <span className="mt-1 block text-xs">
                  {cell.paid ? 'Paid' : cell.outsideLease ? '—' : cell.unavailable ? 'N/A' : cell.studentLogged ? 'Pending Confirmation' : 'Pending'}
                </span>
              </button>
            ))}
          </div>

          <ul className="mt-4 flex flex-wrap gap-4 text-xs text-[#6B7280]">
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-[#10B981]" aria-hidden="true" />
              Paid
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-[#FEF3C7] border border-[#FCD34D]" aria-hidden="true" />
              Pending
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-[#FEF3C7] border border-[#F59E0B]" aria-hidden="true" />
              Pending Confirmation
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-[#F9FAFB] border border-[#E2E8F0]" aria-hidden="true" />
              Outside Tenancy
            </li>
          </ul>

          {rentMonthRows.length > 0 ? (
            <div className="mt-6 space-y-3 border-t border-[#E2E8F0] pt-5">
              <p className="text-sm font-semibold text-[#2D3748]">Payment history — {payYear}</p>
              {rentMonthRows.map((row) => (
                <div
                  key={`${payYear}-${row.month}`}
                  className="rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#2D3748]">
                        <span aria-hidden="true">📆 </span>
                        {row.monthLabel}
                      </p>
                      <p className="mt-1 text-sm text-[#4A5568]">
                        <span aria-hidden="true">💰 </span>
                        {formatRmMyr(row.amount)}
                      </p>
                      <p
                        className={`mt-1 text-xs font-semibold ${
                          row.paid ? 'text-green-700' : 'text-amber-700'
                        }`}
                      >
                        {row.paid ? (
                          <>
                            <span aria-hidden="true">✅ </span>
                            PAID
                          </>
                        ) : (
                          <>
                            <span aria-hidden="true">⏳ </span>
                            Pending Confirmation
                          </>
                        )}
                      </p>
                    </div>
                    {row.paid ? (
                      <button
                        type="button"
                        onClick={() => onViewMonthReceipt?.(row.month)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold text-[#2D3748] shadow-sm transition hover:border-[#E88D5B] hover:text-[#E88D5B]"
                      >
                        <span aria-hidden="true">📄</span>
                        View Receipt
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

export default function StudentMyProperty({
  primaryApplication,
  propertyDetail,
  propertyLoading,
  applicationsLoading,
  monthlyRentDisplay,
  depositConfigured,
  depositResetAllowed,
  depositResetSavingId,
  payYear,
  yearOptions,
  monthCells,
  rentMonthRows = [],
  rentCalendarLoading,
  rentCalendarTenancyLine,
  payRentHintMonth,
  myReports,
  myReportsLoading,
  reportText,
  reportImage,
  reportSubmitting,
  reportFileInputRef,
  resolveSavingId,
  onBrowseListings,
  onPayDeposit,
  onResetDeposit,
  onViewReceipt,
  onViewAgreement,
  onContactLandlord,
  onYearChange,
  onMonthClick,
  onLogPayment,
  onViewMonthReceipt,
  onReportTextChange,
  onReportImageChange,
  onSubmitReport,
  onResolveReport,
  showLeaveReview = false,
  onLeaveReview,
}) {
  const [activeTab, setActiveTab] = useState('payment')
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewItems, setReviewItems] = useState([])
  const [reviewAggregates, setReviewAggregates] = useState(null)

  const moveOut =
    primaryApplication?.leaseEnd || primaryApplication?.leaseEndDate || primaryApplication?.lease_end

  const propertyName =
    propertyDetail?.name || primaryApplication?.propertyName || `Property #${primaryApplication?.propertyId}`

  useEffect(() => {
    const pid = primaryApplication?.propertyId
    if (!pid || activeTab !== 'reviews') return
    let cancelled = false
    async function loadReviews() {
      setReviewsLoading(true)
      try {
        const data = await fetchPropertyReviews(pid)
        if (!cancelled) {
          setReviewItems(Array.isArray(data.items) ? data.items : [])
          setReviewAggregates(data.aggregates || null)
        }
      } catch {
        if (!cancelled) {
          setReviewItems([])
          setReviewAggregates(null)
        }
      } finally {
        if (!cancelled) setReviewsLoading(false)
      }
    }
    loadReviews()
    return () => {
      cancelled = true
    }
  }, [primaryApplication?.propertyId, activeTab])

  const propertyAddress = useMemo(() => {
    if (propertyDetail) {
      const line = formatPropertyLocationLine(propertyDetail)
      if (line && line !== 'Location not set') return line
      if (propertyDetail.location) return propertyDetail.location
    }
    return primaryApplication?.propertyLocation || null
  }, [propertyDetail, primaryApplication])

  const statusBadge = propertyStatusBadge(propertyDetail?.status)

  function handleContactLandlord() {
    if (typeof onContactLandlord === 'function') {
      onContactLandlord()
      return
    }
    setActiveTab('reports')
  }

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#2D3748]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#2D3748] sm:text-3xl">
            <span aria-hidden="true">🏠 </span>
            My Property
          </h1>
          <p className="mt-2 text-sm text-[#718096]">
            Your tenancy, payments, and communication in one place
          </p>
        </header>

        {applicationsLoading ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-[#6B7280]">Loading your property…</p>
          </div>
        ) : !primaryApplication ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-bold text-[#1A1A2E]">No active tenancy yet</p>
            <p className="mt-2 text-sm text-[#6B7280]">
              Apply from a listing — when a landlord accepts, your property hub appears here.
            </p>
            <button
              type="button"
              onClick={onBrowseListings}
              className="mt-6 rounded-lg bg-[#6C2BD9] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6]"
            >
              Browse Properties
            </button>
          </div>
        ) : (
          <>
            <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-xl font-bold text-[#2D3748]">
                  <span aria-hidden="true">🏠 </span>
                  {propertyName}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${statusBadge.className}`}
                >
                  <span className="h-2 w-2 rounded-full bg-current opacity-80" aria-hidden="true" />
                  {statusBadge.label}
                </span>
              </div>

              {propertyAddress ? (
                <p className="mt-3 text-sm text-[#718096]">
                  <span aria-hidden="true">📍 </span>
                  {propertyAddress}
                </p>
              ) : null}

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard
                  icon="🏠"
                  label="Type"
                  value={
                    propertyDetail?.type
                      ? String(propertyDetail.type).charAt(0).toUpperCase() +
                        String(propertyDetail.type).slice(1)
                      : '—'
                  }
                />
                <StatCard icon="📅" label="Move Out" value={formatMoveDate(moveOut)} />
                <StatCard icon="💰" label="Rent" value={monthlyRentDisplay || '—'} />
              </div>
            </section>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleContactLandlord}
                className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D3748] shadow-sm transition hover:border-[#CBD5E0] hover:bg-[#F7FAFC]"
              >
                <span aria-hidden="true">💬</span>
                Contact Landlord
              </button>
              <button
                type="button"
                onClick={onViewAgreement}
                className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D3748] shadow-sm transition hover:border-[#CBD5E0] hover:bg-[#F7FAFC]"
              >
                <span aria-hidden="true">📄</span>
                View Agreement
              </button>
              {showLeaveReview ? (
                <button
                  type="button"
                  onClick={onLeaveReview}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#E88D5B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d97a48]"
                >
                  <span aria-hidden="true">⭐</span>
                  Leave Review
                </button>
              ) : null}
            </div>

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
                      onClick={() => setActiveTab(tab.key)}
                      className={`shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
                        active
                          ? 'bg-[#E88D5B] text-white'
                          : 'bg-[#EDF2F7] text-[#718096] hover:bg-[#E2E8F0]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              <div className="rounded-b-xl rounded-tr-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                {activeTab === 'property' ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-[#1A1A2E]">Property Details</h3>
                    {propertyDetail?.description ? (
                      <p className="text-sm leading-relaxed text-[#4B5563]">{propertyDetail.description}</p>
                    ) : (
                      <p className="text-sm text-[#6B7280]">No additional description for this listing.</p>
                    )}
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Campus</dt>
                        <dd className="mt-1 text-sm font-medium">{propertyDetail?.campus || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Capacity</dt>
                        <dd className="mt-1 text-sm font-medium">{propertyDetail?.capacity ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Last updated</dt>
                        <dd className="mt-1 text-sm font-medium">
                          {formatApplicationWhen(primaryApplication.updatedAt)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : null}

                {activeTab === 'payment' ? (
                  <div className="space-y-8">
                    <section>
                      <h3 className="text-lg font-bold text-[#1A1A2E]">Deposit</h3>
                      <div className="mt-4 rounded-xl border border-[#E2E8F0] bg-[#F9F7FF] p-5">
                        <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Deposit Amount</p>
                        <p className="mt-1 text-2xl font-bold text-[#1A1A2E]">
                          {formatRmMyr(resolvedStudentDepositAmount(primaryApplication))}
                        </p>
                        {depositConfigured ? (
                          <p className="mt-1 text-xs text-[#6B7280]">Set by your landlord when they accepted.</p>
                        ) : (
                          <p className="mt-1 text-xs text-[#6B7280]">Estimate until landlord records deposit.</p>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          {primaryApplication.depositPaid ? (
                            <>
                              <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#10B981]">
                                <span aria-hidden="true">✅</span>
                                Paid
                              </span>
                              <span className="text-sm text-[#6B7280]">
                                Paid on: {formatApplicationWhen(primaryApplication.updatedAt)}
                              </span>
                              <button
                                type="button"
                                onClick={onViewReceipt}
                                className="rounded-lg border border-[#6C2BD9] px-4 py-2 text-sm font-semibold text-[#6C2BD9] hover:bg-[#F3F0FF]"
                              >
                                View Receipt
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={onPayDeposit}
                              className="rounded-lg bg-[#6C2BD9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6]"
                            >
                              Pay Deposit
                            </button>
                          )}
                          {primaryApplication.depositPaid && depositResetAllowed ? (
                            <button
                              type="button"
                              disabled={depositResetSavingId === primaryApplication.id}
                              onClick={onResetDeposit}
                              className="text-xs text-[#6B7280] underline hover:text-[#EF4444]"
                            >
                              {depositResetSavingId === primaryApplication.id ? 'Clearing…' : 'Clear deposit (test)'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </section>

                    <section className="border-t border-[#E2E8F0] pt-8">
                      <RentCalendarPanel
                        primaryApplication={primaryApplication}
                        payYear={payYear}
                        yearOptions={yearOptions}
                        monthCells={monthCells}
                        rentMonthRows={rentMonthRows}
                        rentCalendarLoading={rentCalendarLoading}
                        rentCalendarTenancyLine={rentCalendarTenancyLine}
                        payRentHintMonth={payRentHintMonth}
                        onYearChange={onYearChange}
                        onMonthClick={onMonthClick}
                        onLogPayment={onLogPayment}
                        onViewMonthReceipt={onViewMonthReceipt}
                      />
                    </section>
                  </div>
                ) : null}

                {activeTab === 'calendar' ? (
                  <div className="space-y-10">
                    <section>
                      <h3 className="text-lg font-bold text-[#1A1A2E]">
                        <span aria-hidden="true">📅 </span>
                        Property Availability
                      </h3>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        Dates locked while your booking is confirmed show in red.
                      </p>
                      <div className="mt-4">
                        <AvailabilityCalendar
                          propertyId={propertyDetail?.id ?? primaryApplication?.propertyId}
                          bookingId={primaryApplication?.id}
                          viewMode="student"
                          status={propertyDetail?.status}
                          refreshKey={primaryApplication?.depositPaid ? `paid-${primaryApplication.id}` : 'open'}
                          hideFooterNote
                        />
                      </div>
                    </section>
                    <RentCalendarPanel
                      primaryApplication={primaryApplication}
                      payYear={payYear}
                      yearOptions={yearOptions}
                      monthCells={monthCells}
                      rentMonthRows={rentMonthRows}
                      rentCalendarLoading={rentCalendarLoading}
                      rentCalendarTenancyLine={rentCalendarTenancyLine}
                      payRentHintMonth={payRentHintMonth}
                      onYearChange={onYearChange}
                      onMonthClick={onMonthClick}
                      onLogPayment={onLogPayment}
                      onViewMonthReceipt={onViewMonthReceipt}
                    />
                  </div>
                ) : null}

                {activeTab === 'reviews' ? (
                  <div>
                    <h3 className="text-lg font-bold text-[#1A1A2E]">
                      <span aria-hidden="true">⭐ </span>
                      Reviews &amp; Ratings
                    </h3>
                    <p className="mt-2 text-sm text-[#6B7280]">
                      See category ratings from past tenants or share feedback after your tenancy ends.
                    </p>
                    <div className="mt-6">
                      {reviewsLoading ? (
                        <p className="text-sm text-[#6B7280]">Loading reviews…</p>
                      ) : (
                        <>
                          <ReviewAggregatesPanel aggregates={reviewAggregates} />
                          {!reviewItems.length ? (
                            <p className="text-sm text-[#6B7280]">No reviews yet for this property.</p>
                          ) : (
                            <ul className="space-y-4">
                              {reviewItems.map((r) => (
                                <ReviewCard key={r.id} review={r} />
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ) : null}

                {activeTab === 'reports' ? (
                  <div>
                    <h3 className="text-lg font-bold text-[#1A1A2E]">
                      <span aria-hidden="true">📝 </span>
                      Reports
                    </h3>
                    <p className="mt-2 text-sm text-[#6B7280]">
                      Report maintenance or tenancy issues to your landlord.
                    </p>

                    <div className="mt-6">
                      <h4 className="text-sm font-bold text-[#1A1A2E]">Your reports</h4>
                      {myReportsLoading ? (
                        <p className="mt-2 text-sm text-[#6B7280]">Loading…</p>
                      ) : myReports.length === 0 ? (
                        <p className="mt-2 text-sm text-[#6B7280]">No reports submitted yet.</p>
                      ) : (
                        <ul className="mt-4 space-y-4">
                          {myReports.map((rep) => {
                            const canResolve = String(rep.status || '').toLowerCase() === 'received'
                            return (
                              <li key={rep.id} className="rounded-xl border border-[#E2E8F0] p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-xs text-[#6B7280]">
                                    {rep.createdAt ? new Date(rep.createdAt).toLocaleString() : ''}
                                  </p>
                                  <span
                                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${reportStatusClass(rep.status)}`}
                                  >
                                    {reportStatusLabel(rep.status)}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm text-[#1A1A2E]">{rep.message}</p>
                                {rep.imageUrl ? (
                                  <a
                                    href={reportImageUrl(rep.imageUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-3 inline-block"
                                  >
                                    <img
                                      src={reportImageUrl(rep.imageUrl)}
                                      alt=""
                                      className="max-h-40 rounded-lg object-cover"
                                    />
                                  </a>
                                ) : null}
                                {canResolve ? (
                                  <button
                                    type="button"
                                    disabled={resolveSavingId === rep.id}
                                    onClick={() => onResolveReport(rep.id)}
                                    className="mt-3 rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-white hover:bg-[#059669] disabled:opacity-60"
                                  >
                                    {resolveSavingId === rep.id ? 'Saving…' : 'Mark Resolved'}
                                  </button>
                                ) : null}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>

                    <form className="mt-8 border-t border-[#E2E8F0] pt-8" onSubmit={onSubmitReport}>
                      <h4 className="text-sm font-bold text-[#1A1A2E]">Submit Report</h4>
                      <label htmlFor="student-mp-report-msg" className="mt-4 block text-sm font-medium text-[#4B5563]">
                        Describe the issue
                      </label>
                      <textarea
                        id="student-mp-report-msg"
                        rows={4}
                        placeholder="At least 10 characters about the listing…"
                        value={reportText}
                        onChange={(e) => onReportTextChange(e.target.value)}
                        disabled={reportSubmitting}
                        maxLength={4000}
                        className="mt-2 w-full rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-sm outline-none focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20"
                      />
                      <label htmlFor="student-mp-report-img" className="mt-4 block text-sm font-medium text-[#4B5563]">
                        Photo (optional)
                      </label>
                      <input
                        id="student-mp-report-img"
                        ref={reportFileInputRef}
                        type="file"
                        accept="image/*"
                        disabled={reportSubmitting}
                        onChange={onReportImageChange}
                        className="mt-2 block w-full text-sm text-[#6B7280]"
                      />
                      <button
                        type="submit"
                        disabled={reportSubmitting || reportText.trim().length < 10}
                        className="mt-4 rounded-lg bg-[#6C2BD9] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6] disabled:opacity-50"
                      >
                        {reportSubmitting ? 'Sending…' : 'Submit Report'}
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
