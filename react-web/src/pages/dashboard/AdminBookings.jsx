const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'completed', label: 'Completed' },
]

function BookingStatusBadge({ status }) {
  const s = String(status || 'pending').toLowerCase()
  const config = {
    approved: { label: 'Approved', emoji: '✅', className: 'bg-green-100 text-green-800' },
    pending: { label: 'Pending', emoji: '⏳', className: 'bg-yellow-100 text-yellow-800' },
    rejected: { label: 'Rejected', emoji: '❌', className: 'bg-red-100 text-red-800' },
    completed: { label: 'Completed', emoji: '✓', className: 'bg-blue-100 text-blue-800' },
  }
  const row = config[s] || config.pending
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.className}`}>
      <span aria-hidden="true">{row.emoji}</span> {row.label}
    </span>
  )
}

function Pagination({ page, totalPages, total, pageSize, onPageChange }) {
  if (totalPages <= 1 && total <= pageSize) {
    return (
      <p className="mt-6 text-sm text-[#6B7280]">
        Showing {total.toLocaleString('en-MY')} bookings
      </p>
    )
  }

  const start = page * pageSize + 1
  const end = Math.min((page + 1) * pageSize, total)

  const pages = []
  const maxVisible = 5
  let startPage = Math.max(0, page - 2)
  let endPage = Math.min(totalPages - 1, startPage + maxVisible - 1)
  if (endPage - startPage < maxVisible - 1) startPage = Math.max(0, endPage - maxVisible + 1)
  for (let i = startPage; i <= endPage; i += 1) pages.push(i)

  return (
    <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[#6B7280]">
        Showing {start}-{end} of {total.toLocaleString('en-MY')} bookings
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#4B5563] hover:bg-[#FAFAFA] disabled:opacity-50"
        >
          Previous
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              p === page
                ? 'bg-[#DC2626] text-white'
                : 'border border-[#E2E8F0] bg-white text-[#4B5563] hover:bg-[#FAFAFA]'
            }`}
          >
            {p + 1}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#4B5563] hover:bg-[#FAFAFA] disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}

function BookingDetailModal({ booking, detailLoading, onClose, onCancel }) {
  if (!booking) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-[#E2E8F0] bg-white px-6 py-4">
          <h2 className="text-lg font-bold text-[#1A1A2E]">Booking #{booking.id}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#6B7280] hover:bg-[#F3F4F6]"
          >
            Close
          </button>
        </div>

        <div className="space-y-6 p-6">
          {detailLoading ? (
            <p className="text-sm text-[#6B7280]">Loading details…</p>
          ) : (
            <>
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Booking summary</p>
                <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[#6B7280]">Student</dt>
                    <dd className="font-medium text-[#1A1A2E]">{booking.studentName}</dd>
                  </div>
                  <div>
                    <dt className="text-[#6B7280]">Property</dt>
                    <dd className="font-medium text-[#1A1A2E]">{booking.propertyName}</dd>
                  </div>
                  <div>
                    <dt className="text-[#6B7280]">Landlord</dt>
                    <dd className="font-medium text-[#1A1A2E]">{booking.landlordName}</dd>
                  </div>
                  <div>
                    <dt className="text-[#6B7280]">Status</dt>
                    <dd className="mt-0.5">
                      <BookingStatusBadge status={booking.displayStatus} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6B7280]">Dates</dt>
                    <dd className="text-[#1A1A2E]">{booking.datesDisplay}</dd>
                  </div>
                  <div>
                    <dt className="text-[#6B7280]">Monthly rent</dt>
                    <dd className="font-semibold text-[#DC2626]">{booking.rentDisplay || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[#6B7280]">Submitted</dt>
                    <dd className="text-[#1A1A2E]">{booking.submittedDisplay}</dd>
                  </div>
                  <div>
                    <dt className="text-[#6B7280]">Lease length</dt>
                    <dd className="text-[#1A1A2E]">{booking.leaseLengthDisplay}</dd>
                  </div>
                </dl>
              </section>

              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Payment history</p>
                {booking.payments?.length ? (
                  <ul className="mt-3 space-y-2">
                    {booking.payments.map((payment) => (
                      <li
                        key={payment.id}
                        className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-[#1A1A2E]">{payment.label}</p>
                          <p className="text-xs text-[#6B7280]">{payment.when}</p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            payment.paid
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {payment.paid ? 'Paid' : 'Pending'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-[#6B7280]">No payment records for this booking yet.</p>
                )}
              </section>

              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  Messages & activity
                </p>
                {booking.messages?.length ? (
                  <ul className="mt-3 space-y-2">
                    {booking.messages.map((msg) => (
                      <li
                        key={msg.id}
                        className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm"
                      >
                        <p className="font-medium text-[#1A1A2E]">{msg.title}</p>
                        <p className="mt-1 text-[#4B5563]">{msg.body}</p>
                        <p className="mt-1 text-xs text-[#9CA3AF]">{msg.when}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-[#6B7280]">No activity recorded.</p>
                )}
                <p className="mt-3 text-xs text-[#9CA3AF]">
                  Direct chat between student and landlord is handled in their Property Hub dashboards.
                </p>
              </section>

              {booking.displayStatus === 'approved' || booking.displayStatus === 'pending' ? (
                <div className="flex justify-end border-t border-[#E2E8F0] pt-4">
                  <button
                    type="button"
                    onClick={() => onCancel?.(booking)}
                    className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-[#DC2626] hover:bg-red-50"
                  >
                    Cancel booking
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function RowActions({ booking, saving, onView, onApprove, onReject, onCancel }) {
  const status = booking.displayStatus
  const busy = saving === booking.id

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onView(booking)}
        className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-semibold text-[#4B5563] hover:bg-[#FAFAFA]"
      >
        View
      </button>
      {status === 'pending' ? (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => onApprove(booking)}
            className="rounded-lg bg-[#10B981] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#059669] disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onReject(booking)}
            className="rounded-lg bg-[#DC2626] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-50"
          >
            Reject
          </button>
        </>
      ) : null}
      {status === 'approved' ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onCancel(booking)}
          className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#DC2626] hover:bg-red-50 disabled:opacity-50"
        >
          Cancel
        </button>
      ) : null}
    </div>
  )
}

export default function AdminBookings({
  totalBookings,
  bookings,
  loading,
  activeTab,
  page,
  totalPages,
  pageSize,
  filteredTotal,
  detailBooking,
  detailLoading,
  savingId,
  onTabChange,
  onPageChange,
  onView,
  onApprove,
  onReject,
  onCancel,
  onCloseDetail,
}) {
  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
            <span aria-hidden="true">📋 </span>
            Manage Bookings
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">View and manage all bookings across the platform</p>
          <p className="mt-1 text-sm font-semibold text-[#DC2626]">
            {totalBookings.toLocaleString('en-MY')} total bookings
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-[#DC2626] text-white'
                    : 'border border-[#E2E8F0] bg-white text-[#4B5563] hover:bg-[#FEF2F2]'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
          {loading ? (
            <p className="p-8 text-center text-sm text-[#6B7280]">Loading bookings…</p>
          ) : bookings.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#6B7280]">No bookings match this filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[#E2E8F0] bg-[#FAFAFA] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Property</th>
                    <th className="px-4 py-3">Landlord</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 font-medium text-[#1A1A2E]">{booking.id}</td>
                      <td className="px-4 py-3 text-[#4B5563]">{booking.studentName}</td>
                      <td className="px-4 py-3 text-[#4B5563]">{booking.propertyName}</td>
                      <td className="px-4 py-3 text-[#4B5563]">{booking.landlordName}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#4B5563]">{booking.datesDisplay}</td>
                      <td className="px-4 py-3">
                        <BookingStatusBadge status={booking.displayStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <RowActions
                          booking={booking}
                          saving={savingId}
                          onView={onView}
                          onApprove={onApprove}
                          onReject={onReject}
                          onCancel={onCancel}
                        />
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

      <BookingDetailModal
        booking={detailBooking}
        detailLoading={detailLoading}
        onClose={onCloseDetail}
        onCancel={onCancel}
      />
    </div>
  )
}
