import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const DATE_FILTERS = [
  { key: 'last7', label: 'Last 7 Days' },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'last90', label: 'Last 90 Days' },
  { key: 'thisYear', label: 'This Year' },
]

function formatNumber(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '0'
  return v.toLocaleString('en-MY')
}

function formatMoney(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return 'RM 0'
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function formatDate(value) {
  if (!value) return '—'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

function ChartTooltip({ active, payload, label, valueLabel }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-[#1A1A2E]">{label}</p>
      <p className="text-[#DC2626]">
        {formatNumber(payload[0].value)} {valueLabel}
      </p>
    </div>
  )
}

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-[#1A1A2E]">{label}</p>
      <p className="text-[#DC2626]">{formatMoney(payload[0].value)}</p>
    </div>
  )
}

function ReportChartCard({ title, subtitle, children }) {
  return (
    <article className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-sm font-bold text-[#1A1A2E]">{title}</h3>
      {subtitle ? <p className="mt-0.5 text-xs text-[#6B7280]">{subtitle}</p> : null}
      <div className="mt-4 h-52 w-full">{children}</div>
    </article>
  )
}

function ReportTable({ title, columns, rows, emptyMessage }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
      <div className="border-b border-[#E2E8F0] px-4 py-3 sm:px-6">
        <h3 className="text-sm font-bold text-[#1A1A2E]">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[#6B7280] sm:px-6">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#FAFAFA] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 sm:px-6">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-[#FAFAFA]">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-[#4B5563] sm:px-6">
                      {row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default function AdminReports({
  dateFilter,
  loading,
  userGrowthData,
  propertyGrowthData,
  revenueData,
  bookingTrendsData,
  userReportRows,
  propertyReportRows,
  bookingReportRows,
  onDateFilterChange,
  onExportCsv,
  onExportPdf,
  onPrint,
}) {
  return (
    <div id="admin-reports-root" className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
              <span aria-hidden="true">📈 </span>
              Reports
            </h1>
            <p className="mt-2 text-sm text-[#6B7280]">Analytics and insights across the platform</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {DATE_FILTERS.map((filter) => {
              const active = dateFilter === filter.key
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => onDateFilterChange(filter.key)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold sm:text-sm ${
                    active
                      ? 'bg-[#DC2626] text-white'
                      : 'border border-[#E2E8F0] bg-white text-[#4B5563] hover:bg-[#FEF2F2]'
                  }`}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onExportCsv}
            className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#4B5563] hover:bg-[#FAFAFA] disabled:opacity-50"
          >
            Export as CSV
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onExportPdf}
            className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-50"
          >
            Export as PDF
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onPrint}
            className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#4B5563] hover:bg-[#FAFAFA] disabled:opacity-50"
          >
            Print
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-[#6B7280]">Loading reports…</p>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ReportChartCard title="User Growth" subtitle="Monthly user signups">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={userGrowthData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <Tooltip content={<ChartTooltip valueLabel="signups" />} />
                    <Line type="monotone" dataKey="users" stroke="#DC2626" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard title="Property Growth" subtitle="Monthly property listings">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={propertyGrowthData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <Tooltip content={<ChartTooltip valueLabel="listings" />} />
                    <Bar dataKey="properties" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard title="Revenue Overview" subtitle="Monthly revenue">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <Tooltip content={<RevenueTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard title="Booking Trends" subtitle="Monthly bookings">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bookingTrendsData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <Tooltip content={<ChartTooltip valueLabel="bookings" />} />
                    <Line type="monotone" dataKey="bookings" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </section>

            <div className="space-y-6">
              <ReportTable
                title="User Report"
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'email', label: 'Email' },
                  { key: 'role', label: 'Role' },
                  { key: 'joined', label: 'Joined' },
                  { key: 'status', label: 'Status' },
                ]}
                rows={userReportRows}
                emptyMessage="No users in this period."
              />
              <ReportTable
                title="Property Report"
                columns={[
                  { key: 'name', label: 'Property' },
                  { key: 'city', label: 'City' },
                  { key: 'landlord', label: 'Landlord' },
                  { key: 'status', label: 'Status' },
                  { key: 'listed', label: 'Listed' },
                ]}
                rows={propertyReportRows}
                emptyMessage="No properties in this period."
              />
              <ReportTable
                title="Booking Report"
                columns={[
                  { key: 'id', label: 'ID' },
                  { key: 'student', label: 'Student' },
                  { key: 'property', label: 'Property' },
                  { key: 'status', label: 'Status' },
                  { key: 'submitted', label: 'Submitted' },
                ]}
                rows={bookingReportRows}
                emptyMessage="No bookings in this period."
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export { formatDate, formatMoney, formatNumber }
