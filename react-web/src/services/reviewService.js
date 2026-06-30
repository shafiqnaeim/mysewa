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
    err.data = data
    throw err
  }
  return data
}

/** GET /api/v1/reviews/for-property/{propertyId} */
export async function fetchPropertyReviews(propertyId, token) {
  const auth = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('mysewa_token') : '')
  const res = await fetch(`/api/v1/reviews/for-property/${encodeURIComponent(propertyId)}`, {
    headers: auth ? authHeaders(auth) : { Accept: 'application/json' },
  })
  return parseJson(res)
}

/** GET /api/v1/reviews/for-student */
export async function fetchStudentReviews(token) {
  const auth = token || localStorage.getItem('mysewa_token')
  const res = await fetch('/api/v1/reviews/for-student', {
    headers: authHeaders(auth),
  })
  return parseJson(res)
}

/** POST /api/v1/reviews */
export async function submitReview(payload, token) {
  const auth = token || localStorage.getItem('mysewa_token')
  const res = await fetch('/api/v1/reviews', {
    method: 'POST',
    headers: {
      ...authHeaders(auth),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  return parseJson(res)
}

/** POST /api/v1/reviews/photos */
export async function uploadReviewPhotos(files, token) {
  const auth = token || localStorage.getItem('mysewa_token')
  const form = new FormData()
  for (const file of files) {
    form.append('images', file)
  }
  const res = await fetch('/api/v1/reviews/photos', {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth}` },
    body: form,
  })
  return parseJson(res)
}
