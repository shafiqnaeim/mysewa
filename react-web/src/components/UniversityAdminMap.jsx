import { useEffect, useRef } from 'react'

const DEFAULT_CENTER = [5.3967, 103.0829]
const DEFAULT_ZOOM = 13

function campusIcon(L, code, active) {
  return L.divIcon({
    className: 'property-map-campus-marker-wrap',
    html: `<span class="property-map-campus-marker${active ? ' property-map-campus-marker--active' : ''}">${code}</span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

/**
 * @param {'edit'|'overview'} mode - edit: place/drag pin for the open form; overview: all campus pins clickable.
 */
export default function UniversityAdminMap({
  mode = 'edit',
  universities,
  selectedId,
  latitude,
  longitude,
  onPinChange,
  onCampusSelect,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const campusMarkersRef = useRef([])

  const onPinChangeRef = useRef(onPinChange)
  onPinChangeRef.current = onPinChange
  const onCampusSelectRef = useRef(onCampusSelect)
  onCampusSelectRef.current = onCampusSelect

  useEffect(() => {
    if (!containerRef.current || !window.L) return undefined

    const L = window.L
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    if (mode === 'edit') {
      map.on('click', (e) => {
        onPinChangeRef.current(e.latlng.lat, e.latlng.lng)
      })
    }

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
      campusMarkersRef.current = []
    }
  }, [mode])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !window.L) return

    const L = window.L

    campusMarkersRef.current.forEach((m) => map.removeLayer(m))
    campusMarkersRef.current = []

    ;(universities || []).forEach((u) => {
      if (u.latitude == null || u.longitude == null) return
      const isSelected = u.id === selectedId
      const interactive = mode === 'overview'
      const marker = L.marker([u.latitude, u.longitude], {
        icon: campusIcon(L, u.code, isSelected),
        interactive,
      }).addTo(map)
      marker.bindTooltip(u.name, { direction: 'top', offset: [0, -16] })
      if (mode === 'overview') {
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e)
          if (typeof onCampusSelectRef.current === 'function') {
            onCampusSelectRef.current(u)
          }
        })
      }
      campusMarkersRef.current.push(marker)
    })

    if (markerRef.current) {
      map.removeLayer(markerRef.current)
      markerRef.current = null
    }

    if (mode === 'edit') {
      const lat = latitude !== '' && latitude != null ? Number(latitude) : null
      const lng = longitude !== '' && longitude != null ? Number(longitude) : null

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map)
        markerRef.current.on('dragend', () => {
          const pos = markerRef.current.getLatLng()
          onPinChangeRef.current(pos.lat, pos.lng)
        })
        map.setView([lat, lng], Math.max(map.getZoom(), 14))
      } else if (campusMarkersRef.current.length) {
        const group = L.featureGroup(campusMarkersRef.current)
        map.fitBounds(group.getBounds().pad(0.2))
      }
    } else if (campusMarkersRef.current.length) {
      const group = L.featureGroup(campusMarkersRef.current)
      map.fitBounds(group.getBounds().pad(0.2))
    }
  }, [mode, universities, selectedId, latitude, longitude])

  const hint =
    mode === 'overview'
      ? 'Click a campus pin to select that university in the list below. Zoom and pan the map as usual.'
      : "Click the map or drag the pin to set this university's fixed location."

  return (
    <div className="property-form-map-wrap admin-university-map-wrap">
      <div ref={containerRef} className="property-form-map admin-university-map" />
      <p className="property-form-map-hint">{hint}</p>
    </div>
  )
}
