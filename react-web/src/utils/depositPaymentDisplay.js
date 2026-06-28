import { PAYMENT_DETAILS_UNAVAILABLE_MESSAGE } from '../services/bookingService'
import { resolveMediaUrl } from './mediaUrl'

export { PAYMENT_DETAILS_UNAVAILABLE_MESSAGE }

export function resolveDepositQrUrl(instructions) {
  if (!instructions?.qrImageUrl) return ''
  return resolveMediaUrl(instructions.qrImageUrl)
}

export function filterDepositPaymentMethods(methods, allowedChannels) {
  if (!Array.isArray(allowedChannels) || allowedChannels.length === 0) {
    return []
  }
  const allowed = new Set(allowedChannels)
  return methods.filter((method) => allowed.has(method.id))
}

export function hasLandlordBankDetails(details) {
  return Boolean(details?.bankDetailsProvided || (details?.bankName && details?.bankAccount))
}

export function hasLandlordQrDetails(details) {
  return Boolean(details?.qrProvided || details?.qrImageUrl)
}

export function formatWhatsappLink(number) {
  if (!number) return null
  const digits = String(number).replace(/\D/g, '')
  if (!digits) return null
  const normalized = digits.startsWith('60') ? digits : `60${digits.replace(/^0+/, '')}`
  return `https://wa.me/${normalized}`
}
