const LS_KEY = 'mysewa_admin_notifications'

export const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'students', label: 'Students Only' },
  { value: 'landlords', label: 'Landlords Only' },
]

export function audienceLabel(value) {
  return AUDIENCE_OPTIONS.find((o) => o.value === value)?.label || value
}

function normalize(row) {
  return {
    id: row.id,
    title: row.title || '',
    message: row.message || '',
    audience: row.audience || 'all',
    status: row.status || 'sent',
    scheduledAt: row.scheduledAt || null,
    sentAt: row.sentAt || row.createdAt || null,
    readCount: Number(row.readCount) || 0,
    audienceTotal: Number(row.audienceTotal) || 0,
    createdAt: row.createdAt || new Date().toISOString(),
  }
}

export function readAdminNotifications() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalize).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  } catch {
    return []
  }
}

export function writeAdminNotifications(items) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mysewa-admin-notifications-updated'))
    }
  } catch {
    /* quota */
  }
}

export function promoteDueScheduled(items) {
  const now = Date.now()
  let changed = false
  const next = items.map((row) => {
    if (row.status !== 'scheduled' || !row.scheduledAt) return row
    const due = new Date(row.scheduledAt).getTime()
    if (!Number.isFinite(due) || due > now) return row
    changed = true
    return {
      ...row,
      status: 'sent',
      sentAt: row.scheduledAt,
    }
  })
  return { items: next, changed }
}

export function addAdminNotification(entry) {
  const items = readAdminNotifications()
  const row = normalize({
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    readCount: 0,
    ...entry,
  })
  items.unshift(row)
  writeAdminNotifications(items)
  return row
}

export function updateAdminNotification(id, patch) {
  const items = readAdminNotifications()
  const idx = items.findIndex((r) => r.id === id)
  if (idx < 0) return null
  items[idx] = normalize({ ...items[idx], ...patch })
  writeAdminNotifications(items)
  return items[idx]
}
