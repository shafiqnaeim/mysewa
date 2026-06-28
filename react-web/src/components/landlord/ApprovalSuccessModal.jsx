import { formatDepositAmount } from '../../utils/propertyDeposit'

function formatMoveDate(value) {
  if (!value) return '—'
  try {
    const d = new Date(value.includes('T') ? value : `${value}T12:00:00`)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return String(value)
  }
}

export default function ApprovalSuccessModal({ application, depositAmount, onClose }) {
  if (!application) return null

  const applicant = application.student?.fullName?.trim() || 'Student'
  const property = application.propertyName || `Property #${application.propertyId}`
  const deposit = formatDepositAmount(depositAmount)
  const moveIn = formatMoveDate(application.preferredMoveIn)
  const moveOut = formatMoveDate(application.leaseEnd || application.leaseEndDate)

  return (
    <div className="landlord-decision-backdrop" role="presentation" onClick={onClose}>
      <div
        className="landlord-decision-dialog max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-success-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="landlord-decision-close" aria-label="Close" onClick={onClose}>
          ×
        </button>

        <p className="text-center text-4xl" aria-hidden="true">
          ✅
        </p>
        <h2 id="approval-success-title" className="landlord-decision-title text-center">
          Application Approved Successfully!
        </h2>
        <p className="landlord-decision-lead text-center">
          The student has been notified and can now pay the deposit.
        </p>

        <ul className="landlord-decision-summary">
          <li>
            <strong>Applicant:</strong> {applicant}
          </li>
          <li>
            <strong>Property:</strong> {property}
          </li>
          <li>
            <strong>Move-in:</strong> {moveIn}
          </li>
          <li>
            <strong>Move-out:</strong> {moveOut}
          </li>
          <li>
            <strong>Deposit due:</strong> {deposit}
          </li>
        </ul>

        <div className="mt-4 rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] p-4 text-sm text-[#4A5568]">
          <p className="font-semibold text-[#2D3748]">Next steps for you</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>The student will pay the deposit via MySewa (bank transfer, QR, or ToyyibPay).</li>
            <li>Status will update to <strong>CONFIRMED</strong> once payment is received.</li>
            <li>Prepare for move-in on {moveIn}.</li>
          </ol>
        </div>

        <div className="landlord-decision-actions">
          <button
            type="button"
            className="landlord-application-status-btn landlord-application-status-btn--accept w-full"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
