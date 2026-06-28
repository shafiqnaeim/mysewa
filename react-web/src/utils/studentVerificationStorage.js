const LS_VERIFY_IC = (id) => `mysewa_student_verify_ic_${id}`
const LS_VERIFY_MATRIC = (id) => `mysewa_student_verify_matric_${id}`
const LS_VERIFY_SELFIE = (id) => `mysewa_student_verify_selfie_${id}`
const LS_VERIFY_SUBMITTED = (id) => `mysewa_student_verify_submitted_${id}`

export function readVerificationDocs(userId) {
  if (!userId) {
    return { icUrl: '', matricUrl: '', selfieUrl: '', submittedAt: null }
  }
  try {
    return {
      icUrl: localStorage.getItem(LS_VERIFY_IC(userId)) ?? '',
      matricUrl: localStorage.getItem(LS_VERIFY_MATRIC(userId)) ?? '',
      selfieUrl: localStorage.getItem(LS_VERIFY_SELFIE(userId)) ?? '',
      submittedAt: localStorage.getItem(LS_VERIFY_SUBMITTED(userId)) || null,
    }
  } catch {
    return { icUrl: '', matricUrl: '', selfieUrl: '', submittedAt: null }
  }
}

export function saveVerificationDoc(userId, slot, dataUrl) {
  if (!userId) return
  const key =
    slot === 'ic' ? LS_VERIFY_IC(userId) : slot === 'matric' ? LS_VERIFY_MATRIC(userId) : LS_VERIFY_SELFIE(userId)
  try {
    if (dataUrl) localStorage.setItem(key, dataUrl)
    else localStorage.removeItem(key)
  } catch {
    /* quota */
  }
}

export function clearVerificationDocs(userId) {
  if (!userId) return
  try {
    localStorage.removeItem(LS_VERIFY_IC(userId))
    localStorage.removeItem(LS_VERIFY_MATRIC(userId))
    localStorage.removeItem(LS_VERIFY_SELFIE(userId))
    localStorage.removeItem(LS_VERIFY_SUBMITTED(userId))
  } catch {
    /* ignore */
  }
}

export function markVerificationSubmitted(userId) {
  if (!userId) return
  try {
    localStorage.setItem(LS_VERIFY_SUBMITTED(userId), new Date().toISOString())
  } catch {
    /* ignore */
  }
}

export function computeUploadProgress({ icConfirmed, matricUrl, selfieUrl, submittedAt }) {
  let steps = 0
  if (icConfirmed) steps += 1
  if (matricUrl) steps += 1
  if (selfieUrl) steps += 1
  if (submittedAt) steps += 1
  return { steps, percent: Math.round((steps / 4) * 100) }
}
