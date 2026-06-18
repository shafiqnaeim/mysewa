import { useEffect, useMemo, useRef, useState } from 'react'
import { NEARBY_FACILITY_TYPES, fetchNearbyFacilities } from '../utils/nearbyFacilities'

const DEFAULT_CENTER = [5.3967, 103.0829]
const DEFAULT_ZOOM = 14

const ALL_CATEGORY_IDS = NEARBY_FACILITY_TYPES.map((t) => t.id)

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

function campusPinIcon(L) {
  return L.divIcon({
    className: 'pv-campus-route-cap-icon',
    html: '<span class="pv-campus-route-cap" aria-hidden="true">🎓</span>',
    iconSize: [32, 32],
    iconAnchor: [16, 30],
  })
}

/**
 * @param {object} props
 * @param {string|number} props.latitude
 * @param {string|number} props.longitude
 * @param {string} [props.className]
 * @param {{ type: string, coordinates: number[][] } | null} [props.campusRouteGeometry] GeoJSON LineString, [lng,lat] vertices
 * @param {number|null} [props.campusRouteEndLat]
 * @param {number|null} [props.campusRouteEndLng]
 * @param {string|null} [props.campusRouteLabel]
 * @param {number|null} [props.campusDrivingDistanceKm] driving distance listing → campus; shown on campus marker hover
 * @param {unknown[]|undefined} [props.prefetchedNearbyPlaces] when an array (from parent prefetch), skip Overpass fetch and show map/legend immediately
 */
export default function PropertySurroundingsMap({
  latitude,
  longitude,
  className = '',
  campusRouteGeometry = null,
  campusRouteEndLat = null,
  campusRouteEndLng = null,
  campusRouteLabel = null,
  campusDrivingDistanceKm = null,
  prefetchedNearbyPlaces,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const routeLayerRef = useRef(null)
  const facilityLayerRef = useRef(null)
  const [nearby, setNearby] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeCategories, setActiveCategories] = useState(() => new Set())
  /** Nearby legend paints while false; POI circles + campus route draw only after this flips true. */
  const [mapOverlaysReady, setMapOverlaysReady] = useState(false)
  const [overlayRevealNonce, setOverlayRevealNonce] = useState(0)

  const lat = latitude != null && latitude !== '' ? Number(latitude) : null
  const lng = longitude != null && longitude !== '' ? Number(longitude) : null
  const hasPin = Number.isFinite(lat) && Number.isFinite(lng)

  const endLat = campusRouteEndLat != null ? Number(campusRouteEndLat) : null
  const endLng = campusRouteEndLng != null ? Number(campusRouteEndLng) : null
  const hasCampusEnd = Number.isFinite(endLat) && Number.isFinite(endLng)
  const drivingKm =
    campusDrivingDistanceKm != null && Number.isFinite(Number(campusDrivingDistanceKm))
      ? Number(campusDrivingDistanceKm)
      : null

  const routeCoordsLatLng = useMemo(() => {
    if (
      campusRouteGeometry?.type !== 'LineString' ||
      !Array.isArray(campusRouteGeometry.coordinates) ||
      campusRouteGeometry.coordinates.length < 2
    ) {
      return null
    }
    return campusRouteGeometry.coordinates.map(([lngV, latV]) => [latV, lngV])
  }, [campusRouteGeometry])

  const countsByCategory = useMemo(() => {
    const counts = Object.fromEntries(ALL_CATEGORY_IDS.map((id) => [id, 0]))
    nearby.forEach((place) => {
      counts[place.category] = (counts[place.category] || 0) + 1
    })
    return counts
  }, [nearby])

  const visiblePlaces = useMemo(
    () => nearby.filter((place) => activeCategories.has(place.category)),
    [nearby, activeCategories],
  )

  function toggleCategory(categoryId) {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

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

    routeLayerRef.current = L.layerGroup().addTo(map)
    facilityLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      routeLayerRef.current = null
      facilityLayerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!hasPin) {
      queueMicrotask(() => {
        setNearby([])
        setActiveCategories(new Set())
        setLoading(false)
        setMapOverlaysReady(false)
        setOverlayRevealNonce(0)
      })
      return undefined
    }

    const hasPrefetch = Array.isArray(prefetchedNearbyPlaces)

    if (hasPrefetch) {
      let cancelled = false
      queueMicrotask(() => {
        if (cancelled) return
        setNearby(prefetchedNearbyPlaces)
        setLoading(false)
        setActiveCategories(new Set())
        setMapOverlaysReady(true)
      })
      return () => {
        cancelled = true
      }
    }

    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true)
        setActiveCategories(new Set())
        setMapOverlaysReady(false)
      }
    })

    fetchNearbyFacilities(lat, lng)
      .then((rows) => {
        if (!cancelled) setNearby(rows)
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
          setOverlayRevealNonce((n) => n + 1)
        }
      })

    return () => {
      cancelled = true
    }
  }, [hasPin, lat, lng, prefetchedNearbyPlaces])

  useEffect(() => {
    if (Array.isArray(prefetchedNearbyPlaces)) return undefined
    if (overlayRevealNonce === 0) {
      queueMicrotask(() => setMapOverlaysReady(false))
      return undefined
    }
    let id2 = 0
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        setMapOverlaysReady(true)
      })
    })
    return () => {
      cancelAnimationFrame(id1)
      cancelAnimationFrame(id2)
    }
  }, [overlayRevealNonce, prefetchedNearbyPlaces])

  useEffect(() => {
    const map = mapRef.current
    const routeLayer = routeLayerRef.current
    const facilityLayer = facilityLayerRef.current
    if (!map || !window.L || !facilityLayer || !hasPin) return

    const L = window.L
    facilityLayer.clearLayers()
    if (routeLayer) routeLayer.clearLayers()

    L.marker([lat, lng], {
      icon: propertyPinIcon(L),
      interactive: false,
      zIndexOffset: 1000,
    }).addTo(facilityLayer)

    const bounds = L.latLngBounds([[lat, lng]])

    if (mapOverlaysReady) {
      visiblePlaces.forEach((place) => {
        L.circleMarker([place.lat, place.lng], {
          radius: 7,
          color: '#fff',
          weight: 2,
          fillColor: place.color,
          fillOpacity: 0.95,
        })
          .bindTooltip(`${place.name} · ${place.distanceLabel}`, { direction: 'top', offset: [0, -4] })
          .addTo(facilityLayer)
        bounds.extend([place.lat, place.lng])
      })
    }

    if (mapOverlaysReady && routeLayer && routeCoordsLatLng && routeCoordsLatLng.length >= 2) {
      L.polyline(routeCoordsLatLng, {
        color: '#4f46e5',
        weight: 5,
        opacity: 0.88,
        lineJoin: 'round',
      }).addTo(routeLayer)
      routeCoordsLatLng.forEach((c) => bounds.extend(c))
    }

    if (mapOverlaysReady && routeLayer && hasCampusEnd) {
      const campusMarker = L.marker([endLat, endLng], {
        icon: campusPinIcon(L),
        interactive: true,
        zIndexOffset: 400,
      }).addTo(routeLayer)

      let tipText = 'Campus'
      if (drivingKm != null && campusRouteLabel) {
        tipText = `${campusRouteLabel} · ~${drivingKm.toFixed(1)} km`
      } else if (drivingKm != null) {
        tipText = `~${drivingKm.toFixed(1)} km`
      } else if (campusRouteLabel) {
        tipText = campusRouteLabel
      }
      campusMarker.bindTooltip(tipText, {
        direction: 'top',
        offset: [0, -10],
        opacity: 1,
        className: 'pv-campus-road-tooltip',
      })
      bounds.extend([endLat, endLng])
    }

    const hasRoute = mapOverlaysReady && routeCoordsLatLng && routeCoordsLatLng.length >= 2
    const multi =
      (mapOverlaysReady && visiblePlaces.length > 0) ||
      hasRoute ||
      (mapOverlaysReady && hasCampusEnd && (endLat !== lat || endLng !== lng))

    if (multi) {
      map.fitBounds(bounds.pad(0.12), { maxZoom: 16 })
    } else {
      map.setView([lat, lng], 15)
    }

    window.setTimeout(() => map.invalidateSize(), 80)
  }, [
    hasPin,
    lat,
    lng,
    visiblePlaces,
    routeCoordsLatLng,
    hasCampusEnd,
    endLat,
    endLng,
    campusRouteLabel,
    drivingKm,
    mapOverlaysReady,
  ])

  const mapAria =
    routeCoordsLatLng && hasCampusEnd
      ? `Property location, nearby facilities, and driving route to ${campusRouteLabel || 'campus'}`
      : 'Property location and nearby facilities'

  if (!hasPin) {
    return (
      <p className={`pv-map-empty${className ? ` ${className}` : ''}`}>
        Pin not set — edit this property and drop a pin on the map.
      </p>
    )
  }

  return (
    <div className={`pv-surroundings${className ? ` ${className}` : ''}`}>
      <div ref={containerRef} className="pv-map-canvas" role="img" aria-label={mapAria} />
      <p className="pv-surroundings-hint">
        Nearby places within ~2.5 km (straight-line radius) from the listing pin. Data comes from OpenStreetMap and
        may be incomplete or slightly out of date — treat locations as approximate.
      </p>
      {loading ? <p className="pv-surroundings-status">Loading nearby places…</p> : null}
      {!loading && nearby.length === 0 ? (
        <p className="pv-surroundings-status">No labelled facilities found nearby on the map.</p>
      ) : null}
      {!loading && nearby.length > 0 ? (
        <>
          <p className="pv-surroundings-filter-hint">Select one or more types below to see places on the map.</p>
          <ul className="pv-nearby-legend" aria-label="Filter facility types on map">
            {NEARBY_FACILITY_TYPES.filter((type) => (countsByCategory[type.id] || 0) > 0).map((type) => {
              const on = activeCategories.has(type.id)
              const count = countsByCategory[type.id] || 0
              return (
                <li key={type.id}>
                  <button
                    type="button"
                    className={`pv-nearby-legend-btn${on ? ' pv-nearby-legend-btn--on' : ''}`}
                    aria-pressed={on}
                    aria-label={`${type.label} (${count} nearby)`}
                    title={type.label}
                    onClick={() => toggleCategory(type.id)}
                  >
                    <span className="pv-nearby-legend-dot" style={{ background: type.color }} aria-hidden="true" />
                    <span className="pv-nearby-legend-symbol" aria-hidden="true">
                      {type.symbol}
                    </span>
                    <span className="pv-nearby-legend-count">{count}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      ) : null}
    </div>
  )
}
