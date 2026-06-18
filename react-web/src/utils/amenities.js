/** Single source of truth for property amenities (form, cards, view). */

export const AMENITY_CATALOG = [
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'parking', label: 'Parking' },
  { id: 'aircond', label: 'Air conditioning' },
  { id: 'furnished', label: 'Furnished' },
  { id: 'washing', label: 'Washing machine' },
  { id: 'fridge', label: 'Refrigerator' },
  { id: 'water_heater', label: 'Water heater' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'desk', label: 'Study desk' },
  { id: 'wardrobe', label: 'Wardrobe' },
  { id: 'private_bathroom', label: 'Private bathroom' },
  { id: 'cctv', label: 'CCTV' },
  { id: 'security', label: 'Gated security' },
  { id: 'balcony', label: 'Balcony' },
  { id: 'utilities', label: 'Utilities included' },
]

export const AMENITY_ORDER = AMENITY_CATALOG.map((a) => a.id)

export const AMENITY_LABELS = Object.fromEntries(AMENITY_CATALOG.map((a) => [a.id, a.label]))

export function parseAmenitiesSet(amenitiesField) {
  if (!amenitiesField) return new Set()
  const raw = String(amenitiesField).trim()
  if (!raw) return new Set()
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return new Set(parsed.map((x) => String(x).toLowerCase()).filter(Boolean))
      }
    } catch {
      return new Set()
    }
  }
  if (raw.includes(',')) {
    return new Set(
      raw
        .split(',')
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean),
    )
  }
  return new Set([raw.toLowerCase()])
}

export function listAmenityIds(amenitiesField) {
  const ids = [...parseAmenitiesSet(amenitiesField)]
  const ordered = AMENITY_ORDER.filter((id) => ids.includes(id))
  const extra = ids.filter((id) => !AMENITY_ORDER.includes(id))
  return [...ordered, ...extra]
}

export function listAmenityLabels(amenitiesField) {
  return listAmenityIds(amenitiesField).map((id) => AMENITY_LABELS[id] || id)
}

export function isAmenityChecked(amenitiesField, amenityId) {
  return parseAmenitiesSet(amenitiesField).has(amenityId.toLowerCase())
}

export function toggleAmenityValue(current, amenityId) {
  const next = parseAmenitiesSet(current)
  const id = amenityId.toLowerCase()
  if (next.has(id)) next.delete(id)
  else next.add(id)
  const list = [...next]
  return list.length ? JSON.stringify(list) : ''
}
