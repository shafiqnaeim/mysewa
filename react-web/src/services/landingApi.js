async function parseJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = data?.message || `Request failed (HTTP ${res.status})`
    throw new Error(message)
  }
  return data
}

export async function fetchPropertyCount() {
  const res = await fetch('/api/properties/count')
  const data = await parseJson(res)
  return Number(data.count) || 0
}

export async function fetchStudentCount() {
  const res = await fetch('/api/users/count?role=student')
  const data = await parseJson(res)
  return Number(data.count) || 0
}

export async function fetchAverageRating() {
  const res = await fetch('/api/reviews/average')
  const data = await parseJson(res)
  const average = data.average
  return average == null ? null : Number(average)
}

export async function fetchPopularProperties(limit = 6) {
  const res = await fetch(`/api/properties?limit=${limit}&sort=popular`)
  const data = await parseJson(res)
  return Array.isArray(data.items) ? data.items : []
}

export async function fetchRecentReviews(limit = 3) {
  const res = await fetch(`/api/reviews?limit=${limit}`)
  const data = await parseJson(res)
  return Array.isArray(data.items) ? data.items : []
}

export async function searchProperties(criteria = {}) {
  const res = await fetch('/api/properties/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(criteria),
  })
  const data = await parseJson(res)
  return Array.isArray(data.items) ? data.items : []
}
