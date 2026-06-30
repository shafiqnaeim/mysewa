function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchPropertyCountByType(token) {
  const res = await fetch('/api/v1/admin/properties/count-by-type', {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || `Could not load property counts (${res.status})`)
  }
  return data
}
