const LS_VERIFY_IC = (id) => `mysewa_landlord_verify_ic_${id}`
const LS_VERIFY_GRANT = (id) => `mysewa_landlord_verify_matric_${id}`
const LS_VERIFY_SELFIE = (id) => `mysewa_landlord_verify_selfie_${id}`
const LS_VERIFY_SUBMITTED = (id) => `mysewa_landlord_verify_submitted_${id}`
const LS_VERIFY_META = (id) => `mysewa_landlord_verify_meta_${id}`

const DEFAULT_FILE_NAMES = {
  ic: 'identity_card.jpg',
  matric: 'property_grant.jpg',
  selfie: 'selfie.jpg',
}

function readMeta(userId) {
  if (!userId) return {}
  try {
    const raw = localStorage.getItem(LS_VERIFY_META(userId))
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeMeta(userId, meta) {
  if (!userId) return
  try {
    localStorage.setItem(LS_VERIFY_META(userId), JSON.stringify(meta))
  } catch {
    /* quota */
  }
}

export function getDefaultFileName(slot) {
  return DEFAULT_FILE_NAMES[slot] || 'document.jpg'
}

export function readVerificationDocs(userId) {
  if (!userId) {
    return { icUrl: '', grantUrl: '', selfieUrl: '', submittedAt: null, meta: {} }
  }
  try {
    return {
      icUrl: localStorage.getItem(LS_VERIFY_IC(userId)) ?? '',
      grantUrl: localStorage.getItem(LS_VERIFY_GRANT(userId)) ?? '',
      selfieUrl: localStorage.getItem(LS_VERIFY_SELFIE(userId)) ?? '',
      submittedAt: localStorage.getItem(LS_VERIFY_SUBMITTED(userId)) || null,
      meta: readMeta(userId),
    }
  } catch {
    return { icUrl: '', grantUrl: '', selfieUrl: '', submittedAt: null, meta: {} }
  }
}

export function saveVerificationDoc(userId, slot, dataUrl, fileMeta = {}) {
  if (!userId) return
  const key =
    slot === 'ic' ? LS_VERIFY_IC(userId) : slot === 'matric' ? LS_VERIFY_GRANT(userId) : LS_VERIFY_SELFIE(userId)
  try {
    if (dataUrl) {
      localStorage.setItem(key, dataUrl)
      const meta = readMeta(userId)
      meta[slot] = {
        fileName: fileMeta.fileName || getDefaultFileName(slot),
        size: fileMeta.size ?? 0,
        uploadedAt: fileMeta.uploadedAt || new Date().toISOString(),
      }
      writeMeta(userId, meta)
      localStorage.removeItem(LS_VERIFY_SUBMITTED(userId))
    } else {
      localStorage.removeItem(key)
      const meta = readMeta(userId)
      delete meta[slot]
      writeMeta(userId, meta)
    }
  } catch {
    /* quota */
  }
}

export function removeVerificationDoc(userId, slot) {
  saveVerificationDoc(userId, slot, '')
}

export function clearVerificationDocs(userId) {
  if (!userId) return
  try {
    localStorage.removeItem(LS_VERIFY_IC(userId))
    localStorage.removeItem(LS_VERIFY_GRANT(userId))
    localStorage.removeItem(LS_VERIFY_SELFIE(userId))
    localStorage.removeItem(LS_VERIFY_SUBMITTED(userId))
    localStorage.removeItem(LS_VERIFY_META(userId))
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

export function computeUploadProgress({ icConfirmed, grantUrl, selfieUrl, submittedAt }) {
  let steps = 0
  if (icConfirmed) steps += 1
  if (grantUrl) steps += 1
  if (selfieUrl) steps += 1
  if (submittedAt) steps += 1
  return { steps, percent: Math.round((steps / 4) * 100) }
}
