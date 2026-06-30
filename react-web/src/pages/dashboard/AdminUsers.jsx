import { getIdentityAdminState } from '../../utils/verificationStatus'
import { resolveUploadUrl } from '../../services/verificationApi'

const inputClass =
  'w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#1A1A2E] outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20'

function StatusBadge({ status }) {
  const s = String(status || 'active').toLowerCase()
  const classes =
    s === 'suspended'
      ? 'bg-red-100 text-red-800'
      : s === 'pending'
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-green-100 text-green-800'
  const label = s === 'suspended' ? 'Suspended' : s === 'pending' ? 'Pending' : 'Active'
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`}>{label}</span>
}

function RoleBadge({ role }) {
  const r = String(role || '').toLowerCase()
  const classes =
    r === 'admin'
      ? 'bg-red-100 text-red-800'
      : r === 'landlord'
        ? 'bg-orange-100 text-orange-800'
        : 'bg-purple-100 text-purple-800'
  const label = r === 'admin' ? 'Admin' : r === 'landlord' ? 'Landlord' : 'Student'
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${classes}`}>{label}</span>
}

function IdentityBadge({ docStatus, role }) {
  const r = String(role || '').toLowerCase()
  if (r === 'admin') {
    return <span className="text-xs text-[#9CA3AF]">—</span>
  }

  const state = getIdentityAdminState(docStatus)
  const styles = {
    verified: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
  }
  const icons = { verified: '✅', pending: '⏳', rejected: '❌' }
  const labels = { verified: 'Verified', pending: 'Pending', rejected: 'Rejected' }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[state]}`}>
      <span aria-hidden="true">{icons[state]}</span>
      {labels[state]}
    </span>
  )
}

function EmailVerifiedBadge({ verified }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#10B981]">
        <span aria-hidden="true">✅</span> Email verified
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6B7280]">
      <span aria-hidden="true">○</span> Email not verified
    </span>
  )
}

function Pagination({ page, totalPages, total, pageSize, onPageChange }) {
  if (totalPages <= 1) return null

  const start = page * pageSize + 1
  const end = Math.min((page + 1) * pageSize, total)

  const pages = []
  const maxVisible = 5
  let startPage = Math.max(0, page - 2)
  let endPage = Math.min(totalPages - 1, startPage + maxVisible - 1)
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(0, endPage - maxVisible + 1)
  }
  for (let i = startPage; i <= endPage; i += 1) pages.push(i)

  return (
    <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[#6B7280]">
        Showing {start}-{end} of {total.toLocaleString('en-MY')} users
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
        {startPage > 0 ? (
          <>
            <button
              type="button"
              onClick={() => onPageChange(0)}
              className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#4B5563] hover:bg-[#FAFAFA]"
            >
              1
            </button>
            {startPage > 1 ? <span className="px-1 text-[#9CA3AF]">…</span> : null}
          </>
        ) : null}
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
        {endPage < totalPages - 1 ? (
          <>
            {endPage < totalPages - 2 ? <span className="px-1 text-[#9CA3AF]">…</span> : null}
            <button
              type="button"
              onClick={() => onPageChange(totalPages - 1)}
              className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#4B5563] hover:bg-[#FAFAFA]"
            >
              {totalPages}
            </button>
          </>
        ) : null}
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

function UserDetailModal({
  user,
  detailLoading,
  detailVerification,
  bookings,
  properties,
  activity,
  saving,
  isSelf,
  onClose,
  onToggleStatus,
  onDelete,
  onVerify,
  onOpenVerification,
}) {
  if (!user) return null

  const accountStatus = String(user.displayStatus || 'active').toLowerCase()
  const isSuspended = accountStatus === 'suspended'
  const role = String(user.role || '').toLowerCase()

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-[#E2E8F0] px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-[#1A1A2E]">{user.displayName}</h2>
            <p className="mt-1 text-sm text-[#6B7280]">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[#6B7280] hover:bg-[#FAFAFA]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-[#6B7280]">User ID</dt>
              <dd className="mt-1 text-sm font-medium text-[#1A1A2E]">{user.id}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-[#6B7280]">Role</dt>
              <dd className="mt-1">
                <RoleBadge role={user.role} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-[#6B7280]">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={user.displayStatus} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-[#6B7280]">Joined</dt>
              <dd className="mt-1 text-sm text-[#1A1A2E]">{user.joinedDisplay}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-[#6B7280]">Email</dt>
              <dd className="mt-1">
                <EmailVerifiedBadge verified={user.verified} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-[#6B7280]">Identity</dt>
              <dd className="mt-1">
                <IdentityBadge docStatus={user.documentVerificationStatus} role={user.role} />
              </dd>
            </div>
            {user.university ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase text-[#6B7280]">University</dt>
                <dd className="mt-1 text-sm text-[#1A1A2E]">{user.university}</dd>
              </div>
            ) : null}
          </dl>

          {role === 'student' || role === 'landlord' ? (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#1A1A2E]">Verification documents</h3>
                {onOpenVerification ? (
                  <button
                    type="button"
                    onClick={() => onOpenVerification(user)}
                    className="rounded-lg bg-[#DC2626] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#B91C1C]"
                  >
                    Review verification
                  </button>
                ) : null}
              </div>
              {detailLoading ? (
                <p className="mt-2 text-sm text-[#6B7280]">Loading documents…</p>
              ) : !detailVerification ? (
                <p className="mt-2 text-sm text-[#6B7280]">No verification documents on file.</p>
              ) : (
                <div className="mt-3 space-y-4">
                  {detailVerification.submittedAt ? (
                    <p className="text-xs text-[#6B7280]">
                      Submitted {new Date(detailVerification.submittedAt).toLocaleString()}
                    </p>
                  ) : null}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {detailVerification.grantUrl ? (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase text-[#6B7280]">
                          {detailVerification.grantLabel || 'Document'}
                        </p>
                        <img
                          src={resolveUploadUrl(detailVerification.grantUrl)}
                          alt=""
                          className="max-h-40 w-full rounded-lg border border-[#E2E8F0] object-contain"
                        />
                      </div>
                    ) : null}
                    {detailVerification.selfieUrl ? (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase text-[#6B7280]">Selfie</p>
                        <img
                          src={resolveUploadUrl(detailVerification.selfieUrl)}
                          alt=""
                          className="max-h-40 w-full rounded-lg border border-[#E2E8F0] object-cover"
                        />
                      </div>
                    ) : null}
                  </div>
                  {detailVerification.systemChecks ? (
                    <ul className="space-y-1 rounded-lg bg-[#FAFAFA] p-3 text-sm text-[#4B5563]">
                      <li>
                        <span aria-hidden="true">
                          {detailVerification.systemChecks.icFormatValid ? '✅' : '❌'}{' '}
                        </span>
                        IC format valid
                      </li>
                      <li>
                        <span aria-hidden="true">
                          {detailVerification.systemChecks.noDuplicateAccount ? '✅' : '❌'}{' '}
                        </span>
                        No duplicate account
                      </li>
                      <li>
                        <span aria-hidden="true">
                          {detailVerification.systemChecks.nameMatchesSystem ? '✅' : '❌'}{' '}
                        </span>
                        Name matches system
                      </li>
                    </ul>
                  ) : null}
                </div>
              )}
            </section>
          ) : null}

          <section>
            <h3 className="text-sm font-bold text-[#1A1A2E]">Activity history</h3>
            {detailLoading ? (
              <p className="mt-2 text-sm text-[#6B7280]">Loading…</p>
            ) : activity.length === 0 ? (
              <p className="mt-2 text-sm text-[#6B7280]">No activity recorded.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {activity.map((a) => (
                  <li key={a.id} className="rounded-lg bg-[#FAFAFA] px-3 py-2 text-sm text-[#4B5563]">
                    {a.text}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {role === 'student' ? (
            <section>
              <h3 className="text-sm font-bold text-[#1A1A2E]">Bookings</h3>
              {detailLoading ? (
                <p className="mt-2 text-sm text-[#6B7280]">Loading…</p>
              ) : bookings.length === 0 ? (
                <p className="mt-2 text-sm text-[#6B7280]">No bookings found.</p>
              ) : (
                <ul className="mt-2 divide-y divide-[#E2E8F0] rounded-lg border border-[#E2E8F0]">
                  {bookings.map((b) => (
                    <li key={b.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="text-[#1A1A2E]">Application #{b.id}</span>
                      <span className="capitalize text-[#6B7280]">{b.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {role === 'landlord' ? (
            <section>
              <h3 className="text-sm font-bold text-[#1A1A2E]">Properties</h3>
              {detailLoading ? (
                <p className="mt-2 text-sm text-[#6B7280]">Loading…</p>
              ) : properties.length === 0 ? (
                <p className="mt-2 text-sm text-[#6B7280]">No properties listed.</p>
              ) : (
                <ul className="mt-2 divide-y divide-[#E2E8F0] rounded-lg border border-[#E2E8F0]">
                  {properties.map((p) => (
                    <li key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="text-[#1A1A2E]">{p.name || `Property #${p.id}`}</span>
                      <span className="capitalize text-[#6B7280]">{p.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-[#E2E8F0] px-6 py-4">
          <button
            type="button"
            disabled={saving || isSelf}
            onClick={onToggleStatus}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              isSuspended ? 'bg-[#10B981] hover:bg-[#059669]' : 'bg-[#F59E0B] hover:bg-[#D97706]'
            }`}
          >
            {saving ? 'Saving…' : isSuspended ? 'Activate' : 'Suspend'}
          </button>
          {!user.verified && user.needsVerification ? (
            <button
              type="button"
              onClick={onVerify}
              className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C]"
            >
              Verify identity
            </button>
          ) : null}
          <button
            type="button"
            disabled={saving || isSelf}
            onClick={onDelete}
            className="rounded-lg border border-[#DC2626] bg-white px-4 py-2 text-sm font-semibold text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminUsers({
  totalUsers,
  users,
  loading,
  searchInput,
  roleFilter,
  statusFilter,
  selectedIds,
  page,
  totalPages,
  pageSize,
  filteredTotal,
  detailUser,
  detailLoading,
  detailVerification,
  detailBookings,
  detailProperties,
  detailActivity,
  actionSavingId,
  bulkSaving,
  currentAdminId,
  onSearchInputChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onSearch,
  onReset,
  onToggleSelect,
  onToggleSelectAll,
  onPageChange,
  onViewUser,
  onCloseDetail,
  onSuspendUser,
  onVerifyUser,
  onToggleDetailStatus,
  onDeleteUser,
  onBulkSuspend,
  onBulkDelete,
  onOpenVerification,
}) {
  const allSelected = users.length > 0 && users.every((u) => selectedIds.has(u.id))

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
            <span aria-hidden="true">👥 </span>
            Manage Users
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">View and manage all users on the platform</p>
          <p className="mt-1 text-sm font-semibold text-[#DC2626]">
            {totalUsers.toLocaleString('en-MY')} total users
          </p>
        </header>

        {/* Filters */}
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm lg:col-span-1">
              <span className="mb-1.5 block font-medium text-[#4B5563]">Search</span>
              <input
                type="search"
                className={inputClass}
                placeholder="Name or email…"
                value={searchInput}
                onChange={(e) => onSearchInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-[#4B5563]">Role</span>
              <select className={inputClass} value={roleFilter} onChange={(e) => onRoleFilterChange(e.target.value)}>
                <option value="all">All</option>
                <option value="student">Student</option>
                <option value="landlord">Landlord</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-[#4B5563]">Status</span>
              <select className={inputClass} value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={onSearch}
                className="flex-1 rounded-lg bg-[#DC2626] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#B91C1C]"
              >
                Search
              </button>
              <button
                type="button"
                onClick={onReset}
                className="flex-1 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#4B5563] hover:bg-[#FAFAFA]"
              >
                Reset
              </button>
            </div>
          </div>
        </section>

        {/* Bulk actions */}
        {selectedIds.size > 0 ? (
          <section className="flex flex-wrap items-center gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
            <p className="text-sm font-medium text-[#991B1B]">{selectedIds.size} selected</p>
            <button
              type="button"
              disabled={bulkSaving}
              onClick={onBulkSuspend}
              className="rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D97706] disabled:opacity-50"
            >
              Suspend Selected
            </button>
            <button
              type="button"
              disabled={bulkSaving}
              onClick={onBulkDelete}
              className="rounded-lg border border-[#DC2626] bg-white px-4 py-2 text-sm font-semibold text-[#DC2626] hover:bg-[#FEE2E2] disabled:opacity-50"
            >
              Delete Selected
            </button>
          </section>
        ) : null}

        {/* Table */}
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-sm text-[#6B7280]">Loading users…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No users match your filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                    <th className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={onToggleSelectAll}
                        aria-label="Select all on this page"
                      />
                    </th>
                    <th className="px-3 py-3">ID</th>
                    <th className="px-3 py-3">User</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Identity</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((row) => {
                    const isSelf = Number(row.id) === Number(currentAdminId)
                    const isSuspended = row.displayStatus === 'suspended'
                    return (
                      <tr key={row.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#FAFAFA]">
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(row.id)}
                            onChange={() => onToggleSelect(row.id)}
                            disabled={isSelf}
                            aria-label={`Select ${row.displayName}`}
                          />
                        </td>
                        <td className="px-3 py-3 text-[#6B7280]">{row.id}</td>
                        <td className="px-3 py-3 font-medium text-[#1A1A2E]">{row.displayName}</td>
                        <td className="max-w-[200px] truncate px-3 py-3 text-[#4B5563]" title={row.email}>
                          {row.email}
                        </td>
                        <td className="px-3 py-3">
                          <RoleBadge role={row.role} />
                        </td>
                        <td className="px-3 py-3">
                          <IdentityBadge docStatus={row.documentVerificationStatus} role={row.role} />
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={row.displayStatus} />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => onViewUser(row)}
                              className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#4B5563] hover:bg-[#FAFAFA]"
                            >
                              View
                            </button>
                            {row.needsVerification ? (
                              <button
                                type="button"
                                onClick={() => onVerifyUser(row)}
                                className="rounded-lg bg-[#DC2626] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#B91C1C]"
                              >
                                Verify
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={actionSavingId === row.id || isSelf}
                                onClick={() => onSuspendUser(row)}
                                className="rounded-lg border border-[#F59E0B] bg-white px-3 py-1.5 text-xs font-semibold text-[#D97706] hover:bg-[#FFFBEB] disabled:opacity-50"
                              >
                                {actionSavingId === row.id ? '…' : isSuspended ? 'Activate' : 'Suspend'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            total={filteredTotal}
            pageSize={pageSize}
            onPageChange={onPageChange}
          />
        </section>
      </div>

      <UserDetailModal
        user={detailUser}
        detailLoading={detailLoading}
        detailVerification={detailVerification}
        bookings={detailBookings}
        properties={detailProperties}
        activity={detailActivity}
        saving={detailUser && actionSavingId === detailUser.id}
        isSelf={detailUser && Number(detailUser.id) === Number(currentAdminId)}
        onClose={onCloseDetail}
        onToggleStatus={() => detailUser && onSuspendUser(detailUser)}
        onDelete={() => detailUser && onDeleteUser(detailUser)}
        onVerify={() => detailUser && onVerifyUser(detailUser)}
        onOpenVerification={onOpenVerification}
      />
    </div>
  )
}
