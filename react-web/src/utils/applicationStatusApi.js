/**
 * Normalize landlord decision status for PUT /api/v1/applications/:id/status.
 * Backend stores: pending | accepted | rejected (completed is derived in the UI).
 */
export function normalizeLandlordDecisionStatus(status) {
  const value = String(status || '')
    .trim()
    .toLowerCase()
  if (value === 'approved' || value === 'approve' || value === 'accept') return 'accepted'
  if (value === 'rejected' || value === 'reject' || value === 'declined') return 'rejected'
  return value
}

export function buildLandlordStatusUpdateBody(status, { depositAmount, message } = {}) {
  const normalized = normalizeLandlordDecisionStatus(status)
  const body = { status: normalized }

  if (
    normalized === 'accepted' &&
    depositAmount != null &&
    Number.isFinite(Number(depositAmount))
  ) {
    body.depositAmount = Number(depositAmount)
  }

  const trimmedMessage = String(message ?? '').trim()
  if (trimmedMessage) {
    body.message = trimmedMessage.slice(0, 500)
  }

  return body
}
