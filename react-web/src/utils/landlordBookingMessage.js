const PREVIEW_MAX = 50

export function resolveLandlordMessage(application) {
  return String(application?.landlordMessage || application?.landlord_message || '').trim()
}

export function previewLandlordMessage(text, max = PREVIEW_MAX) {
  const value = String(text || '').trim()
  if (!value) return ''
  if (value.length <= max) return value
  return `${value.slice(0, max)}...`
}

export function isBookingApproved(application) {
  return String(application?.status || '').toLowerCase() === 'accepted'
}

export function isBookingRejected(application) {
  return String(application?.status || '').toLowerCase() === 'rejected'
}

export function isBookingDecided(application) {
  return isBookingApproved(application) || isBookingRejected(application)
}

export function getDefaultLandlordMessage(application) {
  if (isBookingApproved(application)) {
    return 'Your application has been approved. Pay your deposit to confirm your booking.'
  }
  if (isBookingRejected(application)) {
    return 'Your application was not accepted.'
  }
  return ''
}

export function getDisplayLandlordMessage(application) {
  return resolveLandlordMessage(application) || getDefaultLandlordMessage(application)
}

export function getBookingDecisionHeadline(application) {
  if (isBookingApproved(application)) {
    return { text: '✅ Application approved!', className: 'bg-green-100 text-green-800' }
  }
  if (isBookingRejected(application)) {
    return { text: '❌ Application rejected.', className: 'bg-red-100 text-red-800' }
  }
  return null
}
