import { useEffect, useRef } from 'react'

const DEFAULT_CENTER = [5.3967, 103.0829]
const DEFAULT_ZOOM = 13

function propertyPinIcon(L) {
  return L.divIcon({
    className: 'property-map-property-pin-wrap',
    html: `<span class="property-map-property-pin" aria-hidden="true">
      <span class="property-map-property-pin-head"></span>
      <span class="property-map-property-pin-tail"></span>
    </span>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
  })
}

/** Read-only Leaflet map for property view (same tiles as the add/edit form). */
export default function PropertyReadonlyMap({ latitude, longitude, className = '' }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !window.L) return undefined

    const L = window.L
    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      dragging: true,
      doubleClickZoom: true,
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !window.L) return

    const L = window.L
    const lat = latitude != null && latitude !== '' ? Number(latitude) : null
    const lng = longitude != null && longitude !== '' ? Number(longitude) : null

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer)
    })

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      L.marker([lat, lng], { icon: propertyPinIcon(L), interactive: false }).addTo(map)
      map.setView([lat, lng], 15)
      window.setTimeout(() => map.invalidateSize(), 80)
    }
  }, [latitude, longitude])

  const lat = latitude != null && latitude !== '' ? Number(latitude) : null
  const lng = longitude != null && longitude !== '' ? Number(longitude) : null
  const hasPin = Number.isFinite(lat) && Number.isFinite(lng)

  if (!hasPin) {
    return (
      <p className={`pv-map-empty${className ? ` ${className}` : ''}`}>
        Pin not set — edit this property and drop a pin on the map.
      </p>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`pv-map-canvas${className ? ` ${className}` : ''}`}
      role="img"
      aria-label="Property location on map"
    />
  )
}
