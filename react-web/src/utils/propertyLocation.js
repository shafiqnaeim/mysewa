import { fetchPublicUniversities } from './universitiesApi'

/** Fallback when API is unavailable (Terengganu defaults). */
export const CAMPUS_GEO_FALLBACK = {
  UMT: { code: 'UMT', name: 'Universiti Malaysia Terengganu (UMT)', lat: 5.4084, lng: 103.0821 },
  UniSZA: { code: 'UniSZA', name: 'Universiti Sultan Zainal Abidin (UniSZA)', lat: 5.3943, lng: 103.1028 },
  ILPKT: { code: 'ILPKT', name: 'Institut Latihan Perindustrian Kuala Terengganu (ILPKT)', lat: 5.3294, lng: 103.1406 },
  IPGM: { code: 'IPGM', name: 'Institut Pendidikan Guru Malaysia (IPGM)', lat: 5.4012, lng: 103.0889 },
}

const FALLBACK_LIST = Object.values(CAMPUS_GEO_FALLBACK)

const OSRM_TABLE = 'https://router.project-osrm.org/table/v1/driving'
const OSRM_ROUTE = 'https://router.project-osrm.org/route/v1/driving'
const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search'

function normalizeCampusRow(u) {
  return {
    id: u.id != null ? Number(u.id) : null,
    code: u.code,
    name: u.name,
    lat: Number(u.latitude ?? u.lat),
    lng: Number(u.longitude ?? u.lng),
  }
}

/** Load pinned universities from MySQL (via API). */
export async function getCampusList() {
  try {
    const items = await fetchPublicUniversities()
    const list = items
      .filter((u) => u.latitude != null && u.longitude != null)
      .map(normalizeCampusRow)
      .filter((u) => Number.isFinite(u.lat) && Number.isFinite(u.lng))
    if (list.length) return list
  } catch {
    /* use fallback */
  }
  return FALLBACK_LIST.map((c) => ({ id: null, code: c.code, name: c.name, lat: c.lat, lng: c.lng }))
}

export function getCampusDisplayName(code, campuses) {
  const list = campuses || FALLBACK_LIST
  const hit = list.find((c) => c.code === code)
  return hit?.name || code || ''
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const a1 = Number(lat1)
  const o1 = Number(lng1)
  const a2 = Number(lat2)
  const o2 = Number(lng2)
  if (![a1, o1, a2, o2].every((n) => Number.isFinite(n))) return null
  const R = 6371
  const dLat = ((a2 - a1) * Math.PI) / 180
  const dLng = ((o2 - o1) * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a1 * Math.PI) / 180) * Math.cos((a2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  return R * c
}

/**
 * Match a student's `university` string and/or `universityId` to a campus row with coordinates.
 */
export function resolveCampusCoordsForStudentUniversity(universityRaw, universityId, campusList) {
  if (!campusList?.length) return null
  const idNum = universityId != null ? Number(universityId) : null
  if (Number.isFinite(idNum)) {
    const byId = campusList.find((c) => c.id != null && Number(c.id) === idNum)
    if (byId && Number.isFinite(byId.lat) && Number.isFinite(byId.lng)) return byId
  }
  const raw = String(universityRaw || '').trim()
  if (!raw || /^none$/i.test(raw)) return null
  const compact = raw.replace(/\s+/g, '').toLowerCase()
  const byExactCode = campusList.find((c) => String(c.code || '').replace(/\s+/g, '').toLowerCase() === compact)
  if (byExactCode) return byExactCode
  const lower = raw.toLowerCase()
  return (
    campusList.find((c) => {
      const code = String(c.code || '').toLowerCase()
      const name = String(c.name || '').toLowerCase()
      return (
        (code && lower === code) ||
        (code && lower.includes(code)) ||
        (name && lower.length >= 3 && name.includes(lower)) ||
        (name && lower.length >= 3 && lower.includes(name.slice(0, 12)))
      )
    }) || null
  )
}

export function formatDistanceLabel(km) {
  if (km == null || !Number.isFinite(km)) return '—'
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

export function parseCampusDistancesField(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  const text = String(raw).trim()
  if (!text) return []
  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function geocodeMailingAddress(address) {
  const query = String(address || '').trim()
  if (!query) {
    return { city: '', state: '', postcode: '' }
  }

  const searchQ = /malaysia/i.test(query) ? query : `${query}, Malaysia`
  const params = new URLSearchParams({
    q: searchQ,
    format: 'json',
    addressdetails: '1',
    limit: '1',
    countrycodes: 'my',
  })

  const res = await fetch(`${NOMINATIM_SEARCH}?${params}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('Address lookup failed')

  const rows = await res.json()
  const hit = rows?.[0]
  if (!hit?.address) {
    return { city: '', state: '', postcode: '' }
  }

  const a = hit.address
  const city = a.city || a.town || a.village || a.suburb || a.municipality || a.county || ''
  const state = a.state || a.region || ''
  const postcode = a.postcode || ''

  return { city, state, postcode }
}

/** Geocode a Malaysian address to coordinates (Nominatim). */
export async function geocodeAddressToCoordinates(address) {
  const query = String(address || '').trim()
  if (!query) return null

  const searchQ = /malaysia/i.test(query) ? query : `${query}, Malaysia`
  const params = new URLSearchParams({
    q: searchQ,
    format: 'json',
    limit: '1',
    countrycodes: 'my',
  })

  const res = await fetch(`${NOMINATIM_SEARCH}?${params}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('Address lookup failed')

  const rows = await res.json()
  const hit = rows?.[0]
  if (!hit?.lat || !hit?.lon) return null

  const lat = Number(hit.lat)
  const lng = Number(hit.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

/**
 * Driving route between two points via OSRM (public demo server — for planning only).
 * Returns distance, duration, and GeoJSON LineString geometry (coordinates are [lng, lat]).
 */
export async function fetchRoadRouteDriving(lng1, lat1, lng2, lat2) {
  const a = Number(lng1)
  const b = Number(lat1)
  const c = Number(lng2)
  const d = Number(lat2)
  if (![a, b, c, d].every((n) => Number.isFinite(n))) {
    throw new Error('Invalid coordinates for routing')
  }
  const url = `${OSRM_ROUTE}/${a},${b};${c},${d}?overview=full&geometries=geojson`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Route lookup failed')
  const data = await res.json()
  if (data.code !== 'Ok' || !data.routes?.[0]) {
    throw new Error('No driving route found')
  }
  const r = data.routes[0]
  const km = r.distance != null ? r.distance / 1000 : null
  return {
    distanceKm: km,
    distanceLabel: formatDistanceLabel(km),
    durationSeconds: r.duration,
    geometry: r.geometry,
  }
}

export async function fetchRoadDistancesToAllCampuses(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return []

  const campusList = await getCampusList()
  if (!campusList.length) return []

  const coords = [[lng, lat], ...campusList.map((c) => [c.lng, c.lat])]
  const coordStr = coords.map(([ln, la]) => `${ln},${la}`).join(';')
  const destinations = campusList.map((_, i) => i + 1).join(';')
  const url = `${OSRM_TABLE}/${coordStr}?sources=0&destinations=${destinations}&annotations=distance`

  const res = await fetch(url)
  if (!res.ok) throw new Error('Road distance lookup failed')

  const data = await res.json()
  if (data.code !== 'Ok' || !data.distances?.[0]) {
    throw new Error('Could not calculate road distances')
  }

  const meters = data.distances[0]

  return campusList.map((campus, i) => {
    const roadKm = meters[i] != null ? meters[i] / 1000 : null
    return {
      code: campus.code,
      name: campus.name,
      roadKm,
      distanceLabel: formatDistanceLabel(roadKm),
    }
  })
}

export async function resolvePropertyLocationByRoad(latitude, longitude) {
  const campusDistances = await fetchRoadDistancesToAllCampuses(latitude, longitude)
  const valid = campusDistances.filter((c) => c.roadKm != null)
  if (!valid.length) {
    return { campus: '', distance: '', campusName: '', campusDistances }
  }

  const nearest = valid.reduce((a, b) => (a.roadKm <= b.roadKm ? a : b))
  return {
    campus: nearest.code,
    campusName: nearest.name,
    distance: `${nearest.distanceLabel} by road from ${nearest.code}`,
    campusDistances,
  }
}
