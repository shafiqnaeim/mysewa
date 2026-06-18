import { AMENITY_LABELS, listAmenityIds, listAmenityLabels } from './amenities'
import { getCampusDisplayName, parseCampusDistancesField } from './propertyLocation'
import { resolveMediaUrl } from './mediaUrl'

export { AMENITY_LABELS, listAmenityIds, listAmenityLabels }

const ADDRESS_SKIP_PATTERN =
  /malaysia|terengganu|selangor|johor|kedah|kelantan|pahang|perlis|penang|pulau pinang|sabah|sarawak|melaka|negeri sembilan|wilayah|darul iman|darul|jalan|lorong|persiaran|lot\s|pt\s|no\.|hadapan|masjid|universiti/i

export function parsePropertyImages(imagesField) {
  if (!imagesField) return []
  if (Array.isArray(imagesField)) {
    return imagesField.filter((entry) => typeof entry === 'string' && entry.trim())
  }
  const raw = String(imagesField).trim()
  if (!raw) return []
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.filter((entry) => typeof entry === 'string' && entry.trim())
    } catch {
      return []
    }
  }
  return [raw]
}

/** Resolved image URLs for cards and view (falls back to API thumbnailPath). */
export function listPropertyImageUrls(item) {
  const paths = parsePropertyImages(item?.images)
  const urls = paths.map((path) => resolveMediaUrl(path)).filter(Boolean)
  if (urls.length) return urls
  const thumb = item?.thumbnailPath
  if (thumb) {
    const url = resolveMediaUrl(thumb)
    return url ? [url] : []
  }
  return []
}

function extractAreaFromAddress(location, city) {
  const cityClean = String(city || '').trim()
  const parts = String(location || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !ADDRESS_SKIP_PATTERN.test(p))

  for (const part of parts) {
    const withPostcode = part.match(/^(.+?)\s+(\d{5})$/)
    if (withPostcode) {
      const area = withPostcode[1].trim()
      if (area.length <= 40) {
        return cityClean ? `${area}, ${cityClean}` : area
      }
    }
  }

  if (cityClean) {
    const cityIdx = parts.findIndex(
      (p) =>
        p.replace(/\s+\d{5}$/, '').toLowerCase() === cityClean.toLowerCase() ||
        p.toLowerCase() === cityClean.toLowerCase(),
    )
    if (cityIdx > 0) {
      const area = parts[cityIdx - 1].replace(/\s+\d{5}$/, '').trim()
      if (area.length <= 40) return `${area}, ${cityClean}`
    }
    return cityClean
  }

  const fallback = parts.find((p) => p.length <= 40 && !/^\d{5}$/.test(p))
  return fallback || 'Location not set'
}

export function formatPropertyLocationLine(item) {
  return extractAreaFromAddress(item.location, item.city)
}

function parseKmFromDistanceText(text) {
  const match = String(text || '').match(/(\d+(?:\.\d+)?)\s*km/i)
  return match ? Number(match[1]) : null
}

function formatKmDistance(km) {
  if (!Number.isFinite(km) || km < 0) return null
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

function normalizeDistanceToCampus(km, campusLabel, { road = false } = {}) {
  const label = formatKmDistance(km)
  if (!label || !campusLabel) return null
  const prefix = road ? '' : '~'
  return `${prefix}${label} to ${campusLabel}`
}

export function formatCampusDistanceLine(item) {
  const campusCode = String(item.campus || '').trim()
  const campusLabel = campusCode || getCampusDisplayName(item.campus) || ''
  const dist = String(item.distance || '').trim()

  if (/minute/i.test(dist)) {
    let km = parseKmFromDistanceText(dist)
    if (km == null && item.campusDistances) {
      const rows = parseCampusDistancesField(item.campusDistances)
      const match = rows.find((r) => r.code === campusCode)
      if (match?.roadKm != null) km = match.roadKm
    }
    if (km != null && campusLabel) {
      const rewritten = normalizeDistanceToCampus(km, campusLabel)
      if (rewritten) return rewritten
    }
  }

  const fromMatch = dist.match(/^([\d.]+\s*(?:km|m))\s+from\s+(.+)$/i)
  if (fromMatch && campusLabel) {
    return `${fromMatch[1]} to ${fromMatch[2].trim()}`
  }

  let km = parseKmFromDistanceText(dist)
  let useRoad = false
  if (item.campusDistances) {
    const rows = parseCampusDistancesField(item.campusDistances)
    const match = rows.find((r) => r.code === campusCode)
    const nearest =
      match ||
      rows.reduce((best, row) => {
        if (row.roadKm == null) return best
        if (!best || row.roadKm < best.roadKm) return row
        return best
      }, null)
    if (nearest?.roadKm != null) {
      km = nearest.roadKm
      useRoad = true
    }
  }

  if (km != null && campusLabel) {
    const line = normalizeDistanceToCampus(km, campusLabel, { road: useRoad })
    if (line) return line
  }

  if (dist && /to\s/i.test(dist)) return dist.replace(/\s+/g, ' ').trim()
  if (dist) return dist.replace(/\s+from\s+/i, ' to ').trim()
  if (campusLabel) return `Near ${campusLabel}`
  return 'Distance to campus not set'
}

export function formatCapacityLine(item) {
  const cap = Number(item.capacity) > 0 ? Number(item.capacity) : 1
  return `${cap} ${cap === 1 ? 'person' : 'persons'}`
}

export function propertyRatingScore(item) {
  const raw = item.averageRating ?? item.rating
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n.toFixed(1) : null
}

/** Always one decimal for display boxes (e.g. 0.0). */
export function formatRatingScore(item) {
  const raw = item?.averageRating ?? item?.rating
  if (raw != null && raw !== '') {
    const n = Number(raw)
    if (Number.isFinite(n)) return n.toFixed(1)
  }
  return '0.0'
}

export function propertyReviewCount(item) {
  const n = Number(item.reviewCount ?? item.reviewsCount ?? 0)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/** True when the API sent a rating or review count (review module not wired yet). */
export function propertyHasRatingData(item) {
  const rawRating = item?.averageRating ?? item?.rating
  if (rawRating != null && rawRating !== '') return true
  if (item?.reviewCount != null || item?.reviewsCount != null) return true
  return false
}

export function propertyStatusLabel(status) {
  const s = String(status || 'available').toLowerCase()
  if (s === 'rented' || s === 'booked') return 'Rented'
  if (s === 'maintenance') return 'Maintenance'
  return 'Available'
}

export function formatPreferenceLabel(value) {
  const v = String(value || '').trim()
  if (!v) return null
  return v.charAt(0).toUpperCase() + v.slice(1)
}

export function buildPropertyHighlights(item) {
  const items = []
  if (item.type) items.push({ label: item.type })
  const dist = formatCampusDistanceLine(item)
  if (dist && dist !== 'Distance to campus not set') items.push({ label: dist })
  items.push({ label: formatCapacityLine(item) })
  const status = propertyStatusLabel(item.status)
  if (status === 'Available') items.push({ label: 'Available now' })
  listAmenityLabels(item.amenities)
    .slice(0, 2)
    .forEach((label) => items.push({ label }))
  return items.slice(0, 6)
}

export function staticMapUrl(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=520x280&markers=${lat},${lng},red-pushpin`
}

export function openStreetMapLink(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
}
