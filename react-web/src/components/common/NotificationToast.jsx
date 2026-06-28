import {
  getBookingDecisionHeadline,
  getDisplayLandlordMessage,
  isBookingApproved,
  isBookingRejected,
  previewLandlordMessage,
  resolveLandlordMessage,
} from '../../utils/landlordBookingMessage'

/**
 * Push a booking decision toast (approved / rejected) with optional landlord message preview.
 */
export function showBookingDecisionNotification(pushToast, application) {
  if (!pushToast || !application) return

  const customMessage = resolveLandlordMessage(application)
  const preview = previewLandlordMessage(customMessage)

  if (isBookingApproved(application)) {
    pushToast({
      title: '✅ Application approved!',
      message: preview || 'Your landlord approved your application. Pay your deposit to confirm.',
      type: 'success',
      duration: 7000,
    })
    return
  }

  if (isBookingRejected(application)) {
    pushToast({
      title: '❌ Application rejected.',
      message: preview || 'Your landlord declined this application.',
      type: 'error',
      duration: 7000,
    })
  }
}

export function LandlordMessagePreview({ application, className = '' }) {
  const headline = getBookingDecisionHeadline(application)
  const customMessage = resolveLandlordMessage(application)

  if (!headline || !customMessage) return null

  const preview = previewLandlordMessage(customMessage)

  return (
    <div className={`rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] px-4 py-3 ${className}`}>
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${headline.className}`}
      >
        {headline.text}
      </span>
      <p className="mt-2 text-sm text-[#4A5568]">
        <span aria-hidden="true">📝 </span>
        {preview}
      </p>
    </div>
  )
}

export function LandlordMessageSection({ application, className = '' }) {
  const headline = getBookingDecisionHeadline(application)
  const displayMessage = getDisplayLandlordMessage(application)

  if (!headline) return null

  return (
    <section className={`rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] p-5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold text-[#2D3748]">
          <span aria-hidden="true">📝 </span>
          Landlord&apos;s Message
        </h3>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${headline.className}`}
        >
          {headline.text}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#4A5568]">{displayMessage}</p>
    </section>
  )
}
