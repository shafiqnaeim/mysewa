function authHeaders() {
  const token = localStorage.getItem('mysewa_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchMyVerificationStatus() {
  const res = await fetch('/api/v1/users/me/verification', { headers: authHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Could not load verification (${res.status})`)
  return data
}

export async function uploadVerificationDocument(slot, file) {
  const form = new FormData()
  form.append('slot', slot)
  form.append('file', file)
  const res = await fetch('/api/v1/users/me/verification/documents', {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Upload failed (${res.status})`)
  return data
}

export async function confirmIcVerification(icNumber, extractedName = '') {
  const res = await fetch('/api/v1/users/me/verification/ic-confirm', {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ icNumber, extractedName }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `IC confirmation failed (${res.status})`)
  return data
}

export async function clearIcVerification() {
  const res = await fetch('/api/v1/users/me/verification/ic-confirm', {
    method: 'DELETE',
    headers: authHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Could not clear IC (${res.status})`)
  return data
}

export async function submitVerificationForReview() {
  const res = await fetch('/api/v1/users/me/verification/submit', {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Submit failed (${res.status})`)
  return data
}

export async function fetchPendingVerifications(token) {
  const res = await fetch('/api/v1/admin/verifications/pending', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Could not load verifications (${res.status})`)
  return data
}

export async function fetchVerificationDetail(token, userId) {
  const res = await fetch(`/api/v1/admin/verifications/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Could not load user (${res.status})`)
  return data.item
}

export async function approveVerification(token, userId) {
  const res = await fetch(`/api/v1/admin/users/${encodeURIComponent(userId)}/verify`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Approve failed (${res.status})`)
  return data.item
}

export async function rejectVerification(token, userId, reason) {
  const res = await fetch(`/api/v1/admin/users/${encodeURIComponent(userId)}/reject`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason: reason || '' }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Reject failed (${res.status})`)
  return data.item
}

/** Map UI slot names to API slot names. */
export function apiSlotForUi(slot) {
  if (slot === 'matric') return 'grant'
  return slot
}

export function resolveUploadUrl(url) {
  if (!url) return ''
  const s = String(url).trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s) || s.startsWith('data:')) return s
  return s.startsWith('/') ? s : `/${s}`
}
