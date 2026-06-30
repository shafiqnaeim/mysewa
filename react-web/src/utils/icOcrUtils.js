/** Malaysian NRIC format: YYMMDD-PB-#### */
export const IC_FORMAT_REGEX = /^\d{6}-\d{2}-\d{4}$/

const IC_EXTRACT_REGEX = /(\d{6})[\s-]?(\d{2})[\s-]?(\d{4})/

const NAME_NOISE = [
  'MALAYSIA',
  'KAD PENGENALAN',
  'KAD PENGENALAN MALAYSIA',
  'MYKAD',
  'IDENTITY CARD',
  'WARGANEGARA',
  'LELAKI',
  'PEREMPUAN',
  'NEGERI',
]

export function formatIcNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.length !== 12) return ''
  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 12)}`
}

export function validateIcFormat(icNumber) {
  const trimmed = String(icNumber || '').trim()
  if (IC_FORMAT_REGEX.test(trimmed)) return true
  const formatted = formatIcNumber(trimmed)
  return formatted !== '' && IC_FORMAT_REGEX.test(formatted)
}

/** Map API / validation errors to user-facing IC confirm messages. */
export function mapIcConfirmError(message) {
  const m = String(message || '').toLowerCase()
  if (m.includes('already')) {
    return { type: 'duplicate', message: 'This IC is already registered' }
  }
  if (m.includes('format') || m.includes('yyyymm')) {
    return { type: 'format', message: 'Invalid IC format. Please use YYYYMM-DD-####' }
  }
  if (m.includes('profile') || m.includes('match')) {
    return {
      type: 'profile',
      message: 'IC number does not match your registered profile. Use the IC from your account.',
    }
  }
  return { type: 'generic', message: message || 'Could not confirm IC.' }
}

export function normalizeName(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z\s@]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function namesMatch(registeredName, extractedName) {
  const registered = normalizeName(registeredName)
  const extracted = normalizeName(extractedName)
  if (!registered || !extracted) return false
  if (registered === extracted) return true
  if (extracted.includes(registered) || registered.includes(extracted)) return true

  const regWords = registered.split(' ').filter((w) => w.length > 1)
  if (!regWords.length) return false
  const matched = regWords.filter((w) => extracted.includes(w)).length
  return matched >= Math.max(1, Math.ceil(regWords.length * 0.6))
}

export function extractIcFromText(text) {
  const match = String(text || '').match(IC_EXTRACT_REGEX)
  if (!match) return ''
  return formatIcNumber(`${match[1]}${match[2]}${match[3]}`)
}

export function extractNameFromIcText(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const icLineIndex = lines.findIndex((line) => IC_EXTRACT_REGEX.test(line))
  const candidates = []

  for (const line of lines) {
    const upper = line.toUpperCase()
    if (IC_EXTRACT_REGEX.test(line)) continue
    if (NAME_NOISE.some((noise) => upper.includes(noise))) continue
    if (!/[A-Z]/.test(upper)) continue
    if (upper.replace(/[^A-Z]/g, '').length < 4) continue
    candidates.push(normalizeName(line))
  }

  if (icLineIndex > 0) {
    const before = normalizeName(lines[icLineIndex - 1])
    if (before && before.replace(/[^A-Z]/g, '').length >= 4) {
      candidates.unshift(before)
    }
  }

  const unique = [...new Set(candidates.filter(Boolean))]
  unique.sort((a, b) => b.length - a.length)
  return unique[0] || ''
}

export function extractIcDataFromText(text) {
  const icNumber = extractIcFromText(text)
  const name = extractNameFromIcText(text)
  return { icNumber, name, rawText: text }
}

export const MAX_VERIFICATION_FILE_BYTES = 5 * 1024 * 1024

export const VERIFICATION_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'

export function isAllowedVerificationFile(file) {
  if (!file) return false
  if (file.size > MAX_VERIFICATION_FILE_BYTES) return false
  const type = String(file.type || '').toLowerCase()
  const name = String(file.name || '').toLowerCase()
  if (type.startsWith('image/')) return true
  if (type === 'application/pdf' || name.endsWith('.pdf')) return true
  return /\.(jpe?g|png|webp|pdf)$/i.test(name)
}

export function isOcrCompatibleFile(file) {
  if (!file) return false
  const type = String(file.type || '').toLowerCase()
  const name = String(file.name || '').toLowerCase()
  if (type.startsWith('image/')) return true
  return /\.(jpe?g|png|webp)$/i.test(name)
}
