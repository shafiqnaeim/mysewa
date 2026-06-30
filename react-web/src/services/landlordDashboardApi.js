import { getApplicationDisplayKey } from '../utils/applicationDisplayStatus'

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  }
}

async function parseJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || `Request failed (HTTP ${res.status})`)
  }
  return data
}

export async function fetchLandlordProperties(landlordId, token) {
  const res = await fetch(`/api/v1/properties/landlord/${encodeURIComponent(landlordId)}`, {
    headers: authHeaders(token),
  })
  const data = await parseJson(res)
  return Array.isArray(data.items) ? data.items : []
}

export async function fetchLandlordBookings(token) {
  const res = await fetch('/api/v1/applications/for-landlord', {
    headers: authHeaders(token),
  })
  const data = await parseJson(res)
  return Array.isArray(data.items) ? data.items : []
}

export async function fetchLandlordPayments(token) {
  const res = await fetch('/api/v1/payments/landlord', {
    headers: authHeaders(token),
  })
  const data = await parseJson(res)
  return Array.isArray(data.items) ? data.items : []
}

export async function fetchLandlordReviews(token) {
  const res = await fetch('/api/v1/reviews/landlord', {
    headers: authHeaders(token),
  })
  const data = await parseJson(res)
  return Array.isArray(data.items) ? data.items : []
}

export async function fetchLandlordDashboardData(landlordId, token) {
  const [propertiesResult, bookingsResult, paymentsResult, reviewsResult] = await Promise.allSettled([
    fetchLandlordProperties(landlordId, token),
    fetchLandlordBookings(token),
    fetchLandlordPayments(token),
    fetchLandlordReviews(token),
  ])

  const firstError = [propertiesResult, bookingsResult, paymentsResult, reviewsResult].find(
    (r) => r.status === 'rejected',
  )
  if (propertiesResult.status === 'rejected') {
    throw propertiesResult.reason
  }

  return {
    properties: propertiesResult.status === 'fulfilled' ? propertiesResult.value : [],
    bookings: bookingsResult.status === 'fulfilled' ? bookingsResult.value : [],
    payments: paymentsResult.status === 'fulfilled' ? paymentsResult.value : [],
    reviews: reviewsResult.status === 'fulfilled' ? reviewsResult.value : [],
    partialError:
      firstError && firstError !== propertiesResult
        ? firstError.reason?.message || 'Some dashboard data could not be loaded.'
        : null,
  }
}

export function countActiveBookings(bookings) {
  return (bookings || []).filter((app) => {
    const key = getApplicationDisplayKey(app)
    return ['pending_payment', 'confirmed', 'active'].includes(key)
  }).length
}

export function isCompletedPayment(status) {
  const s = String(status || '').toLowerCase()
  return s === 'completed' || s === 'paid' || s === 'received'
}

export function sumCompletedEarnings(payments) {
  return (payments || []).reduce((sum, row) => {
    if (!isCompletedPayment(row.status)) return sum
    const n = Number(row.amount)
    return Number.isFinite(n) ? sum + n : sum
  }, 0)
}

export function averageReviewRating(reviews) {
  const rows = reviews || []
  if (!rows.length) return null
  const total = rows.reduce((sum, r) => sum + (Number(r.ratingOverall ?? r.rating) || 0), 0)
  return total / rows.length
}

export function formatRelativeTime(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const diff = Date.now() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days === 1 ? '' : 's'} ago`
  } catch {
    return ''
  }
}

function studentName(app) {
  return app.student?.fullName?.trim() || 'A student'
}

export function buildLandlordActivities(bookings, payments, reviews) {
  const items = []

  for (const app of bookings || []) {
    const property = app.propertyName || `Property #${app.propertyId}`
    const key = getApplicationDisplayKey(app)
    const status = String(app.status || '').toLowerCase()

    if (status === 'pending') {
      items.push({
        id: `app-pending-${app.id}`,
        badge: 'NEW BOOKING',
        badgeClass: 'bg-[#EBF8FF] text-[#3182CE]',
        message: `${studentName(app)} requested to rent "${property}"`,
        time: formatRelativeTime(app.createdAt),
        sortAt: new Date(app.createdAt || 0).getTime(),
        actions: ['accept', 'decline'],
      })
    }

    if (key === 'pending_payment') {
      items.push({
        id: `app-approved-${app.id}`,
        badge: 'APPROVED',
        badgeClass: 'bg-[#FFFAF0] text-[#D69E2E]',
        message: `Application approved for "${property}" — awaiting deposit`,
        time: formatRelativeTime(app.updatedAt || app.createdAt),
        sortAt: new Date(app.updatedAt || app.createdAt || 0).getTime(),
        actions: [],
      })
    }

    if (key === 'confirmed' || key === 'active') {
      items.push({
        id: `app-confirmed-${app.id}`,
        badge: 'CONFIRMED',
        badgeClass: 'bg-[#EBF8FF] text-[#3182CE]',
        message: `${studentName(app)} confirmed booking for "${property}"`,
        time: formatRelativeTime(app.updatedAt || app.createdAt),
        sortAt: new Date(app.updatedAt || app.createdAt || 0).getTime(),
        actions: [],
      })
    }
  }

  for (const payment of payments || []) {
    if (!isCompletedPayment(payment.status)) continue
    const amount = Number(payment.amount)
    const amountLabel = Number.isFinite(amount)
      ? `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : 'a payment'
    items.push({
      id: `payment-${payment.id}`,
      badge: 'PAYMENT',
      badgeClass: 'bg-[#F0FFF4] text-[#38A169]',
      message: `Payment of ${amountLabel} received from ${payment.studentName || 'a student'}`,
      time: formatRelativeTime(payment.createdAt),
      sortAt: new Date(payment.createdAt || 0).getTime(),
      actions: [],
    })
  }

  for (const review of reviews || []) {
    const property = review.propertyName || `Property #${review.propertyId}`
    items.push({
      id: `review-${review.id}`,
      badge: 'REVIEW',
      badgeClass: 'bg-[#FFFAF0] text-[#D69E2E]',
      message: `${review.studentDisplayName || 'A student'} reviewed "${property}" — ${review.rating} stars`,
      time: formatRelativeTime(review.createdAt),
      sortAt: new Date(review.createdAt || 0).getTime(),
      actions: [],
    })
  }

  return items
    .sort((a, b) => (b.sortAt || 0) - (a.sortAt || 0))
    .slice(0, 5)
}

export function mapPropertyForDashboard(property, bookings) {
  const occupied = (bookings || []).some((app) => {
    if (Number(app.propertyId) !== Number(property.id)) return false
    const key = getApplicationDisplayKey(app)
    return ['pending_payment', 'confirmed', 'active'].includes(key)
  })

  const price = Number(property.price)
  const priceLabel = Number.isFinite(price) && price > 0 ? `RM ${price.toLocaleString('en-MY')}/mo` : '—'

  const rating = Number(property.averageRating)
  const stars = Number.isFinite(rating) && rating > 0 ? Math.round(rating) : 0

  const listingStatus = String(property.status || '').toLowerCase()
  let statusLabel = occupied ? 'Occupied' : 'Available'
  let statusClass = occupied ? 'bg-[#F0FFF4] text-[#38A169]' : 'bg-[#EBF8FF] text-[#3182CE]'
  if (listingStatus === 'inactive' || listingStatus === 'draft') {
    statusLabel = listingStatus === 'draft' ? 'Draft' : 'Inactive'
    statusClass = 'bg-[#EDF2F7] text-[#4A5568]'
  }

  return {
    id: property.id,
    name: property.name || `Property #${property.id}`,
    price: priceLabel,
    status: statusLabel,
    statusClass,
    rating: Math.min(5, Math.max(0, stars)),
    raw: property,
  }
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function buildLast6MonthBuckets() {
  const buckets = []
  const now = new Date()
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      monthLabel: MONTH_SHORT[d.getMonth()],
      key: `${d.getFullYear()}-${d.getMonth()}`,
    })
  }
  return buckets
}

function parseIsoDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function isAcceptedBooking(app) {
  const status = String(app?.status || '').toLowerCase()
  if (status === 'rejected' || status === 'cancelled') return false
  const key = getApplicationDisplayKey(app)
  return ['pending_payment', 'confirmed', 'active', 'accepted'].includes(key) || status === 'accepted'
}

function isActiveBooking(app) {
  const key = getApplicationDisplayKey(app)
  return ['pending_payment', 'confirmed', 'active'].includes(key)
}

function displayPaymentType(rawType) {
  const t = String(rawType || '').toLowerCase()
  if (t.includes('deposit')) return 'Deposit'
  if (t.includes('rent')) return 'Rent'
  return 'Payment'
}

function displayPaymentStatus(rawStatus) {
  return isCompletedPayment(rawStatus) ? 'paid' : 'pending'
}

function filterByDateRange(rows, dateKey, filterKey) {
  if (!filterKey || filterKey === 'year') {
    const yearStart = new Date(new Date().getFullYear(), 0, 1)
    return (rows || []).filter((row) => {
      const d = parseIsoDate(row[dateKey])
      return d && d >= yearStart
    })
  }
  const days = filterKey === '7d' ? 7 : filterKey === '90d' ? 90 : 30
  const cutoff = Date.now() - days * 86400000
  return (rows || []).filter((row) => {
    const d = parseIsoDate(row[dateKey])
    return d && d.getTime() >= cutoff
  })
}

export function buildMonthlyEarningsChart(payments) {
  const buckets = buildLast6MonthBuckets().map((b) => ({ ...b, amount: 0 }))
  for (const payment of payments || []) {
    if (!isCompletedPayment(payment.status)) continue
    const dt = parseIsoDate(payment.createdAt)
    if (!dt) continue
    const key = `${dt.getFullYear()}-${dt.getMonth()}`
    const bucket = buckets.find((b) => b.key === key)
    if (bucket) bucket.amount += Number(payment.amount) || 0
  }
  return buckets.map((b) => ({ month: b.monthLabel, amount: Math.round(b.amount) }))
}

export function buildMonthlyBookingsChart(bookings) {
  const buckets = buildLast6MonthBuckets().map((b) => ({ ...b, bookings: 0 }))
  for (const booking of bookings || []) {
    const dt = parseIsoDate(booking.createdAt)
    if (!dt) continue
    const key = `${dt.getFullYear()}-${dt.getMonth()}`
    const bucket = buckets.find((b) => b.key === key)
    if (bucket) bucket.bookings += 1
  }
  return buckets.map((b) => ({ month: b.monthLabel, bookings: b.bookings }))
}

export function buildPropertyPerformanceRows(properties, bookings, payments, reviews) {
  return (properties || []).map((property) => {
    const propertyId = Number(property.id)
    const propertyBookings = (bookings || []).filter((b) => Number(b.propertyId) === propertyId)
    const acceptedBookings = propertyBookings.filter(isAcceptedBooking)
    const activeBookings = propertyBookings.filter(isActiveBooking)

    const revenue = (payments || []).reduce((sum, payment) => {
      if (Number(payment.propertyId) !== propertyId) return sum
      if (!isCompletedPayment(payment.status)) return sum
      const n = Number(payment.amount)
      return Number.isFinite(n) ? sum + n : sum
    }, 0)

    const propertyReviews = (reviews || []).filter((r) => Number(r.propertyId) === propertyId)
    const rating =
      propertyReviews.length > 0
        ? propertyReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / propertyReviews.length
        : Number(property.averageRating) || 0

    const occupancy =
      propertyBookings.length > 0
        ? Math.min(100, Math.round((activeBookings.length / propertyBookings.length) * 100))
        : 0

    const listingStatus = String(property.status || '').toLowerCase()
    let status = 'active'
    if (listingStatus === 'inactive' || listingStatus === 'draft' || listingStatus === 'rejected') {
      status = 'inactive'
    } else if (occupancy < 50) {
      status = 'low'
    }

    return {
      id: property.id,
      property: property.name || `Property #${property.id}`,
      bookings: propertyBookings.length,
      revenue,
      rating: Number.isFinite(rating) && rating > 0 ? rating : null,
      occupancy,
      status,
    }
  })
}

export function buildTransactionRows(payments, { limit = 10 } = {}) {
  return [...(payments || [])]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, limit)
    .map((payment) => ({
      id: payment.id,
      date: payment.createdAt,
      student: payment.studentName || 'Student',
      property: payment.propertyName || `Property #${payment.propertyId || '—'}`,
      amount: Number(payment.amount) || 0,
      type: displayPaymentType(payment.type),
      status: displayPaymentStatus(payment.status),
    }))
}

export function buildKeyInsights(propertyRows) {
  const rows = propertyRows || []
  if (!rows.length) {
    return [
      {
        title: 'Best Performing Property',
        headline: '—',
        detail: 'No revenue data yet',
        meta: 'List a property to get started',
        accent: 'border-l-[#48BB78]',
      },
      {
        title: 'Highest Occupancy',
        headline: '—',
        detail: 'No bookings yet',
        meta: 'Share your listings',
        accent: 'border-l-[#E88D5B]',
      },
      {
        title: 'Growth Opportunity',
        headline: '—',
        detail: 'Add your first listing',
        meta: 'Improve photos and pricing',
        accent: 'border-l-[#ED8936]',
      },
    ]
  }

  const bestRevenue = [...rows].sort((a, b) => b.revenue - a.revenue)[0]
  const highestOccupancy = [...rows].sort((a, b) => b.occupancy - a.occupancy)[0]
  const growth = [...rows].sort((a, b) => a.occupancy - b.occupancy)[0]

  return [
    {
      title: 'Best Performing Property',
      headline: bestRevenue.property,
      detail: `RM ${bestRevenue.revenue.toLocaleString('en-MY')} revenue`,
      meta: bestRevenue.rating ? `${bestRevenue.rating.toFixed(1)} rating` : 'No reviews yet',
      accent: 'border-l-[#48BB78]',
    },
    {
      title: 'Highest Occupancy',
      headline: highestOccupancy.property,
      detail: `${highestOccupancy.occupancy}% occupancy`,
      meta: `${highestOccupancy.bookings} bookings`,
      accent: 'border-l-[#E88D5B]',
    },
    {
      title: 'Growth Opportunity',
      headline: growth.property,
      detail: `${growth.occupancy}% occupancy`,
      meta: growth.occupancy < 50 ? 'Improve listing photos' : 'Promote this listing',
      accent: 'border-l-[#ED8936]',
    },
  ]
}

export function buildReportsSummaryStats(properties, bookings, payments, reviews) {
  const propertyCount = (properties || []).length
  const bookingCount = (bookings || []).length
  const totalRevenue = sumCompletedEarnings(payments)
  const avgRating = averageReviewRating(reviews)

  return [
    {
      key: 'properties',
      label: 'Total Properties',
      value: String(propertyCount),
      change: propertyCount === 1 ? '1 active listing' : `${propertyCount} active listings`,
      positive: true,
      border: 'border-l-[#3182CE]',
    },
    {
      key: 'bookings',
      label: 'Total Bookings',
      value: String(bookingCount),
      change: `${countActiveBookings(bookings)} active bookings`,
      positive: true,
      border: 'border-l-[#48BB78]',
    },
    {
      key: 'revenue',
      label: 'Total Revenue',
      value: `RM ${totalRevenue.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      change: `${(payments || []).filter((p) => isCompletedPayment(p.status)).length} completed payments`,
      positive: true,
      border: 'border-l-[#E88D5B]',
    },
    {
      key: 'rating',
      label: 'Average Rating',
      value: avgRating != null ? avgRating.toFixed(1) : '—',
      change: avgRating != null ? `${(reviews || []).length} reviews` : 'No reviews yet',
      positive: avgRating != null,
      border: 'border-l-[#9F7AEA]',
    },
  ]
}

export function buildLandlordReportsData({ properties, bookings, payments, reviews }, dateFilter = '30d') {
  const filteredPayments = filterByDateRange(payments, 'createdAt', dateFilter)
  const filteredBookings = filterByDateRange(bookings, 'createdAt', dateFilter)

  const propertyRows = buildPropertyPerformanceRows(properties, bookings, payments, reviews)

  return {
    summaryStats: buildReportsSummaryStats(properties, filteredBookings, filteredPayments, reviews),
    earningsData: buildMonthlyEarningsChart(payments),
    bookingsData: buildMonthlyBookingsChart(bookings),
    propertyRows,
    transactionRows: buildTransactionRows(payments),
    insights: buildKeyInsights(propertyRows),
    hasData: propertyCountOrActivity(properties, bookings, payments, reviews),
  }
}

function propertyCountOrActivity(properties, bookings, payments, reviews) {
  return (
    (properties || []).length > 0 ||
    (bookings || []).length > 0 ||
    (payments || []).length > 0 ||
    (reviews || []).length > 0
  )
}
