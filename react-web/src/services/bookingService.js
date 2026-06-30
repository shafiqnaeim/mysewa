import { paymentMethodsFromApi } from '../pages/dashboard/AddProperty'
import { resolveMediaUrl } from '../utils/mediaUrl'

export const PAYMENT_DETAILS_UNAVAILABLE_MESSAGE =
  'Payment details not yet provided by landlord.'

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  }
}

async function parseJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || `Request failed (HTTP ${res.status})`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

/** GET /api/v1/properties/{propertyId} */
export async function fetchProperty(propertyId, token) {
  const res = await fetch(`/api/v1/properties/${encodeURIComponent(propertyId)}`, {
    headers: token ? authHeaders(token) : { Accept: 'application/json' },
  })
  const data = await parseJson(res)
  return data.item || data
}

/** GET /api/v1/properties/{propertyId}/availability?year=&month= or ?from=&to= */
export async function fetchPropertyAvailability(propertyId, query = {}, token) {
  const params = new URLSearchParams()
  if (query.year != null && query.month != null) {
    params.set('year', String(query.year))
    params.set('month', String(query.month))
  } else {
    if (query.from) params.set('from', query.from)
    if (query.to) params.set('to', query.to)
  }
  const res = await fetch(
    `/api/v1/properties/${encodeURIComponent(propertyId)}/availability?${params}`,
    {
      headers: token ? authHeaders(token) : { Accept: 'application/json' },
    },
  )
  return parseJson(res)
}

/** GET /api/v1/bookings/{bookingId}/calendar */
export async function fetchBookingCalendar(bookingId, token) {
  const auth = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('mysewa_token') : '')
  const res = await fetch(`/api/v1/bookings/${encodeURIComponent(bookingId)}/calendar`, {
    headers: auth ? authHeaders(auth) : { Accept: 'application/json' },
  })
  return parseJson(res)
}

/** PUT /api/v1/bookings/{bookingId}/end-tenancy */
export async function endTenancy(bookingId, token) {
  const auth = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('mysewa_token') : '')
  const res = await fetch(`/api/v1/bookings/${encodeURIComponent(bookingId)}/end-tenancy`, {
    method: 'PUT',
    headers: {
      ...authHeaders(auth),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bookingId: Number(bookingId) }),
  })
  return parseJson(res)
}

/** GET /api/v1/applications/{bookingId}/deposit-instructions */
export async function fetchBookingDepositInstructions(bookingId, token) {
  const res = await fetch(`/api/v1/applications/${encodeURIComponent(bookingId)}/deposit-instructions`, {
    headers: authHeaders(token),
  })
  return parseJson(res)
}

/** GET /api/v1/payments/toyyibpay/options */
export async function fetchToyyibPayOptions() {
  const res = await fetch('/api/v1/payments/toyyibpay/options', {
    headers: { Accept: 'application/json' },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { enabled: false, sandbox: true, setupHint: '' }
  return data
}

export function mapPropertyPaymentDetails(property, application) {
  const methods = paymentMethodsFromApi(property?.paymentMethods)
  const bankName = trim(property?.bankName)
  const bankAccount = trim(property?.accountNumber)
  const bankHolder = trim(property?.accountHolder)
  const qrImageUrl = trim(property?.qrCodeUrl)

  return {
    bankName,
    bankAccount,
    bankHolder,
    qrImageUrl: qrImageUrl ? resolveMediaUrl(qrImageUrl) : null,
    paymentDueDate: trim(property?.paymentDueDate),
    paymentMethods: methods,
    whatsappNumber: trim(property?.whatsappNumber),
    contactPhone: trim(property?.contactPhone),
    contactEmail: trim(property?.contactEmail),
    landlordName: trim(property?.landlordName),
    bankDetailsProvided: Boolean(bankName && bankAccount),
    qrProvided: Boolean(qrImageUrl),
    detailsProvided: Boolean((bankName && bankAccount) || qrImageUrl),
    allowedChannels: resolveAllowedChannelsFromProperty(methods),
    source: 'property',
  }
}

export function resolveAllowedChannelsFromProperty(methods) {
  const channels = []
  if (methods?.online_banking) channels.push('bank_transfer')
  if (methods?.duitnow_qr) channels.push('duitnow_qr')
  if (methods?.cash) channels.push('cash')
  if (methods?.toyyibpay) channels.push('toyyibpay')
  return channels
}

const RECEIPT_MAX_BYTES = 5 * 1024 * 1024
const RECEIPT_ACCEPT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])

export function validatePaymentReceiptFile(file) {
  if (!file) return 'Choose a file to upload.'
  if (!RECEIPT_ACCEPT_TYPES.has(file.type)) {
    return 'Accepted formats: JPG, PNG, or PDF.'
  }
  if (file.size > RECEIPT_MAX_BYTES) {
    return 'File is too large (max 5 MB).'
  }
  return null
}

/** Upload payment receipt (reuses rent receipt storage for accepted applications). */
export async function uploadPaymentReceipt(applicationId, file, token) {
  const validationError = validatePaymentReceiptFile(file)
  if (validationError) {
    throw new Error(validationError)
  }
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(
    `/api/v1/applications/${encodeURIComponent(applicationId)}/rent-months/receipt-upload`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    },
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Upload failed (HTTP ${res.status})`)
  if (!data.url) throw new Error('No file URL returned')
  return String(data.url)
}

function trim(value) {
  if (value == null) return null
  const text = String(value).trim()
  return text || null
}
