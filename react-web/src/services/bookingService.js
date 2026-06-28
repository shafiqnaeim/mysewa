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

function trim(value) {
  if (value == null) return null
  const text = String(value).trim()
  return text || null
}
