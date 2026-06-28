const KEY_PREFIX = 'mysewa_saved_properties'

function storageKey(userId) {
  return userId ? `${KEY_PREFIX}_${userId}` : KEY_PREFIX
}

export function readSavedProperties(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((e) => e && e.propertyId != null)
  } catch {
    return []
  }
}

export function writeSavedProperties(userId, items) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(items))
    window.dispatchEvent(new CustomEvent('mysewa-saved-properties-changed'))
  } catch {
    /* ignore */
  }
}

export function countSavedProperties(userId) {
  return readSavedProperties(userId).length
}

export function isPropertySaved(userId, propertyId) {
  const id = String(propertyId)
  return readSavedProperties(userId).some((e) => String(e.propertyId) === id)
}

export function propertySnapshotFromCard(property) {
  return {
    name: property.name || 'Rental listing',
    price: Number(property.price) || 0,
    address: property.address || '',
    image: property.image || '',
    rating: Number(property.rating) || 4.5,
  }
}

export function saveProperty(userId, property) {
  const propertyId = property?.id
  if (propertyId == null) return readSavedProperties(userId)
  const items = readSavedProperties(userId).filter((e) => String(e.propertyId) !== String(propertyId))
  items.unshift({
    propertyId,
    savedAt: new Date().toISOString(),
    snapshot: propertySnapshotFromCard(property),
  })
  writeSavedProperties(userId, items)
  return items
}

export function removeSavedProperty(userId, propertyId) {
  const items = readSavedProperties(userId).filter((e) => String(e.propertyId) !== String(propertyId))
  writeSavedProperties(userId, items)
  return items
}

export function toggleSavedProperty(userId, property) {
  if (isPropertySaved(userId, property?.id)) {
    return removeSavedProperty(userId, property.id)
  }
  return saveProperty(userId, property)
}
