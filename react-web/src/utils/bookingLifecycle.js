/**
 * Client-side booking lifecycle helpers (mirrors ApplicationDisplayStatus).
 */

function parseDateOnly(raw) {
  if (!raw) return null
  const s = String(raw).trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function resolveDisplayStatus(booking) {
  if (!booking) return 'pending'
  if (booking.displayStatus) return String(booking.displayStatus).toLowerCase()

  const status = String(booking.status || booking.applicationStatus || 'pending').toLowerCase()
  if (status === 'rejected') return 'rejected'
  if (status === 'pending') return 'pending'
  if (status === 'completed') return 'completed'
  if (status !== 'accepted') return 'pending'

  const depositPaid = booking.depositPaid !== false
  if (!depositPaid) return 'pending_payment'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const moveIn = parseDateOnly(booking.preferredMoveIn)
  const moveOut = parseDateOnly(booking.leaseEnd || booking.leaseEndDate)

  if (moveOut && today > moveOut) return 'completed'
  if (moveIn && today >= moveIn && (!moveOut || today <= moveOut)) return 'active'
  return 'confirmed'
}

/** Whether the landlord "End Tenancy" action should be shown. */
export function canShowEndTenancy(booking) {
  if (!booking?.id) return false

  const status = String(booking.status || booking.applicationStatus || '').toLowerCase()
  if (status === 'completed' || status === 'rejected' || status === 'pending') return false

  const key = resolveDisplayStatus(booking)
  if (key === 'confirmed' || key === 'active') return true
  if (key === 'completed' && status === 'accepted') return true

  return false
}
