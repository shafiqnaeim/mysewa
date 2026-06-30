import { parseLeaseRange, tenancyPeriodLabel } from '../../utils/rentTrackerUtils'

export default function EndTenancyConfirmModal({
  studentName,
  propertyName,
  preferredMoveIn,
  leaseEnd,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const studentLabel = studentName?.trim() || 'Student'
  const propertyLabel = propertyName?.trim() || 'this property'
  const periodLabel = tenancyPeriodLabel(parseLeaseRange(preferredMoveIn, leaseEnd))

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-tenancy-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-[#A0AEC0] transition hover:bg-[#F7FAFC] hover:text-[#2D3748] disabled:opacity-50"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 id="end-tenancy-title" className="text-center text-xl font-bold text-[#2D3748]">
          <span aria-hidden="true">⚠️ </span>
          End Tenancy
        </h2>

        <p className="mt-4 text-center text-sm leading-relaxed text-[#4A5568]">
          Are you sure you want to end this tenancy?
        </p>

        <div className="mt-6 space-y-3 rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] px-5 py-4 text-sm text-[#4A5568]">
          <p>
            <span className="font-semibold text-[#2D3748]">Student name:</span> {studentLabel}
          </p>
          <p>
            <span className="font-semibold text-[#2D3748]">Property:</span> {propertyLabel}
          </p>
          <p>
            <span className="font-semibold text-[#2D3748]">Tenancy period:</span> {periodLabel}
          </p>
        </div>

        <p className="mt-4 text-center text-sm font-medium text-red-600">
          This action cannot be undone.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-5 py-3 text-sm font-semibold text-[#2D3748] transition hover:bg-[#F7FAFC] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            {busy ? (
              'Ending…'
            ) : (
              <>
                <span aria-hidden="true">✅</span>
                Yes, End Tenancy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
