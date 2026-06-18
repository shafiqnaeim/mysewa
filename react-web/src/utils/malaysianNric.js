/**
 * Malaysian NRIC (MyKad) — first 6 digits encode birth date as YYMMDD.
 * Century rule (common heuristic): compare YY with current year's last two digits.
 * Gender: last digit odd = male, even = female.
 * Place of birth: digits 7–8 (after YYMMDD) map to state (JPN codes).
 */

function onlyDigits(s) {
  return String(s || '').replace(/\D/g, '')
}

function daysInMonth(year, monthIndex0) {
  return new Date(year, monthIndex0 + 1, 0).getDate()
}

/** PB / birthplace codes (positions 7–8 of 12-digit NRIC). */
const PB_CODE_TO_STATE = {
  '01': 'Johor',
  '21': 'Johor',
  '22': 'Johor',
  '23': 'Johor',
  '24': 'Johor',
  '02': 'Kedah',
  '25': 'Kedah',
  '26': 'Kedah',
  '03': 'Kelantan',
  '04': 'Melaka',
  '05': 'Negeri Sembilan',
  '06': 'Pahang',
  '07': 'Penang',
  '08': 'Perak',
  '09': 'Perlis',
  '10': 'Selangor',
  '11': 'Terengganu',
  '12': 'Sabah',
  '13': 'Sarawak',
  '14': 'WP Kuala Lumpur',
  '15': 'WP Labuan',
  '16': 'WP Putrajaya',
  '82': 'Foreign born',
}

/**
 * @param {string} icRaw - NRIC with or without dashes
 * @returns {string|null} ISO date `YYYY-MM-DD` or null if invalid
 */
export function deriveBirthDateIsoFromNric(icRaw) {
  const d = onlyDigits(icRaw)
  if (d.length !== 12) return null

  const yy = Number(d.slice(0, 2))
  const mm = Number(d.slice(2, 4))
  const dd = Number(d.slice(4, 6))

  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null
  if (mm < 1 || mm > 12) return null
  if (dd < 1 || dd > 31) return null

  const now = new Date()
  const curYy = now.getFullYear() % 100
  const fullYear = yy <= curYy ? 2000 + yy : 1900 + yy

  const dim = daysInMonth(fullYear, mm - 1)
  if (dd > dim) return null

  const isoMonth = String(mm).padStart(2, '0')
  const isoDay = String(dd).padStart(2, '0')
  return `${fullYear}-${isoMonth}-${isoDay}`
}

/**
 * @param {string} icRaw
 * @returns {'Male'|'Female'|null}
 */
export function deriveGenderFromNric(icRaw) {
  const d = onlyDigits(icRaw)
  if (d.length !== 12) return null
  const last = Number(d[11])
  if (!Number.isFinite(last)) return null
  return last % 2 === 1 ? 'Male' : 'Female'
}

/**
 * @param {string} icRaw
 * @returns {string|null} State name or null if unknown / invalid
 */
export function deriveBirthStateFromNric(icRaw) {
  const d = onlyDigits(icRaw)
  if (d.length !== 12) return null
  const pb = d.slice(6, 8)
  return PB_CODE_TO_STATE[pb] ?? null
}
