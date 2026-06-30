import { resolvedStudentDepositAmount } from '../../utils/studentApplicationDeposit'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatRm(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return 'RM —'
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`
}

function formatTableDate(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'numeric', year: '2-digit' })
  } catch {
    return '—'
  }
}

function formatPaidOn(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return '—'
  }
}

function SummaryCard({ label, value, accent }) {
  const borders = {
    purple: 'border-l-[#6C2BD9]',
    green: 'border-l-[#10B981]',
    amber: 'border-l-[#F59E0B]',
  }
  return (
    <article
      className={`rounded-xl border border-[#E2E8F0] border-l-4 bg-white p-6 shadow-sm ${borders[accent] || borders.purple}`}
    >
      <p className="text-2xl font-bold text-[#1A1A2E]">{value}</p>
      <p className="mt-1 text-sm text-[#6B7280]">{label}</p>
    </article>
  )
}

function RentCalendarSection({
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
  return (
    <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-[#1A1A2E]">
        <span aria-hidden="true">📅 </span>
        Monthly Rent Tracker
      </h2>
      {rentCalendarTenancyLine ? (
        <p className="mt-2 text-sm text-[#6B7280]">{rentCalendarTenancyLine}</p>
      ) : null}

      {yearOptions.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="student-pay-year" className="text-sm font-medium text-[#4B5563]">
            Year
          </label>
          <select
            id="student-pay-year"
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
            className="rounded-lg bg-[#E88D5B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d97a48]"
          >
            Mark as Paid
          </button>
        </div>
      ) : null}

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
              {cell.paid
                ? 'Paid'
                : cell.outsideLease
                  ? '—'
                  : cell.unavailable
                    ? 'N/A'
                    : cell.studentLogged
                      ? 'Pending Confirmation'
                      : 'Pending'}
            </span>
          </button>
        ))}
      </div>

      <ul className="mt-4 flex flex-wrap gap-4 text-xs text-[#6B7280]">
        <li className="flex items-center gap-2">
          <span aria-hidden="true">✅</span>
          Paid
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true">⏳</span>
          Pending
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true">⬜</span>
          Outside Tenancy
        </li>
      </ul>
    </section>
  )
}

export default function StudentPayments({
  loading = false,
  primaryApplication,
  propertyName = '',
  summary = {},
  paymentHistory = [],
  payYear,
  yearOptions = [],
  monthCells = [],
  rentCalendarLoading = false,
  rentCalendarTenancyLine,
  payRentHintMonth,
  onPayDeposit,
  onYearChange,
  onMonthClick,
  onLogPayment,
  onBrowseProperties,
}) {
  const depositAmount = primaryApplication ? resolvedStudentDepositAmount(primaryApplication) : null
  const depositPaid = Boolean(primaryApplication?.depositPaid)

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
            <span aria-hidden="true">💰 </span>
            Payments
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">Manage your deposits and monthly rent</p>
        </header>

        {loading ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-12 text-center shadow-sm">
            <p className="text-sm text-[#6B7280]">Loading payments…</p>
          </div>
        ) : !primaryApplication ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-bold text-[#1A1A2E]">No active tenancy</p>
            <p className="mt-2 text-sm text-[#6B7280]">
              Payments appear here after a landlord accepts your rental application.
            </p>
            <button
              type="button"
              onClick={onBrowseProperties}
              className="mt-6 rounded-lg bg-[#6C2BD9] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6]"
            >
              Browse Properties
            </button>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SummaryCard label="Total Paid" value={formatRm(summary.totalPaid ?? 0)} accent="green" />
              <SummaryCard label="Pending" value={formatRm(summary.pending ?? 0)} accent="amber" />
              <SummaryCard
                label={summary.nextDueLabel || 'Next Payment'}
                value={formatRm(summary.nextPaymentAmount ?? 0)}
                accent="purple"
              />
            </section>

            <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#1A1A2E]">
                <span aria-hidden="true">💳 </span>
                Deposit Payment
              </h2>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Amount</p>
                  <p className="mt-1 text-2xl font-bold text-[#1A1A2E]">{formatRm(depositAmount)}</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold">
                    {depositPaid ? (
                      <>
                        <span className="text-[#10B981]" aria-hidden="true">
                          ✅
                        </span>
                        <span className="text-[#10B981]">Paid</span>
                        <span className="font-normal text-[#6B7280]">
                          · Paid on {formatPaidOn(primaryApplication.updatedAt)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[#F59E0B]" aria-hidden="true">
                          ⏳
                        </span>
                        <span className="text-[#F59E0B]">Pending</span>
                      </>
                    )}
                  </p>
                </div>
                {!depositPaid ? (
                  <button
                    type="button"
                    onClick={onPayDeposit}
                    className="rounded-lg bg-[#6C2BD9] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6]"
                  >
                    Pay Deposit
                  </button>
                ) : null}
              </div>
            </section>

            <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#1A1A2E]">
                <span aria-hidden="true">📋 </span>
                Payment History
              </h2>
              {paymentHistory.length === 0 ? (
                <p className="mt-4 text-sm text-[#6B7280]">No payment records yet.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-[640px] w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                        <th className="px-3 py-3">Date</th>
                        <th className="px-3 py-3">Property</th>
                        <th className="px-3 py-3">Type</th>
                        <th className="px-3 py-3">Amount</th>
                        <th className="px-3 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((row) => (
                        <tr key={row.id} className="border-b border-[#E2E8F0] last:border-0">
                          <td className="px-3 py-3 text-[#4B5563]">{formatTableDate(row.date)}</td>
                          <td className="px-3 py-3 font-medium text-[#1A1A2E]">{row.propertyName}</td>
                          <td className="px-3 py-3 text-[#4B5563]">{row.type}</td>
                          <td className="px-3 py-3 font-medium text-[#1A1A2E]">{formatRm(row.amount)}</td>
                          <td className="px-3 py-3">
                            {row.status === 'paid' ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-[#10B981]">
                                <span aria-hidden="true">✅</span>
                                Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-semibold text-[#F59E0B]">
                                <span aria-hidden="true">⏳</span>
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <RentCalendarSection
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
          </>
        )}
      </div>
    </div>
  )
}
