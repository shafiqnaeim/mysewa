import { getApplicationDisplayKey } from './applicationDisplayStatus'

const ELIGIBLE_STATUSES = new Set(['accepted', 'approved', 'confirmed', 'completed'])
const ELIGIBLE_DISPLAY_KEYS = new Set(['pending_payment', 'confirmed', 'active', 'completed'])

/** Student may review once the landlord has approved the application (no need to wait for tenancy to end). */
export function isReviewEligibleApplication(application) {
  if (!application?.propertyId) return false

  const status = String(application.status || application.applicationStatus || '').toLowerCase()
  if (status === 'rejected' || status === 'pending') return false
  if (ELIGIBLE_STATUSES.has(status)) return true

  const display = String(application.displayStatus || '').toLowerCase()
  if (display === 'approved' || display === 'confirmed') return true

  return ELIGIBLE_DISPLAY_KEYS.has(getApplicationDisplayKey(application))
}

export function canLeaveReview(application, reviewedPropertyIds = new Set()) {
  if (!isReviewEligibleApplication(application)) return false

  const pid = Number(application.propertyId)
  if (!Number.isFinite(pid)) return false

  if (reviewedPropertyIds instanceof Set) return !reviewedPropertyIds.has(pid)
  if (Array.isArray(reviewedPropertyIds)) return !reviewedPropertyIds.includes(pid)
  return true
}

/** @deprecated use {@link canLeaveReview} */
export const canLeaveReviewOnMyBookings = canLeaveReview

/** @deprecated tenancy end no longer required for reviews */
export function isCompletedTenancy(app) {
  return isReviewEligibleApplication(app)
}

/** @deprecated use {@link isReviewEligibleApplication} */
export function isBookingStatusCompleted(application) {
  return isReviewEligibleApplication(application)
}
