export const MAINTENANCE_CATEGORIES = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'air_conditioning', label: 'Air Conditioning' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'internet_wifi', label: 'Internet/WiFi' },
  { value: 'other', label: 'Other' },
]

export const REPORT_STATUSES = {
  PENDING: 'PENDING',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
}

export function categoryLabel(value) {
  const found = MAINTENANCE_CATEGORIES.find((c) => c.value === value)
  return found?.label || value || 'Other'
}

export function statusLabel(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'ACKNOWLEDGED' || s === 'RECEIVED') return 'Acknowledged'
  if (s === 'IN_PROGRESS') return 'In Progress'
  if (s === 'RESOLVED') return 'Resolved'
  return 'Pending'
}

export function statusBadgeClass(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'RESOLVED') return 'bg-[#D1FAE5] text-[#065F46]'
  if (s === 'IN_PROGRESS') return 'bg-[#DBEAFE] text-[#1E40AF]'
  if (s === 'ACKNOWLEDGED' || s === 'RECEIVED') return 'bg-[#EDE9FE] text-[#5B21B6]'
  return 'bg-[#FEF3C7] text-[#92400E]'
}

export function formatTimestamp(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function photoPublicUrl(url) {
  if (!url) return ''
  const s = String(url).trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  return s.startsWith('/') ? s : `/${s}`
}

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
    throw err
  }
  return data
}

export async function fetchStudentMaintenanceReports(token) {
  const auth = token || localStorage.getItem('mysewa_token')
  const res = await fetch('/api/v1/maintenance-reports/student', {
    headers: authHeaders(auth),
  })
  return parseJson(res)
}

export async function fetchLandlordMaintenanceReports(token, status = 'all') {
  const auth = token || localStorage.getItem('mysewa_token')
  const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : ''
  const res = await fetch(`/api/v1/maintenance-reports/landlord${qs}`, {
    headers: authHeaders(auth),
  })
  return parseJson(res)
}

export async function submitMaintenanceReport({ propertyId, category, description, photo }, token) {
  const auth = token || localStorage.getItem('mysewa_token')
  const fd = new FormData()
  fd.append('propertyId', String(propertyId))
  fd.append('category', category)
  fd.append('description', description)
  if (photo) fd.append('photo', photo)
  const res = await fetch('/api/v1/maintenance-reports', {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth}` },
    body: fd,
  })
  return parseJson(res)
}

export async function acknowledgeMaintenanceReport(reportId, landlordNotes, token) {
  const auth = token || localStorage.getItem('mysewa_token')
  const res = await fetch(`/api/v1/maintenance-reports/${encodeURIComponent(reportId)}/acknowledge`, {
    method: 'POST',
    headers: { ...authHeaders(auth), 'Content-Type': 'application/json' },
    body: JSON.stringify({ landlordNotes: landlordNotes || '' }),
  })
  return parseJson(res)
}

export async function updateMaintenanceReportStatus(reportId, status, landlordNotes, token) {
  const auth = token || localStorage.getItem('mysewa_token')
  const res = await fetch(`/api/v1/maintenance-reports/${encodeURIComponent(reportId)}/status`, {
    method: 'PUT',
    headers: { ...authHeaders(auth), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, landlordNotes: landlordNotes || '' }),
  })
  return parseJson(res)
}

export async function resolveMaintenanceReport(reportId, token) {
  const auth = token || localStorage.getItem('mysewa_token')
  const res = await fetch(`/api/v1/maintenance-reports/${encodeURIComponent(reportId)}/resolve`, {
    method: 'POST',
    headers: authHeaders(auth),
  })
  return parseJson(res)
}
