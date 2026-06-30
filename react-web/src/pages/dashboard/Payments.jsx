import { useMemo } from 'react'

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

function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'paid' || normalized === 'completed') {
    return (
      <span className="inline-flex rounded-full bg-[#F0FFF4] px-2.5 py-0.5 text-xs font-semibold text-[#38A169]">
        Paid
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full bg-[#FFFAF0] px-2.5 py-0.5 text-xs font-semibold text-[#D69E2E]">
      Pending
    </span>
  )
}

function TypeBadge({ type }) {
  return (
    <span className="inline-flex rounded-full bg-[#EBF4FF] px-2.5 py-0.5 text-xs font-semibold text-[#3182CE]">
      {type}
    </span>
  )
}

const SUMMARY_CARDS = [
  { key: 'totalReceived', label: 'Total Received', border: 'border-l-[#48BB78]' },
  { key: 'pending', label: 'Pending', border: 'border-l-[#ED8936]' },
  { key: 'thisMonth', label: 'This Month', border: 'border-l-[#E88D5B]' },
]

export function computePaymentStats(payments) {
  const list = Array.isArray(payments) ? payments : []
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()

  let totalReceived = 0
  let pending = 0
  let thisMonth = 0

  for (const row of list) {
    const amount = Number(row.amount) || 0
    const isPaid = ['paid', 'completed'].includes(String(row.status || '').toLowerCase())
    if (isPaid) {
      totalReceived += amount
      const d = row.date ? new Date(row.date) : null
      if (d && !Number.isNaN(d.getTime()) && d.getMonth() === month && d.getFullYear() === year) {
        thisMonth += amount
      }
    } else {
      pending += amount
    }
  }

  return { totalReceived, pending, thisMonth }
}

export default function Payments({ payments = [], loading = false, onViewReceipt }) {
  const stats = useMemo(() => computePaymentStats(payments), [payments])

  const statValues = {
    totalReceived: formatMoney(stats.totalReceived),
    pending: formatMoney(stats.pending),
    thisMonth: formatMoney(stats.thisMonth),
  }

  const sorted = useMemo(() => {
    return [...payments].sort((a, b) => {
      const da = new Date(a.date || 0).getTime()
      const db = new Date(b.date || 0).getTime()
      return db - da
    })
  }, [payments])

  return (
    <div className="min-h-[calc(100vh-4.5rem)] w-full bg-[#FAFAFA] font-sans text-[#2D3748] lg:min-h-screen">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#2D3748]">Payments</h1>
          <p className="mt-1 text-sm text-[#4A5568]">
            Total Earnings: <span className="font-semibold text-[#2D3748]">{formatMoney(stats.totalReceived)}</span>
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {SUMMARY_CARDS.map((card) => (
            <article
              key={card.key}
              className={`rounded-xl border border-[#E2E8F0] border-l-4 bg-white p-6 shadow-sm ${card.border}`}
            >
              <p className="text-sm text-[#A0AEC0]">{card.label}</p>
              <p className="mt-2 text-2xl font-bold text-[#2D3748]">{statValues[card.key]}</p>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
          <div className="border-b border-[#E2E8F0] px-6 py-4">
            <h2 className="text-lg font-semibold text-[#2D3748]">Payment History</h2>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-[#A0AEC0]">Loading payments…</div>
          ) : sorted.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-[#A0AEC0]">
              No payment transactions yet. Deposits and rent will appear here once received.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#F7FAFC] text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Student</th>
                    <th className="px-6 py-3">Property</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {sorted.map((row) => (
                    <tr key={row.id} className="hover:bg-[#FAFAFA]">
                      <td className="whitespace-nowrap px-6 py-4 text-[#4A5568]">{formatDate(row.date)}</td>
                      <td className="px-6 py-4 font-medium text-[#2D3748]">{row.student || '—'}</td>
                      <td className="px-6 py-4 text-[#4A5568]">{row.property || '—'}</td>
                      <td className="whitespace-nowrap px-6 py-4 font-semibold text-[#2D3748]">
                        {formatMoney(row.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <TypeBadge type={row.type || 'Payment'} />
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        {row.receipt && String(row.status || '').toLowerCase() === 'paid' ? (
                          <button
                            type="button"
                            onClick={() => onViewReceipt?.(row.receipt)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#2D3748] hover:bg-[#F7FAFC]"
                          >
                            <span aria-hidden="true">📄</span>
                            View Receipt
                          </button>
                        ) : (
                          <span className="text-xs text-[#A0AEC0]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
