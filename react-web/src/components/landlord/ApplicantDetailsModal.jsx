import { useEffect, useState } from 'react'
import { getUniversityDisplayName, getUniversityShortLabel } from '../../utils/universityDisplayName'
import { formatDepositAmount, isDepositPaid, resolveApplicationDeposit } from '../../utils/propertyDeposit'

function formatApplicationWhen(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return String(iso)
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(iso)
  }
}

function formatDateOnly(value) {
  if (!value) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const [y, m, d] = String(value).split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    }
  }
  return formatApplicationWhen(value)
}

function formatDuration(app) {
  if (app.leaseDays != null) {
    return `${app.leaseDays} day${app.leaseDays === 1 ? '' : 's'}`
  }
  if (app.leaseMonths != null) {
    return `${app.leaseMonths} month${app.leaseMonths === 1 ? '' : 's'}`
  }
  return '—'
}

function normalizeStatus(status) {
  return String(status || 'pending').toLowerCase()
}

function initialsFromName(name) {
  const parts = String(name || 'Student')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return 'S'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function capitalizeLabel(value) {
  const v = String(value || '').trim()
  if (!v) return '—'
  return v.charAt(0).toUpperCase() + v.slice(1)
}

function getStatusBadge(app) {
  const raw = normalizeStatus(app.status)
  if (raw === 'rejected') {
    return { label: 'REJECTED', className: 'bg-red-100 text-red-800', icon: '❌' }
  }
  if (raw === 'pending') {
    return { label: 'PENDING', className: 'bg-yellow-100 text-yellow-800', icon: '⏳' }
  }
  return { label: 'APPROVED', className: 'bg-green-100 text-green-800', icon: '✅' }
}

function getDepositBadge(app) {
  if (isDepositPaid(app)) {
    return { label: 'Paid', className: 'bg-green-100 text-green-800', icon: '✅' }
  }
  return { label: 'Pending', className: 'bg-yellow-100 text-yellow-800', icon: '⏳' }
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] px-4 py-3">
      <dt className="text-xs font-semibold text-[#A0AEC0]">
        <span aria-hidden="true">{icon} </span>
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-[#2D3748]">{value}</dd>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#2D3748]">{children}</h3>
  )
}

export default function ApplicantDetailsModal({
  application,
  onClose,
  onApprove,
  onReject,
  onMarkDepositPaid,
  saving = false,
  markDepositSaving = false,
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!application) return
    const frame = requestAnimationFrame(() => setVisible(true))
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = prevOverflow
    }
  }, [application?.id])

  useEffect(() => {
    if (!application) return
    function onKey(e) {
      if (e.key === 'Escape' && !saving) onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [application, onClose, saving])

  if (!application) return null

  const student = application.student || {}
  const fullName = student.fullName?.trim() || 'Applicant'
  const universityFull = getUniversityDisplayName(student.university)
  const universityShort = getUniversityShortLabel(student.university)
  const hasUniversity = Boolean(universityFull)
  const statusBadge = getStatusBadge(application)
  const depositBadge = getDepositBadge(application)
  const isPending = normalizeStatus(application.status) === 'pending'
  const isAccepted = normalizeStatus(application.status) === 'accepted'
  const moveOut =
    application.leaseEnd || application.leaseEndDate || application.lease_end || '—'
  const depositAmount = resolveApplicationDeposit(application)

  function handleClose() {
    setVisible(false)
    window.setTimeout(() => onClose?.(), 180)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        visible ? 'bg-black/50 opacity-100 backdrop-blur-sm' : 'bg-black/0 opacity-0'
      }`}
      role="presentation"
      onClick={handleClose}
    >
      <style>{`
        @keyframes applicant-modal-in {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="applicant-details-title"
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ animation: visible ? 'applicant-modal-in 0.22s ease-out' : undefined }}
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={saving}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-xl text-[#A0AEC0] transition hover:bg-[#F7FAFC] hover:text-[#2D3748] disabled:opacity-50"
          aria-label="Close"
        >
          ✕
        </button>

        <header className="flex flex-col gap-4 border-b border-[#E2E8F0] pb-5 sm:flex-row sm:items-center sm:justify-between sm:pr-10">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#E88D5B] text-lg font-bold text-white shadow-md"
              aria-hidden="true"
            >
              {initialsFromName(fullName)}
            </div>
            <div className="min-w-0">
              <h2 id="applicant-details-title" className="text-xl font-bold text-[#2D3748]">
                {fullName}
                {hasUniversity ? (
                  <span className="ml-2 inline-flex items-center gap-1 text-base font-semibold text-[#E88D5B]">
                    <span aria-hidden="true">🏫</span>
                    {universityShort}
                  </span>
                ) : null}
              </h2>
              {hasUniversity ? (
                <p className="mt-1 text-sm font-medium text-[#718096]">
                  <span aria-hidden="true">🏫 </span>
                  {universityFull}
                </p>
              ) : null}
              <p className={`text-sm text-[#A0AEC0] ${hasUniversity ? 'mt-0.5' : 'mt-1'}`}>
                Application review
              </p>
            </div>
          </div>
          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${statusBadge.className}`}
          >
            <span aria-hidden="true">{statusBadge.icon}</span>
            {statusBadge.label}
          </span>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Left: applicant + application details */}
          <div className="space-y-6">
            <section>
              <SectionTitle>Personal Information</SectionTitle>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoRow icon="👤" label="Full Name" value={fullName} />
                <InfoRow icon="📧" label="Email" value={student.email || '—'} />
                <InfoRow icon="📱" label="Phone" value={student.phoneNumber || '—'} />
                <InfoRow icon="🌍" label="Race" value={capitalizeLabel(student.race)} />
                <InfoRow icon="🕌" label="Religion" value={capitalizeLabel(student.religion)} />
                <InfoRow
                  icon="🏫"
                  label="Institution"
                  value={hasUniversity ? universityFull : 'Not specified'}
                />
              </dl>
            </section>

            <section>
              <SectionTitle>Application Details</SectionTitle>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoRow icon="📅" label="Move In" value={formatDateOnly(application.preferredMoveIn)} />
                <InfoRow icon="📅" label="Move Out" value={formatDateOnly(moveOut)} />
                <InfoRow icon="⏱" label="Duration" value={formatDuration(application)} />
                <InfoRow icon="🕐" label="Applied Date" value={formatApplicationWhen(application.createdAt)} />
              </dl>
            </section>
          </div>

          {/* Right: property + deposit + actions */}
          <div className="flex flex-col gap-6">
            <section>
              <SectionTitle>Property Information</SectionTitle>
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">
                  <span aria-hidden="true">🏠 </span>
                  Property
                </p>
                <p className="mt-2 text-lg font-bold text-[#2D3748]">
                  {application.propertyName || `Property #${application.propertyId}`}
                </p>
                {application.propertyId ? (
                  <p className="mt-1 text-sm text-[#A0AEC0]">Listing ID: {application.propertyId}</p>
                ) : null}
              </div>
            </section>

            <section className="rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] p-5">
              <SectionTitle>Deposit</SectionTitle>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">
                    Deposit Amount
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[#2D3748]">{formatDepositAmount(depositAmount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">
                    Deposit Status
                  </p>
                  <span
                    className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${depositBadge.className}`}
                  >
                    <span aria-hidden="true">{depositBadge.icon}</span>
                    {depositBadge.label}
                  </span>
                </div>
              </div>
              {isAccepted && !isDepositPaid(application) && onMarkDepositPaid ? (
                <button
                  type="button"
                  disabled={markDepositSaving}
                  onClick={() => onMarkDepositPaid(application.id)}
                  className="mt-4 rounded-lg border border-[#E88D5B] bg-white px-4 py-2 text-sm font-semibold text-[#E88D5B] transition hover:bg-[#FFF5F0] disabled:opacity-60"
                >
                  {markDepositSaving ? 'Saving…' : 'Mark deposit as paid'}
                </button>
              ) : null}
            </section>

            <footer className="mt-auto flex flex-col gap-3 border-t border-[#E2E8F0] pt-5">
              {isPending ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      handleClose()
                      window.setTimeout(() => onApprove?.(application), 200)
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                  >
                    <span aria-hidden="true">✅</span>
                    Approve Application
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      handleClose()
                      window.setTimeout(() => onReject?.(application), 200)
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    <span aria-hidden="true">❌</span>
                    Reject Application
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className="inline-flex w-full items-center justify-center rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#2D3748] transition hover:bg-[#F7FAFC] disabled:opacity-60"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}
