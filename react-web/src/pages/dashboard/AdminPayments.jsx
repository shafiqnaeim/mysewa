function formatMoney(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return 'RM 0'
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function formatDate(value) {
  if (!value) return '—'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'numeric', year: '2-digit' })
  } catch {
    return String(value)
  }
}

function formatWhen(value) {
  if (!value) return '—'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

function StatusBadge({ status }) {
  const s = String(status || 'pending').toLowerCase()
  const config = {
    paid: { label: 'Paid', emoji: '✅', className: 'bg-green-100 text-green-800' },
    pending: { label: 'Pending', emoji: '⏳', className: 'bg-yellow-100 text-yellow-800' },
    failed: { label: 'Failed', emoji: '❌', className: 'bg-red-100 text-red-800' },
    refunded: { label: 'Refunded', emoji: '↩', className: 'bg-gray-100 text-gray-800' },
  }
  const row = config[s] || config.pending
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.className}`}>
      <span aria-hidden="true">{row.emoji}</span> {row.label}
    </span>
  )
}

function SummaryCard({ label, value, accent }) {
  return (
    <article className={`rounded-xl border border-[#E2E8F0] border-l-4 bg-white p-6 shadow-sm ${accent}`}>
      <p className="text-sm text-[#6B7280]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#1A1A2E]">{value}</p>
    </article>
  )
}

function PaymentDetailModal({ payment, onClose }) {
  if (!payment) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-[#E2E8F0] bg-white px-6 py-4">
          <h2 className="text-lg font-bold text-[#1A1A2E]">Transaction details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#6B7280] hover:bg-[#F3F4F6]"
          >
            Close
          </button>
        </div>

        <div className="space-y-6 p-6" id="admin-payment-receipt">
          <div className="rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] p-4">
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-[#6B7280]">MySewa receipt</p>
            <p className="mt-2 text-center text-2xl font-bold text-[#DC2626]">{formatMoney(payment.amount)}</p>
            <p className="mt-1 text-center text-sm text-[#4B5563]">{payment.type}</p>
            <div className="mt-4 flex justify-center">
              <StatusBadge status={payment.status} />
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[#6B7280]">Transaction ID</dt>
              <dd className="font-medium text-[#1A1A2E]">{payment.transactionId || payment.id}</dd>
            </div>
            <div>
              <dt className="text-[#6B7280]">Date</dt>
              <dd className="text-[#1A1A2E]">{formatWhen(payment.date)}</dd>
            </div>
            <div>
              <dt className="text-[#6B7280]">Student</dt>
              <dd className="text-[#1A1A2E]">{payment.student}</dd>
            </div>
            <div>
              <dt className="text-[#6B7280]">Property</dt>
              <dd className="text-[#1A1A2E]">{payment.property}</dd>
            </div>
            <div>
              <dt className="text-[#6B7280]">Application</dt>
              <dd className="text-[#1A1A2E]">
                {payment.applicationId ? `#${payment.applicationId}` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[#6B7280]">Currency</dt>
              <dd className="text-[#1A1A2E]">{payment.currency || 'MYR'}</dd>
            </div>
            {payment.externalRef ? (
              <div className="sm:col-span-2">
                <dt className="text-[#6B7280]">Reference</dt>
                <dd className="break-all font-mono text-xs text-[#1A1A2E]">{payment.externalRef}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </div>
  )
}

export default function AdminPayments({
  stats,
  payments,
  loading,
  detailPayment,
  onViewPayment,
  onCloseDetail,
  onExportCsv,
  onExportPdf,
}) {
  const totalRevenue = formatMoney(stats?.totalRevenue)
  const thisMonth = formatMoney(stats?.thisMonth)
  const pending = formatMoney(stats?.pending)

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
              <span aria-hidden="true">💰 </span>
              Payments
            </h1>
            <p className="mt-2 text-sm text-[#6B7280]">View all transactions across the platform</p>
            <p className="mt-1 text-sm font-semibold text-[#DC2626]">Total Revenue: {totalRevenue}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExportCsv}
              disabled={loading || payments.length === 0}
              className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#4B5563] hover:bg-[#FAFAFA] disabled:opacity-50"
            >
              Export as CSV
            </button>
            <button
              type="button"
              onClick={onExportPdf}
              disabled={loading || payments.length === 0}
              className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-50"
            >
              Export as PDF
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard label="Total Revenue" value={totalRevenue} accent="border-l-[#DC2626]" />
          <SummaryCard label="This Month" value={thisMonth} accent="border-l-[#F59E0B]" />
          <SummaryCard label="Pending" value={pending} accent="border-l-[#6B7280]" />
        </section>

        <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
          {loading ? (
            <p className="p-8 text-center text-sm text-[#6B7280]">Loading transactions…</p>
          ) : payments.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#6B7280]">No payment transactions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[#E2E8F0] bg-[#FAFAFA] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Property</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {payments.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer hover:bg-[#FEF2F2]"
                      onClick={() => onViewPayment(row)}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-[#4B5563]">{formatDate(row.date)}</td>
                      <td className="px-4 py-3 font-medium text-[#1A1A2E]">{row.student}</td>
                      <td className="px-4 py-3 text-[#4B5563]">{row.property}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#1A1A2E]">
                        {formatMoney(row.amount)}
                      </td>
                      <td className="px-4 py-3 text-[#4B5563]">{row.type}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <PaymentDetailModal payment={detailPayment} onClose={onCloseDetail} />
    </div>
  )
}

export { formatMoney, formatDate }
