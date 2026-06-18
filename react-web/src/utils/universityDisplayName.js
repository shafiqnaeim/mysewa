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
