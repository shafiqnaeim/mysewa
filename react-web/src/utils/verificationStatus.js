/** Map users.document_verification_status → UI state key */
export function getDocumentVerificationState(raw) {
  const s = String(raw || '').trim().toLowerCase()
  if (!s || s === 'not_submitted') return 'not_submitted'
  if (s === 'verified' || (s.includes('verif') && !s.includes('unver'))) return 'verified'
  if (s === 'rejected' || s.includes('reject') || s.includes('fail') || s.includes('invalid')) return 'rejected'
  if (
    s === 'pending_review' ||
    s.includes('pending_review') ||
    (s.includes('pending') && s.includes('review')) ||
    s.includes('await')
  ) {
    return 'under_review'
  }
  if (s === 'pending' || s.includes('submitted') || s.includes('review')) return 'under_review'
  return 'not_submitted'
}

export const VERIFICATION_STATUS_LABELS = {
  not_submitted: '⚪ Not Submitted',
  under_review: '⏳ Under Review',
  verified: '✅ Verified',
  rejected: '❌ Rejected',
}

export function verificationStatusClass(state) {
  switch (state) {
    case 'verified':
      return 'text-[#10B981]'
    case 'rejected':
      return 'text-[#EF4444]'
    case 'under_review':
      return 'text-[#F59E0B]'
    default:
      return 'text-[#6B7280]'
  }
}

export function formatVerificationFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Admin users table: verified | pending | rejected */
export function getIdentityAdminState(raw) {
  const s = String(raw || '').trim().toLowerCase()
  if (s === 'verified') return 'verified'
  if (s === 'rejected') return 'rejected'
  return 'pending'
}
