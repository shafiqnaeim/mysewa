/**
 * Deposit amount from a property listing (rentalStyle JSON or API deposit field).
 */
export function parsePropertyDeposit(property) {
  if (!property) return null

  const topLevel = property.deposit
  if (topLevel != null && topLevel !== '') {
    const n = Number(topLevel)
    if (Number.isFinite(n) && n >= 0) return n
  }

  const raw = property.rentalStyle
  if (!raw) return null

  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    const d = parsed?.deposit
    if (d != null && d !== '') {
      const n = Number(d)
      if (Number.isFinite(n) && n >= 0) return n
    }
  } catch {
    /* not JSON */
  }

  return null
}

/**
 * Required deposit for display — property listing only.
 * Does NOT use landlordDepositAmount or depositAmountSuggested (25% estimate).
 */
export function resolveApplicationDeposit(app) {
  if (!app) return null

  const candidates = [
    app.depositAmount,
    app.propertyDepositAmount,
    app.property_deposit_amount,
    app.landlordDepositAmount,
    app.landlord_deposit_amount,
    parsePropertyDeposit(app.property),
  ]

  for (const raw of candidates) {
    const n = Number(raw)
    if (raw != null && raw !== '' && Number.isFinite(n) && n > 0) {
      return n
    }
  }

  return null
}

/**
 * Attach listing deposit from landlord properties onto each application row.
 */
export function mergeApplicationsWithPropertyDeposits(applications, properties) {
  const byId = new Map((properties || []).map((p) => [Number(p.id), p]))

  return (applications || []).map((app) => {
    const property = byId.get(Number(app.propertyId))
    const listingDeposit = parsePropertyDeposit(property)

    if (listingDeposit == null) {
      return {
        ...app,
        depositAmount: app.depositAmount ?? app.propertyDepositAmount ?? null,
        propertyDepositAmount: app.propertyDepositAmount ?? app.depositAmount ?? null,
      }
    }

    return {
      ...app,
      depositAmount: listingDeposit,
      propertyDepositAmount: listingDeposit,
    }
  })
}

export function resolveDepositStatus(app) {
  if (!app) return 'pending'
  if (typeof app.depositStatus === 'string' && app.depositStatus.trim()) {
    return app.depositStatus.toLowerCase()
  }
  return app.depositPaid ? 'paid' : 'pending'
}

export function formatDepositAmount(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '—'
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Calculate deposit from monthly rent and percentage (default 25%).
 */
export function calculateDeposit(rent, percentage = 25) {
  const r = Number(rent)
  const p = Number(percentage)
  if (!Number.isFinite(r) || r < 0) return null
  if (!Number.isFinite(p) || p < 0) return null
  return Math.round(r * (p / 100) * 100) / 100
}

/**
 * Human-readable deposit payment status label.
 */
export function getDepositStatus(status) {
  const key = String(status || 'pending').toLowerCase()
  if (key === 'paid') return 'Paid'
  if (key === 'pending') return 'Pending'
  if (key === 'unpaid') return 'Unpaid'
  return key.charAt(0).toUpperCase() + key.slice(1)
}

export function isDepositPaid(app) {
  return resolveDepositStatus(app) === 'paid' || Boolean(app?.depositPaid)
}
