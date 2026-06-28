import { formatRm } from '../../utils/rentTrackerUtils'

export default function MarkRentUnavailableConfirmModal({
  monthLabel,
  propertyName,
  amount,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const amountLabel =
    amount != null && Number.isFinite(Number(amount)) ? formatRm(amount) : '—'
  const propertyLabel = propertyName?.trim() || 'this property'

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
        aria-labelledby="mark-rent-unavailable-title"
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

        <h2 id="mark-rent-unavailable-title" className="text-center text-xl font-bold text-[#2D3748]">
          <span aria-hidden="true">📤 </span>
          Mark {monthLabel} as Unavailable
        </h2>

        <p className="mt-4 text-center text-sm leading-relaxed text-[#4A5568]">
          Are you sure you want to mark rent for <strong>{propertyLabel}</strong> in{' '}
          <strong>{monthLabel}</strong> as unavailable? No rent will be expected for this month.
        </p>

        <div className="mt-6 rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] px-5 py-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">Listed rent</p>
          <p className="mt-1 text-2xl font-bold text-[#2D3748]">{amountLabel}</p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-5 py-3 text-sm font-semibold text-[#2D3748] transition hover:bg-[#F7FAFC] disabled:opacity-60"
          >
            <span aria-hidden="true">❌</span>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#2D3748] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1A202C] disabled:opacity-60"
          >
            {busy ? (
              'Processing…'
            ) : (
              <>
                <span aria-hidden="true">✅</span>
                Confirm
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
