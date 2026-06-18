let cachedPublicUniversities = null

export function clearUniversitiesCache() {
  cachedPublicUniversities = null
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mysewa-universities-updated'))
  }
}

async function readApiError(res, fallback) {
  const raw = await res.text()
  let data = {}
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    data = {}
  }
  if (data.message) return data.message
  if (res.status === 404) {
    return `${fallback}: API not found (HTTP 404). Restart the Spring API on port 8090 with the latest code.`
  }
  if (res.status === 403) {
    return data.message || `${fallback}: administrator access required.`
  }
  if (res.status === 401) {
    return data.message || `${fallback}: sign in again as System Administrator.`
  }
  if (raw && raw.length < 240 && !raw.trimStart().startsWith('<')) return raw
  return `${fallback} (HTTP ${res.status})`
}

/** Public campuses with pinned coordinates (for maps & distance). */
export async function fetchPublicUniversities({ force = false } = {}) {
  if (!force && cachedPublicUniversities) return cachedPublicUniversities
  let res
  try {
    res = await fetch('/api/v1/universities')
  } catch {
    throw new Error('Cannot reach the API. Start Spring API on port 8090, then refresh.')
  }
  if (!res.ok) throw new Error(await readApiError(res, 'Failed to load universities'))
  const data = await res.json().catch(() => ({}))
  const items = Array.isArray(data.items) ? data.items : []
  cachedPublicUniversities = items
  return items
}

export async function fetchAdminUniversities(token) {
  if (!token) {
    throw new Error('Not signed in. Sign in as System Administrator.')
  }
  let res
  try {
    res = await fetch('/api/v1/universities/manage', {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new Error('Cannot reach the API. Start Spring API on port 8090, then refresh.')
  }
  if (!res.ok) throw new Error(await readApiError(res, 'Failed to load universities'))
  const data = await res.json().catch(() => ({}))
  return Array.isArray(data.items) ? data.items : []
}

export async function createUniversity(token, body) {
  const res = await fetch('/api/v1/universities', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiError(res, 'Failed to create university'))
  const data = await res.json().catch(() => ({}))
  clearUniversitiesCache()
  return data.item
}

export async function updateUniversity(token, id, body) {
  const res = await fetch(`/api/v1/universities/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiError(res, 'Failed to update university'))
  const data = await res.json().catch(() => ({}))
  clearUniversitiesCache()
  return data.item
}

export async function deleteUniversity(token, id) {
  const res = await fetch(`/api/v1/universities/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await readApiError(res, 'Failed to delete university'))
  clearUniversitiesCache()
  return res.json().catch(() => ({}))
}
