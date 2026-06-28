/**
 * Client-facing booking lifecycle labels derived from application status, deposit, and lease dates.
 */

function parseDate(value) {
  if (!value) return null
  const raw = String(value).trim()
  const iso = raw.length >= 10 ? raw.slice(0, 10) : raw
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function isDepositPaid(app) {
  if (!app) return false
  if (typeof app.depositStatus === 'string' && app.depositStatus.toLowerCase() === 'paid') return true
  return Boolean(app.depositPaid)
}

export function getApplicationDisplayKey(app) {
  if (!app) return 'pending'

  if (app.displayStatus) {
    return String(app.displayStatus).toLowerCase()
  }

  const status = String(app.status || 'pending').toLowerCase()
  if (status === 'rejected') return 'rejected'
  if (status === 'pending') return 'pending'

  if (status === 'accepted') {
    if (!isDepositPaid(app)) return 'pending_payment'

    const today = new Date()
    today.setHours(12, 0, 0, 0)

    const moveIn = parseDate(app.preferredMoveIn)
    const moveOut = parseDate(app.leaseEnd || app.leaseEndDate || app.lease_end)

    if (moveOut && today > moveOut) return 'completed'
    if (moveIn && today >= moveIn && (!moveOut || today <= moveOut)) return 'active'
    return 'confirmed'
  }

  return 'pending'
}

export function getApplicationDisplayLabel(app) {
  if (app?.displayStatusLabel) return app.displayStatusLabel
  return labelForDisplayKey(getApplicationDisplayKey(app))
}

export function labelForDisplayKey(key) {
  switch (String(key || '').toLowerCase()) {
    case 'pending_payment':
      return 'PENDING PAYMENT'
    case 'confirmed':
      return 'CONFIRMED'
    case 'active':
      return 'ACTIVE'
    case 'completed':
      return 'COMPLETED'
    case 'rejected':
      return 'REJECTED'
    default:
      return 'PENDING'
  }
}

export function getApplicationStatusBadge(app) {
  const key = getApplicationDisplayKey(app)

  switch (key) {
    case 'pending_payment':
      return { label: 'PENDING PAYMENT', emoji: '💳', className: 'bg-[#FEF3C7] text-[#B45309]' }
    case 'confirmed':
      return { label: 'CONFIRMED', emoji: '✅', className: 'bg-[#D1FAE5] text-[#059669]' }
    case 'active':
      return { label: 'ACTIVE', emoji: '🏠', className: 'bg-[#DBEAFE] text-[#1D4ED8]' }
    case 'completed':
      return { label: 'COMPLETED', emoji: '🎓', className: 'bg-[#E5E7EB] text-[#4B5563]' }
    case 'rejected':
      return { label: 'REJECTED', emoji: '❌', className: 'bg-[#FEE2E2] text-[#DC2626]' }
    default:
      return { label: 'PENDING', emoji: '⏳', className: 'bg-[#FEF3C7] text-[#D97706]' }
  }
}

export function getLandlordStatusBadge(app) {
  const key = getApplicationDisplayKey(app)

  switch (key) {
    case 'pending_payment':
      return { label: 'PENDING PAYMENT', className: 'bg-[#FFFAF0] text-[#D69E2E]' }
    case 'confirmed':
      return { label: 'CONFIRMED', className: 'bg-[#F0FFF4] text-[#38A169]' }
    case 'active':
      return { label: 'ACTIVE', className: 'bg-[#EBF8FF] text-[#3182CE]' }
    case 'completed':
      return { label: 'COMPLETED', className: 'bg-[#EDF2F7] text-[#4A5568]' }
    case 'rejected':
      return { label: 'REJECTED', className: 'bg-[#FFF5F5] text-[#E53E3E]' }
    default:
      return { label: 'PENDING', className: 'bg-[#FFFAF0] text-[#D69E2E]' }
  }
}

export function canPayDeposit(app) {
  return getApplicationDisplayKey(app) === 'pending_payment'
}

export function matchesApplicationFilter(app, filter) {
  const key = getApplicationDisplayKey(app)
  if (filter === 'all') return true
  if (filter === 'pending') return key === 'pending'
  if (filter === 'approved') {
    return ['pending_payment', 'confirmed', 'active', 'completed'].includes(key)
  }
  if (filter === 'rejected') return key === 'rejected'
  if (filter === 'completed') return key === 'completed' || (key === 'confirmed' && isDepositPaid(app))
  return true
}

/** Contact & payment details on property pages — after landlord approval or confirmed booking. */
export function canViewPropertyContactPayment(app) {
  if (!app) return false
  const key = getApplicationDisplayKey(app)
  if (key === 'rejected' || key === 'pending') return false
  const status = String(app.status || '').toLowerCase()
  if (status === 'accepted') return true
  return ['pending_payment', 'confirmed', 'active', 'completed'].includes(key)
}

/** Landlord bank / QR details in Pay Deposit — approved (accepted) or confirmed bookings only. */
export function canViewLandlordPaymentDetails(app) {
  if (!app) return false
  const status = String(app.status || '').toLowerCase()
  if (status === 'rejected' || status === 'pending' || status === 'cancelled') return false
  if (status === 'accepted') return true
  return ['pending_payment', 'confirmed', 'active', 'completed'].includes(getApplicationDisplayKey(app))
}
