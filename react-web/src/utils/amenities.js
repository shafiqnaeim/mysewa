/** Single source of truth for property amenities (form, cards, view). */

export const AMENITY_CATALOG = [
  { id: 'furnished', label: 'Furnished' },
  { id: 'wifi', label: 'WiFi Available' },
  { id: 'aircond', label: 'Air Conditioning' },
  { id: 'pet_friendly', label: 'Pet Friendly' },
  { id: 'parking', label: 'Parking Available' },
  { id: 'utilities', label: 'Utilities Included' },
  { id: 'water_heater', label: 'Water Heater' },
  { id: 'pool', label: 'Pool Access' },
  { id: 'gym', label: 'Gym Access' },
  { id: 'security', label: 'Security Guard' },
  { id: 'tv', label: 'TV / Smart TV' },
  { id: 'power_backup', label: 'Power Backup' },
  { id: 'washing', label: 'Washing Machine' },
  { id: 'kitchen', label: 'Kitchen Equipped' },
  { id: 'private_bathroom', label: 'Private Bathroom' },
  { id: 'garden', label: 'Garden Access' },
  { id: 'fridge', label: 'Refrigerator' },
  { id: 'desk', label: 'Study desk' },
  { id: 'wardrobe', label: 'Wardrobe' },
  { id: 'cctv', label: 'CCTV' },
  { id: 'balcony', label: 'Balcony' },
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
