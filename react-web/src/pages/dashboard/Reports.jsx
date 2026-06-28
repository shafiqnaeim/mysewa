import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const DATE_FILTERS = [
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: '90d', label: 'Last 90 Days' },
  { key: 'year', label: 'This Year' },
]

function IconDownload({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 10.5 12 15m0 0 4.5-4.5M12 15V3" />
    </svg>
  )
}

function IconStar({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292Z" />
    </svg>
  )
}

function formatMoney(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return 'RM 0'
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatShortDate(value) {
  if (!value) return '—'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'numeric', year: '2-digit' })
  } catch {
    return String(value)
  }
}

function PropertyStatusBadge({ status }) {
  if (status === 'low') {
    return (
      <span className="inline-flex rounded-full bg-[#FFFAF0] px-2.5 py-0.5 text-xs font-semibold text-[#D69E2E]">
        Low Occupancy
      </span>
    )
  }
  if (status === 'inactive') {
    return (
      <span className="inline-flex rounded-full bg-[#FFF5F5] px-2.5 py-0.5 text-xs font-semibold text-[#E53E3E]">
        Inactive
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full bg-[#F0FFF4] px-2.5 py-0.5 text-xs font-semibold text-[#38A169]">
      Active
    </span>
  )
}

function PaymentStatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'paid') {
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

function SectionCard({ title, children }) {
  return (
    <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
      {title ? <h2 className="mb-5 text-lg font-semibold text-[#2D3748]">{title}</h2> : null}
      {children}
    </section>
  )
}

function EarningsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-[#2D3748]">{label}</p>
      <p className="text-[#E88D5B]">{formatMoney(payload[0].value)}</p>
    </div>
  )
}

function BookingsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-[#2D3748]">{label}</p>
      <p className="text-[#3182CE]">{payload[0].value} bookings</p>
    </div>
  )
}

function ReportsSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4.5rem)] w-full bg-[#FAFAFA] font-sans text-[#2D3748] lg:min-h-screen">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className="h-20 animate-pulse rounded-xl bg-[#E2E8F0]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-[#E2E8F0]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl bg-[#E2E8F0]" />
          <div className="h-80 animate-pulse rounded-xl bg-[#E2E8F0]" />
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-[#E2E8F0]" />
      </div>
    </div>
  )
}

export default function Reports({
  loading = false,
  error = '',
  hasData = false,
  dateFilter = '30d',
  onDateFilterChange,
  summaryStats = [],
  earningsData = [],
  bookingsData = [],
  propertyRows = [],
  transactionRows = [],
  insights = [],
  onExport,
}) {
  const currentMonthLabel = useMemo(
    () => new Date().toLocaleString('en-US', { month: 'short' }),
    [],
  )

  if (loading) {
    return <ReportsSkeleton />
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] w-full bg-[#FAFAFA] font-sans text-[#2D3748] lg:min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <h1 className="text-2xl font-bold text-[#2D3748]">Reports &amp; Analytics</h1>
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        </div>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] w-full bg-[#FAFAFA] font-sans text-[#2D3748] lg:min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-[#2D3748]">Reports &amp; Analytics</h1>
          <p className="mt-4 text-sm text-[#A0AEC0]">No data available yet</p>
          <p className="mt-2 text-sm text-[#4A5568]">Start listing properties to see insights here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4.5rem)] w-full bg-[#FAFAFA] font-sans text-[#2D3748] lg:min-h-screen">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2D3748]">Reports &amp; Analytics</h1>
            <p className="mt-1 text-sm text-[#A0AEC0]">Overview of your property performance and earnings</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              {DATE_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => onDateFilterChange?.(filter.key)}
                  className={`rounded-full border px-4 py-1 text-sm font-medium transition ${
                    dateFilter === filter.key
                      ? 'border-[#E88D5B] bg-[#FFF5F0] text-[#E88D5B]'
                      : 'border-[#E2E8F0] bg-white text-[#4A5568] hover:bg-[#F7FAFC]'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onExport}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E88D5B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d97a48]"
            >
              <IconDownload />
              Export Report
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryStats.map((stat) => (
            <article
              key={stat.key}
              className={`rounded-xl border border-[#E2E8F0] border-l-4 bg-white p-6 shadow-sm ${stat.border}`}
            >
              <p className="text-sm text-[#A0AEC0]">{stat.label}</p>
              <p className="mt-2 text-2xl font-bold text-[#2D3748]">{stat.value}</p>
              <p className={`mt-2 text-xs font-medium ${stat.positive ? 'text-[#48BB78]' : 'text-[#FC8181]'}`}>
                {stat.change}
              </p>
            </article>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard title="Earnings Overview">
            <div className="h-72 w-full">
              {earningsData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={earningsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#A0AEC0', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: '#A0AEC0', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `RM ${v}`}
                    />
                    <Tooltip content={<EarningsTooltip />} cursor={{ fill: '#F7FAFC' }} />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {earningsData.map((entry) => (
                        <Cell
                          key={entry.month}
                          fill={entry.month === currentMonthLabel ? '#E88D5B' : '#CBD5E0'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-[#A0AEC0]">No earnings data yet</p>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Booking Trends">
            <div className="h-72 w-full">
              {bookingsData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bookingsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#A0AEC0', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#A0AEC0', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<BookingsTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="bookings"
                      stroke="#3182CE"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#3182CE', strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#E88D5B' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-[#A0AEC0]">No booking data yet</p>
              )}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Property Performance">
          <div className="overflow-x-auto">
            {propertyRows.length ? (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#F7FAFC] text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">
                  <tr>
                    <th className="px-4 py-3">Property</th>
                    <th className="px-4 py-3">Bookings</th>
                    <th className="px-4 py-3">Revenue</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Occupancy</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {propertyRows.map((row) => (
                    <tr key={row.id} className="hover:bg-[#FAFAFA]">
                      <td className="px-4 py-4 font-medium text-[#2D3748]">{row.property}</td>
                      <td className="px-4 py-4 text-[#4A5568]">{row.bookings}</td>
                      <td className="px-4 py-4 font-semibold text-[#2D3748]">{formatMoney(row.revenue)}</td>
                      <td className="px-4 py-4">
                        {row.rating != null ? (
                          <span className="inline-flex items-center gap-1 text-[#ED8936]">
                            {row.rating.toFixed(1)}
                            <IconStar />
                          </span>
                        ) : (
                          <span className="text-[#A0AEC0]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-[#4A5568]">{row.occupancy}%</td>
                      <td className="px-4 py-4">
                        <PropertyStatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-[#A0AEC0]">No properties to display.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Recent Transactions">
          <div className="overflow-x-auto">
            {transactionRows.length ? (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#F7FAFC] text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">
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
                  {transactionRows.map((row) => (
                    <tr key={row.id} className="hover:bg-[#FAFAFA]">
                      <td className="whitespace-nowrap px-4 py-4 text-[#4A5568]">{formatShortDate(row.date)}</td>
                      <td className="px-4 py-4 font-medium text-[#2D3748]">{row.student}</td>
                      <td className="px-4 py-4 text-[#4A5568]">{row.property}</td>
                      <td className="px-4 py-4 font-semibold text-[#2D3748]">{formatMoney(row.amount)}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-[#EBF4FF] px-2.5 py-0.5 text-xs font-semibold text-[#3182CE]">
                          {row.type}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <PaymentStatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-[#A0AEC0]">No transactions yet.</p>
            )}
          </div>
        </SectionCard>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-[#2D3748]">Key Insights</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {insights.map((insight) => (
              <article
                key={insight.title}
                className={`rounded-xl border border-[#E2E8F0] border-l-4 bg-white p-6 shadow-sm ${insight.accent}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">{insight.title}</p>
                <p className="mt-3 text-lg font-bold text-[#2D3748]">{insight.headline}</p>
                <p className="mt-2 text-sm text-[#4A5568]">{insight.detail}</p>
                <p className="mt-1 text-sm text-[#A0AEC0]">{insight.meta}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
