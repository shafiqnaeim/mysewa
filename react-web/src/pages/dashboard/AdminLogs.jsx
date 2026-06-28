const EVENT_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'user', label: 'User' },
  { value: 'property', label: 'Property' },
  { value: 'booking', label: 'Booking' },
  { value: 'payment', label: 'Payment' },
  { value: 'system', label: 'System' },
]

const inputClass =
  'mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#1A1A2E] outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20'

function LevelBadge({ level }) {
  const s = String(level || 'info').toLowerCase()
  const classes =
    s === 'error'
      ? 'bg-red-100 text-red-800'
      : s === 'warning'
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-blue-100 text-blue-800'
  const label = s === 'error' ? 'Error' : s === 'warning' ? 'Warning' : 'Info'
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`}>{label}</span>
}

function Pagination({ page, totalPages, total, pageSize, onPageChange }) {
  if (total === 0) return <p className="text-sm text-[#6B7280]">No log entries</p>
  const start = page * pageSize + 1
  const end = Math.min((page + 1) * pageSize, total)
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[#6B7280]">
        Showing {start}-{end} of {total.toLocaleString('en-MY')} log entries
      </p>
      {totalPages > 1 ? (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#4B5563] hover:bg-[#FAFAFA] disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#4B5563] hover:bg-[#FAFAFA] disabled:opacity-50"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default function AdminLogs({
  logs,
  loading,
  eventType,
  dateFrom,
  dateTo,
  search,
  appliedFilters,
  page,
  totalPages,
  filteredTotal,
  pageSize,
  onEventTypeChange,
  onDateFromChange,
  onDateToChange,
  onSearchChange,
  onApplyFilters,
  onResetFilters,
  onPageChange,
  onExportCsv,
  onExportPdf,
  onClearOldLogs,
  clearing,
}) {
  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
              <span aria-hidden="true">📝 </span>
              System Logs
            </h1>
            <p className="mt-2 text-sm text-[#6B7280]">View all system activities and events</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading || filteredTotal === 0}
              onClick={onExportCsv}
              className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#4B5563] hover:bg-[#FAFAFA] disabled:opacity-50"
            >
              Export as CSV
            </button>
            <button
              type="button"
              disabled={loading || filteredTotal === 0}
              onClick={onExportPdf}
              className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-50"
            >
              Export as PDF
            </button>
            <button
              type="button"
              disabled={loading || clearing}
              onClick={onClearOldLogs}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-[#DC2626] hover:bg-red-50 disabled:opacity-50"
            >
              {clearing ? 'Clearing…' : 'Clear Old Logs'}
            </button>
          </div>
        </header>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm font-medium text-[#4B5563]">
              Event type
              <select className={inputClass} value={eventType} onChange={(e) => onEventTypeChange(e.target.value)}>
                {EVENT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-[#4B5563]">
              Date from
              <input
                type="date"
                className={inputClass}
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-[#4B5563]">
              Date to
              <input
                type="date"
                className={inputClass}
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-[#4B5563]">
              Search
              <input
                type="search"
                className={inputClass}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="User or action…"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onApplyFilters}
              className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C]"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={onResetFilters}
              className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#4B5563] hover:bg-[#FAFAFA]"
            >
              Reset
            </button>
          </div>
          {appliedFilters ? (
            <p className="mt-3 text-xs text-[#6B7280]">Filters applied · {filteredTotal} matching entries</p>
          ) : null}
        </section>

        <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
          {loading ? (
            <p className="p-8 text-center text-sm text-[#6B7280]">Loading logs…</p>
          ) : logs.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#6B7280]">No log entries match your filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[#E2E8F0] bg-[#FAFAFA] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Details</th>
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3">Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {logs.map((row) => (
                    <tr key={row.id} className="hover:bg-[#FAFAFA]">
                      <td className="whitespace-nowrap px-4 py-3 text-[#4B5563]">{row.timestampDisplay}</td>
                      <td className="px-4 py-3 font-medium text-[#1A1A2E]">{row.user}</td>
                      <td className="px-4 py-3 text-[#4B5563]">{row.event}</td>
                      <td className="max-w-md truncate px-4 py-3 text-[#4B5563]" title={row.details}>
                        {row.details}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[#6B7280]">
                        {row.ipAddress || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <LevelBadge level={row.level} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          total={filteredTotal}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  )
}

export function formatLogTimestamp(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return String(iso)
    return d.toLocaleString('en-MY', {
      day: 'numeric',
      month: 'numeric',
      year: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return String(iso)
  }
}
