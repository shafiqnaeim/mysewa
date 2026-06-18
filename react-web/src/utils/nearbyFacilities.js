/** Nearby POIs via OpenStreetMap Overpass (no API key). */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const DEFAULT_RADIUS_M = 2500
const MAX_PER_CATEGORY = 3
const MAX_TOTAL = 18

export const NEARBY_FACILITY_TYPES = [
  { id: 'fuel', label: 'Petrol station', color: '#f59e0b', symbol: '⛽' },
  { id: 'hospital', label: 'Hospital / clinic', color: '#ef4444', symbol: '🏥' },
  { id: 'pharmacy', label: 'Pharmacy', color: '#ec4899', symbol: '💊' },
  { id: 'supermarket', label: 'Supermarket', color: '#22c55e', symbol: '🛒' },
  { id: 'bank', label: 'Bank / ATM', color: '#3b82f6', symbol: '🏧' },
  { id: 'food', label: 'Food & drinks', color: '#f97316', symbol: '🍽️' },
  { id: 'worship', label: 'Place of worship', color: '#8b5cf6', symbol: '⛪' },
  { id: 'transport', label: 'Bus stop', color: '#64748b', symbol: '🚌' },
]

const TYPE_BY_ID = Object.fromEntries(NEARBY_FACILITY_TYPES.map((t) => [t.id, t]))

const fetchCache = new Map()

function distanceMeters(lat1, lng1, lat2, lng2) {
  const r = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistanceMeters(m) {
  if (!Number.isFinite(m) || m < 0) return ''
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(1)} km`
}

function classifyTags(tags = {}) {
  const amenity = tags.amenity || ''
  const shop = tags.shop || ''
  const highway = tags.highway || ''

  if (amenity === 'fuel') return 'fuel'
  if (amenity === 'hospital' || amenity === 'clinic' || amenity === 'doctors') return 'hospital'
  if (amenity === 'pharmacy') return 'pharmacy'
  if (shop === 'supermarket' || shop === 'convenience' || shop === 'mall' || shop === 'department_store') {
    return 'supermarket'
  }
  if (amenity === 'bank' || amenity === 'atm') return 'bank'
  if (
    amenity === 'restaurant' ||
    amenity === 'fast_food' ||
    amenity === 'cafe' ||
    amenity === 'food_court' ||
    amenity === 'biergarten'
  ) {
    return 'food'
  }
  if (amenity === 'place_of_worship') return 'worship'
  if (highway === 'bus_stop' || tags.public_transport === 'platform') return 'transport'
  return null
}

function elementCoords(el) {
  if (el.lat != null && el.lon != null) {
    return { lat: Number(el.lat), lng: Number(el.lon) }
  }
  if (el.center) {
    return { lat: Number(el.center.lat), lng: Number(el.center.lon) }
  }
  return null
}

function buildOverpassQuery(lat, lng, radiusM) {
  const r = Math.round(radiusM)
  const around = `(around:${r},${lat},${lng})`
  return `[out:json][timeout:25];
(
  node${around}["amenity"~"hospital|clinic|doctors|pharmacy|fuel|bank|atm|restaurant|fast_food|cafe|food_court|place_of_worship"];
  way${around}["amenity"~"hospital|clinic|doctors|pharmacy|fuel|bank|atm|restaurant|fast_food|cafe|food_court|place_of_worship"];
  node${around}["shop"~"supermarket|convenience|mall|department_store"];
  way${around}["shop"~"supermarket|convenience|mall|department_store"];
  node${around}["highway"="bus_stop"];
);
out center 40;`
}

function parseOverpassElements(elements, originLat, originLng) {
  const rows = []
  const seen = new Set()

  for (const el of elements) {
    if (!el.tags) continue
    const category = classifyTags(el.tags)
    if (!category) continue

    const coords = elementCoords(el)
    if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) continue

    const name =
      el.tags.name ||
      el.tags.brand ||
      el.tags.operator ||
      TYPE_BY_ID[category]?.label ||
      'Unnamed place'

    const key = `${category}:${name.toLowerCase()}:${coords.lat.toFixed(5)}:${coords.lng.toFixed(5)}`
    if (seen.has(key)) continue
    seen.add(key)

    const distanceM = distanceMeters(originLat, originLng, coords.lat, coords.lng)
    rows.push({
      id: `${el.type}-${el.id}`,
      category,
      categoryLabel: TYPE_BY_ID[category]?.label || category,
      color: TYPE_BY_ID[category]?.color || '#64748b',
      name,
      lat: coords.lat,
      lng: coords.lng,
      distanceM,
      distanceLabel: formatDistanceMeters(distanceM),
    })
  }

  rows.sort((a, b) => a.distanceM - b.distanceM)

  const byCategory = new Map()
  const picked = []

  for (const row of rows) {
    const count = byCategory.get(row.category) || 0
    if (count >= MAX_PER_CATEGORY) continue
    byCategory.set(row.category, count + 1)
    picked.push(row)
    if (picked.length >= MAX_TOTAL) break
  }

  return picked
}

export async function fetchNearbyFacilities(latitude, longitude, radiusM = DEFAULT_RADIUS_M) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return []

  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)},${radiusM}`
  if (fetchCache.has(cacheKey)) return fetchCache.get(cacheKey)

  const query = buildOverpassQuery(lat, lng, radiusM)
  const promise = fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error('Could not load nearby places')
      const data = await res.json()
      return parseOverpassElements(data.elements || [], lat, lng)
    })
    .catch(() => [])

  fetchCache.set(cacheKey, promise)
  return promise
}
