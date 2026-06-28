import { resolveUploadUrl } from '../../services/verificationApi'

function roleLabel(role) {
  const r = String(role || '').toLowerCase()
  if (r === 'landlord') return 'Landlord'
  if (r === 'student') return 'Student'
  return role || 'User'
}

function VerificationCard({ user, onView }) {
  const selfieSrc = resolveUploadUrl(user.selfieUrl)

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-[#E2E8F0] bg-[#F7FAFC]">
          {selfieSrc ? (
            <img src={selfieSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl text-[#A0AEC0]" aria-hidden="true">
              👤
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-[#2D3748]">{user.fullName || 'Unnamed user'}</h3>
          <p className="mt-1 text-sm text-[#4A5568]">{roleLabel(user.role)}</p>
          <p className="mt-2 text-sm font-medium text-[#E88D5B]">
            <span aria-hidden="true">⏳ </span>
            Pending
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onView(user)}
        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#2D3748] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1A202C]"
      >
        View
      </button>
    </article>
  )
}

function SystemCheckRow({ label, passed }) {
  return (
    <li className="flex items-center gap-2 text-sm text-[#2D3748]">
      <span aria-hidden="true">{passed ? '✅' : '❌'}</span>
      <span>{label}</span>
    </li>
  )
}

function VerificationDetailModal({ user, busy, rejectionReason, onRejectionReasonChange, onApprove, onReject, onClose }) {
  if (!user) return null

  const selfieSrc = resolveUploadUrl(user.selfieUrl)
  const grantSrc = resolveUploadUrl(user.grantUrl)
  const checks = user.systemChecks || {}

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="verification-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-[#A0AEC0] transition hover:bg-[#F7FAFC] hover:text-[#2D3748] disabled:opacity-50"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 id="verification-detail-title" className="text-xl font-bold text-[#2D3748]">
          Review verification
        </h2>
        <p className="mt-1 text-sm text-[#4A5568]">
          {roleLabel(user.role)} · {user.fullName}
        </p>

        <div className="mt-6 flex flex-col items-center">
          <div className="h-48 w-48 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F7FAFC] shadow-sm">
            {selfieSrc ? (
              <img src={selfieSrc} alt={`Selfie of ${user.fullName}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-5xl text-[#A0AEC0]" aria-hidden="true">
                👤
              </div>
            )}
          </div>
          <p className="mt-4 text-lg font-semibold text-[#2D3748]">{user.fullName}</p>
        </div>

        <div className="mt-8">
          <p className="text-sm font-semibold text-[#2D3748]">{user.grantLabel || 'Grant / Tax Receipt'}</p>
          <div className="mt-3 overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F7FAFC]">
            {grantSrc ? (
              <img src={grantSrc} alt="Grant or tax receipt" className="max-h-64 w-full object-contain" />
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-[#A0AEC0]">No receipt uploaded</div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">System checks</p>
          <ul className="mt-3 space-y-2">
            <SystemCheckRow label="IC format valid (auto)" passed={checks.icFormatValid} />
            <SystemCheckRow label="No duplicate account (auto)" passed={checks.noDuplicateAccount} />
            <SystemCheckRow label="Name matches system (auto)" passed={checks.nameMatchesSystem} />
          </ul>
        </div>

        <div className="mt-6 rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] px-4 py-3 text-sm leading-relaxed text-[#4A5568]">
          <span aria-hidden="true">🔒 </span>
          IC and ID documents are processed securely. Admins only see your selfie and property documents.
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-[#4A5568]" htmlFor="verification-reject-reason">
            Rejection reason <span className="font-normal text-[#A0AEC0]">(optional)</span>
          </label>
          <textarea
            id="verification-reject-reason"
            rows={3}
            value={rejectionReason}
            onChange={(e) => onRejectionReasonChange(e.target.value)}
            placeholder="Explain why this verification is rejected…"
            className="mt-2 w-full rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-sm text-[#2D3748] outline-none focus:border-[#E88D5B] focus:ring-2 focus:ring-[#E88D5B]/20"
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={onApprove}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-600 disabled:opacity-60"
          >
            <span aria-hidden="true">✅</span>
            {busy ? 'Processing…' : 'Approve'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onReject}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            <span aria-hidden="true">❌</span>
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminVerification({
  pendingCount,
  users,
  loading,
  selectedUser,
  detailLoading,
  saving,
  rejectionReason,
  onView,
  onCloseDetail,
  onRejectionReasonChange,
  onApprove,
  onReject,
}) {
  const showEmpty = !loading && users.length === 0

  return (
    <div className="min-h-screen w-full bg-[#F7FAFC] font-sans text-[#2D3748]">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <header className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-[#2D3748] sm:text-3xl">
            <span aria-hidden="true">🛡️ </span>
            Verify Users
          </h1>
          <p className="mt-2 text-sm text-[#4A5568]">Review and verify user identities</p>
          <p className="mt-3 text-sm font-semibold text-[#E88D5B]">
            {pendingCount.toLocaleString('en-MY')} pending verification{pendingCount === 1 ? '' : 's'}
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-[#A0AEC0]">Loading pending verifications…</p>
        ) : showEmpty ? (
          <section className="rounded-xl border border-[#E2E8F0] bg-white p-12 text-center shadow-sm">
            <p className="text-4xl" aria-hidden="true">
              🛡️
            </p>
            <h2 className="mt-4 text-lg font-bold text-[#2D3748]">No pending verifications</h2>
            <p className="mt-2 text-sm text-[#4A5568]">All users are verified</p>
          </section>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <VerificationCard key={user.id} user={user} onView={onView} />
            ))}
          </div>
        )}
      </div>

      {selectedUser ? (
        <VerificationDetailModal
          user={selectedUser}
          busy={saving || detailLoading}
          rejectionReason={rejectionReason}
          onRejectionReasonChange={onRejectionReasonChange}
          onApprove={onApprove}
          onReject={onReject}
          onClose={onCloseDetail}
        />
      ) : null}
    </div>
  )
}
