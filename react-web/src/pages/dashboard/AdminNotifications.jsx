const inputClass =
  'mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#1A1A2E] outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20'

function formatDate(value) {
  if (!value) return '—'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'numeric', year: '2-digit' })
  } catch {
    return '—'
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
  const s = String(status || 'sent').toLowerCase()
  if (s === 'scheduled') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">
        <span aria-hidden="true">⏳</span> Scheduled
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
      <span aria-hidden="true">✅</span> Sent
    </span>
  )
}

function NotificationDetailModal({ notification, onClose }) {
  if (!notification) return null

  const readPct =
    notification.audienceTotal > 0
      ? Math.round((notification.readCount / notification.audienceTotal) * 100)
      : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-[#E2E8F0] bg-white px-6 py-4">
          <h2 className="text-lg font-bold text-[#1A1A2E]">Notification details</h2>
          <button type="button" onClick={onClose} className="text-sm text-[#6B7280] hover:text-[#1A1A2E]">
            Close
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Title</p>
            <p className="mt-1 text-base font-bold text-[#1A1A2E]">{notification.title}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Message</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-[#4B5563]">{notification.message}</p>
          </div>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[#6B7280]">Audience</dt>
              <dd className="font-medium text-[#1A1A2E]">{notification.audienceLabel}</dd>
            </div>
            <div>
              <dt className="text-[#6B7280]">Status</dt>
              <dd className="mt-0.5">
                <StatusBadge status={notification.status} />
              </dd>
            </div>
            <div>
              <dt className="text-[#6B7280]">Sent / scheduled</dt>
              <dd className="text-[#1A1A2E]">
                {notification.status === 'scheduled'
                  ? formatWhen(notification.scheduledAt)
                  : formatWhen(notification.sentAt)}
              </dd>
            </div>
            <div>
              <dt className="text-[#6B7280]">Created</dt>
              <dd className="text-[#1A1A2E]">{formatWhen(notification.createdAt)}</dd>
            </div>
          </dl>
          <div className="rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] p-4">
            <p className="text-sm font-bold text-[#1A1A2E]">Read statistics</p>
            <p className="mt-2 text-2xl font-bold text-[#DC2626]">
              {notification.readCount}/{notification.audienceTotal}
            </p>
            <p className="mt-1 text-sm text-[#6B7280]">{readPct}% of targeted users opened this notification</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
              <div className="h-full rounded-full bg-[#DC2626]" style={{ width: `${readPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminNotifications({
  compose,
  scheduleMode,
  scheduledAt,
  sending,
  notifications,
  loading,
  detailNotification,
  audienceCounts,
  onComposeChange,
  onScheduleModeChange,
  onScheduledAtChange,
  onSend,
  onView,
  onCloseDetail,
}) {
  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
            <span aria-hidden="true">📢 </span>
            Notifications
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">Send announcements to users</p>
        </header>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A2E]">
            <span aria-hidden="true">✉️ </span>
            Send Notification
          </h2>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              onSend()
            }}
          >
            <label className="block text-sm font-medium text-[#4B5563]">
              Notification title
              <input
                className={inputClass}
                value={compose.title}
                onChange={(e) => onComposeChange('title', e.target.value)}
                placeholder="New feature alert"
                required
              />
            </label>
            <label className="block text-sm font-medium text-[#4B5563]">
              Message
              <textarea
                className={inputClass}
                rows={4}
                value={compose.message}
                onChange={(e) => onComposeChange('message', e.target.value)}
                placeholder="Write your announcement…"
                required
              />
            </label>
            <label className="block text-sm font-medium text-[#4B5563]">
              Target audience
              <select
                className={inputClass}
                value={compose.audience}
                onChange={(e) => onComposeChange('audience', e.target.value)}
              >
                <option value="all">All Users</option>
                <option value="students">Students Only</option>
                <option value="landlords">Landlords Only</option>
              </select>
            </label>
            {audienceCounts ? (
              <p className="text-xs text-[#6B7280]">
                Estimated reach:{' '}
                {compose.audience === 'students'
                  ? audienceCounts.students
                  : compose.audience === 'landlords'
                    ? audienceCounts.landlords
                    : audienceCounts.total}{' '}
                users
              </p>
            ) : null}
            <div>
              <p className="text-sm font-medium text-[#4B5563]">Schedule</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onScheduleModeChange('now')}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    scheduleMode === 'now'
                      ? 'bg-[#DC2626] text-white'
                      : 'border border-[#E2E8F0] bg-white text-[#4B5563] hover:bg-[#FAFAFA]'
                  }`}
                >
                  Send Now
                </button>
                <button
                  type="button"
                  onClick={() => onScheduleModeChange('later')}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    scheduleMode === 'later'
                      ? 'bg-[#DC2626] text-white'
                      : 'border border-[#E2E8F0] bg-white text-[#4B5563] hover:bg-[#FAFAFA]'
                  }`}
                >
                  Schedule Later
                </button>
              </div>
              {scheduleMode === 'later' ? (
                <label className="mt-3 block text-sm font-medium text-[#4B5563]">
                  Send at
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={scheduledAt}
                    onChange={(e) => onScheduledAtChange(e.target.value)}
                    required
                  />
                </label>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={sending}
              className="rounded-lg bg-[#DC2626] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-50"
            >
              {sending ? 'Sending…' : scheduleMode === 'later' ? 'Schedule' : 'Send'}
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
          <div className="border-b border-[#E2E8F0] px-4 py-3 sm:px-6">
            <h2 className="text-sm font-bold text-[#1A1A2E]">Sent notifications</h2>
          </div>
          {loading ? (
            <p className="p-8 text-center text-sm text-[#6B7280]">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#6B7280]">No notifications sent yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#FAFAFA] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  <tr>
                    <th className="px-4 py-3 sm:px-6">Date</th>
                    <th className="px-4 py-3 sm:px-6">Title</th>
                    <th className="px-4 py-3 sm:px-6">Audience</th>
                    <th className="px-4 py-3 sm:px-6">Status</th>
                    <th className="px-4 py-3 sm:px-6">Read</th>
                    <th className="px-4 py-3 sm:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {notifications.map((row) => (
                    <tr key={row.id} className="hover:bg-[#FAFAFA]">
                      <td className="whitespace-nowrap px-4 py-3 text-[#4B5563] sm:px-6">
                        {formatDate(row.status === 'scheduled' ? row.scheduledAt : row.sentAt || row.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#1A1A2E] sm:px-6">{row.title}</td>
                      <td className="px-4 py-3 text-[#4B5563] sm:px-6">{row.audienceLabel}</td>
                      <td className="px-4 py-3 sm:px-6">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-[#4B5563] sm:px-6">
                        {row.status === 'scheduled'
                          ? '—'
                          : `${row.readCount}/${row.audienceTotal}`}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        <button
                          type="button"
                          onClick={() => onView(row)}
                          className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-semibold text-[#4B5563] hover:bg-[#FAFAFA]"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <NotificationDetailModal notification={detailNotification} onClose={onCloseDetail} />
    </div>
  )
}

export { formatDate, formatWhen }
