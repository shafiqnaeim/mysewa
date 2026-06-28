/** Maps signup short codes to official names; unknown values pass through trimmed. */
const CODE_TO_NAME = {
  umt: 'Universiti Malaysia Terengganu',
  unisza: 'Universiti Sultan Zainal Abidin',
  ilpkt: 'Institut Latihan Perindustrian Kuala Terengganu',
}

export function getUniversityDisplayName(stored) {
  const s = String(stored || '').trim()
  if (!s) return ''
  const key = s.replace(/\s+/g, '').toLowerCase()
  return CODE_TO_NAME[key] ?? s
}

/** Short label for headers (e.g. umt → UMT). Unknown values pass through uppercased when short. */
export function getUniversityShortLabel(stored) {
  const s = String(stored || '').trim()
  if (!s) return ''
  const key = s.replace(/\s+/g, '').toLowerCase()
  if (CODE_TO_NAME[key]) return key.toUpperCase()
  const match = Object.entries(CODE_TO_NAME).find(([, name]) => name.toLowerCase() === s.toLowerCase())
  if (match) return match[0].toUpperCase()
  return s.length <= 16 ? s : `${s.slice(0, 16)}…`
}
