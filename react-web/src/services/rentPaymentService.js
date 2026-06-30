function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

/** Apply rent calendar year payload to React state setters. */
export function applyRentCalendarPayload(setters, data) {
  if (!data || typeof data !== 'object') return
  const {
    setPaidMonths,
    setRentMonthRecords,
    setStudentRentPaymentLogs,
    setLeaseRange,
    parseLeaseRange,
  } = setters
  if (Array.isArray(data.paidMonths) && setPaidMonths) {
    setPaidMonths(data.paidMonths.map((n) => Number(n)))
  }
  if (Array.isArray(data.rentMonthRecords) && setRentMonthRecords) {
    setRentMonthRecords(data.rentMonthRecords)
  }
  if (Array.isArray(data.studentRentPaymentLogs) && setStudentRentPaymentLogs) {
    setStudentRentPaymentLogs(data.studentRentPaymentLogs)
  }
  if (setLeaseRange && parseLeaseRange && (data.preferredMoveIn || data.leaseEnd || data.leaseEndDate)) {
    setLeaseRange(parseLeaseRange(data.preferredMoveIn, data.leaseEnd ?? data.leaseEndDate))
  }
}

/** POST /api/v1/rent-payments/log */
export async function logRentPayment({ bookingId, year, month, paymentMethod, receiptUrl }, token) {
  const auth = token || localStorage.getItem('mysewa_token')
  const res = await fetch('/api/v1/rent-payments/log', {
    method: 'POST',
    headers: authHeaders(auth),
    body: JSON.stringify({ bookingId, year, month, paymentMethod, receiptUrl }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Could not log payment (${res.status})`)
  return data
}

/** GET /api/v1/rent-payments/booking/{bookingId} */
export async function fetchRentPaymentLogs(bookingId, token) {
  const auth = token || localStorage.getItem('mysewa_token')
  const res = await fetch(`/api/v1/rent-payments/booking/${encodeURIComponent(bookingId)}`, {
    headers: { Authorization: `Bearer ${auth}`, Accept: 'application/json' },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Could not load payment logs (${res.status})`)
  return Array.isArray(data.items) ? data.items : []
}

/** PUT /api/v1/rent-payments/{paymentLogId}/confirm */
export async function confirmRentPayment(paymentLogId, { amount } = {}, token) {
  const auth = token || localStorage.getItem('mysewa_token')
  const body = amount != null ? { amount } : {}
  const res = await fetch(`/api/v1/rent-payments/${encodeURIComponent(paymentLogId)}/confirm`, {
    method: 'PUT',
    headers: authHeaders(auth),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Could not confirm payment (${res.status})`)
  return data
}

/** Map API receipt payload to ReceiptModal shape. */
export function mapRentReceiptApi(data) {
  if (!data || typeof data !== 'object') return null
  return {
    receiptNumber: data.receiptNumber,
    paymentDate: data.paymentDate || data.confirmedAt,
    confirmedAt: data.confirmedAt || data.paymentDate,
    studentName: data.studentName,
    propertyName: data.propertyName,
    propertyAddress: data.propertyAddress,
    monthLabel: data.monthLabel,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    landlordName: data.landlordName,
    status: 'paid',
    bookingId: data.bookingId,
    year: data.year,
    month: data.month,
    paymentLogId: data.paymentLogId,
  }
}

/** GET /api/v1/rent-payments/{paymentLogId}/receipt */
export async function fetchRentPaymentReceipt(paymentLogId, token) {
  const auth = token || localStorage.getItem('mysewa_token')
  const res = await fetch(`/api/v1/rent-payments/${encodeURIComponent(paymentLogId)}/receipt`, {
    headers: { Authorization: `Bearer ${auth}`, Accept: 'application/json' },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Could not load receipt (${res.status})`)
  return mapRentReceiptApi(data)
}
