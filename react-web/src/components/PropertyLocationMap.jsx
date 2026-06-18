import { useEffect, useRef, useState } from 'react'

const DEFAULT_CENTER = [5.3967, 103.0829]
const DEFAULT_ZOOM = 13

function campusMarkerHtml(code, name) {
  const safeName = String(name || code).replace(/</g, '')
  return `<span class="property-map-campus-pin" title="${safeName}">
    <span class="property-map-campus-pin-dot"></span>
    <span class="property-map-campus-pin-code">${code}</span>
  </span>`
}

function campusIcon(L, code, name) {
  return L.divIcon({
    className: 'property-map-campus-marker-wrap',
    html: campusMarkerHtml(code, name),
    iconSize: [52, 28],
    iconAnchor: [26, 28],
  })
}

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

export default function PropertyLocationMap({ latitude, longitude, onPinChange, universities = [] }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const campusMarkersRef = useRef([])
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState('')

  const onPinChangeRef = useRef(onPinChange)

  useEffect(() => {
    onPinChangeRef.current = onPinChange
  }, [onPinChange])

  useEffect(() => {
    if (!containerRef.current || !window.L) return undefined

    const L = window.L
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    map.on('click', (e) => {
      const { lat, lng } = e.latlng
      onPinChangeRef.current(lat, lng)
      setGeoError('')
    })

    mapRef.current = map

    return () => {
      campusMarkersRef.current = []
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !window.L) return

    const L = window.L

    campusMarkersRef.current.forEach((m) => map.removeLayer(m))
    campusMarkersRef.current = []

    universities.forEach((campus) => {
      const lat = Number(campus.lat ?? campus.latitude)
      const lng = Number(campus.lng ?? campus.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
      const marker = L.marker([lat, lng], {
        icon: campusIcon(L, campus.code, campus.name),
        interactive: false,
        keyboard: false,
        zIndexOffset: 100,
      }).addTo(map)
      campusMarkersRef.current.push(marker)
    })

    const lat = latitude !== '' && latitude != null ? Number(latitude) : null
    const lng = longitude !== '' && longitude != null ? Number(longitude) : null

    if (markerRef.current) {
      map.removeLayer(markerRef.current)
      markerRef.current = null
    }

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      markerRef.current = L.marker([lat, lng], {
        icon: propertyPinIcon(L),
        draggable: true,
        zIndexOffset: 500,
      }).addTo(map)
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current.getLatLng()
        onPinChangeRef.current(pos.lat, pos.lng)
      })
      map.setView([lat, lng], Math.max(map.getZoom(), 15))
    } else if (campusMarkersRef.current.length) {
      const group = L.featureGroup(campusMarkersRef.current)
      map.fitBounds(group.getBounds().pad(0.25))
    }
  }, [latitude, longitude, universities])

  function useMyCurrentLocation() {
    setGeoError('')
    if (!navigator.geolocation) {
      setGeoError('Location is not supported in this browser.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPinChangeRef.current(pos.coords.latitude, pos.coords.longitude)
        setLocating(false)
      },
      () => {
        setLocating(false)
        setGeoError('Could not get your location. Check permissions and try again.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  }

  return (
    <div className="property-form-map-shell">
      <div className="property-form-map-frame">
        <div className="property-form-map-legend property-form-map-legend--overlay" aria-hidden="true">
          <span className="property-form-map-legend-item">
            <span className="property-form-map-legend-campus" /> Campus
          </span>
          <span className="property-form-map-legend-item">
            <span className="property-form-map-legend-property" /> Your Property
          </span>
        </div>
        <button
          type="button"
          className="property-form-map-locate-btn"
          onClick={useMyCurrentLocation}
          disabled={locating}
        >
          Use My Current Location
        </button>
        {locating ? (
          <div className="property-form-map-locate-overlay" role="status" aria-live="polite">
            <div className="property-form-map-locate-spinner" aria-hidden="true" />
            <p className="property-form-map-locate-overlay-title">Finding your location</p>
            <p className="property-form-map-locate-overlay-hint">This may take a few seconds…</p>
          </div>
        ) : null}
        <div ref={containerRef} className="property-form-map" role="application" aria-label="Map pin location picker" />
      </div>
      {geoError ? <p className="property-form-map-geo-error" role="alert">{geoError}</p> : null}
    </div>
  )
}
