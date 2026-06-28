import { useMemo, useState } from 'react'
import PropertyReviewsSection from '../../components/PropertyReviewsSection'
import { listPropertyImageUrls } from '../../utils/propertyDisplay'
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
  return `RM ${Number(amount).toFixed(2)}`
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

function RentCalendarPanel({
  primaryApplication,
  payYear,
  yearOptions,
  monthCells,
  rentCalendarLoading,
  rentCalendarTenancyLine,
  payRentHintMonth,
  onYearChange,
  onMonthClick,
  onLogPayment,
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
            className="rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#D97706]"
          >
            Log Payment
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
                  {cell.paid ? 'Paid' : cell.outsideLease ? '—' : cell.unavailable ? 'N/A' : cell.studentLogged ? 'Logged' : 'Pending'}
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
              <span className="h-3 w-3 rounded bg-[#F9FAFB] border border-[#E2E8F0]" aria-hidden="true" />
              Outside Tenancy
            </li>
          </ul>
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
  onYearChange,
  onMonthClick,
  onLogPayment,
  onReportTextChange,
  onReportImageChange,
  onSubmitReport,
  onResolveReport,
}) {
  const [activeTab, setActiveTab] = useState('payment')

  const coverImage = useMemo(() => {
    if (!propertyDetail) return null
    const urls = listPropertyImageUrls(propertyDetail)
    return urls[0] || null
  }, [propertyDetail])

  const moveOut =
    primaryApplication?.leaseEnd || primaryApplication?.leaseEndDate || primaryApplication?.lease_end

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
            <span aria-hidden="true">🏠 </span>
            My Property
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">
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
            {/* Summary Card */}
            <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6 md:flex-row">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt=""
                    className="h-32 w-full rounded-lg object-cover md:w-48"
                  />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center rounded-lg bg-gray-200 text-sm text-[#6B7280] md:w-48">
                    {propertyLoading ? 'Loading…' : 'No image'}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold text-[#1A1A2E]">
                      {propertyDetail?.name || primaryApplication.propertyName || `Property #${primaryApplication.propertyId}`}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#D1FAE5] px-2.5 py-1 text-xs font-bold text-[#059669]">
                      <span aria-hidden="true">✅</span>
                      Active
                    </span>
                  </div>

                  <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Application #</dt>
                      <dd className="mt-1 font-medium">#{primaryApplication.id}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Move In</dt>
                      <dd className="mt-1 font-medium">{formatMoveDate(primaryApplication.preferredMoveIn)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Move Out</dt>
                      <dd className="mt-1 font-medium">{formatMoveDate(moveOut)}</dd>
                    </div>
                    {propertyDetail?.location ? (
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Address</dt>
                        <dd className="mt-1 font-medium">{propertyDetail.location}</dd>
                      </div>
                    ) : null}
                    {propertyDetail?.type ? (
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Type</dt>
                        <dd className="mt-1 font-medium capitalize">{propertyDetail.type}</dd>
                      </div>
                    ) : null}
                    {monthlyRentDisplay ? (
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Monthly Rent</dt>
                        <dd className="mt-1 font-bold text-[#6C2BD9]">{monthlyRentDisplay}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              </div>
            </section>

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
                          ? 'bg-[#6C2BD9] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                        rentCalendarLoading={rentCalendarLoading}
                        rentCalendarTenancyLine={rentCalendarTenancyLine}
                        payRentHintMonth={payRentHintMonth}
                        onYearChange={onYearChange}
                        onMonthClick={onMonthClick}
                        onLogPayment={onLogPayment}
                      />
                    </section>
                  </div>
                ) : null}

                {activeTab === 'calendar' ? (
                  <RentCalendarPanel
                    primaryApplication={primaryApplication}
                    payYear={payYear}
                    yearOptions={yearOptions}
                    monthCells={monthCells}
                    rentCalendarLoading={rentCalendarLoading}
                    rentCalendarTenancyLine={rentCalendarTenancyLine}
                    payRentHintMonth={payRentHintMonth}
                    onYearChange={onYearChange}
                    onMonthClick={onMonthClick}
                    onLogPayment={onLogPayment}
                  />
                ) : null}

                {activeTab === 'reviews' ? (
                  <div>
                    <h3 className="text-lg font-bold text-[#1A1A2E]">
                      <span aria-hidden="true">⭐ </span>
                      Reviews &amp; Ratings
                    </h3>
                    <p className="mt-2 text-sm text-[#6B7280]">
                      Share feedback about your rental experience. At least 10 characters about the listing.
                    </p>
                    <div className="mt-6">
                      <PropertyReviewsSection
                        propertyId={primaryApplication.propertyId}
                        hideSectionTitle
                      />
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
