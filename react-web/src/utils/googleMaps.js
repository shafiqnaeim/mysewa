const PLACEHOLDER_KEYS = new Set(['', 'your_api_key_here', 'your-google-maps-api-key'])

/** Terengganu (Kuala Terengganu area) — default map center for campus admin. */
export const TERENGGANU_CENTER = { lat: 5.3967, lng: 103.0829 }

export function resolveGoogleMapsApiKey() {
  const raw = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const key = typeof raw === 'string' ? raw.trim() : ''
  if (!key || PLACEHOLDER_KEYS.has(key)) return ''
  return key
}

export function parseMapCoordinates(latitude, longitude) {
  if (latitude === '' || latitude == null || longitude === '' || longitude == null) {
    return null
  }
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

export function formatMapCoord(value, digits = 5) {
  if (value === '' || value == null) return ''
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(digits) : ''
}
