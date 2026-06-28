import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'

const defaultCenter = { lat: 5.33, lng: 103.1408 }
const MAP_HEIGHT = 400

const mapContainerStyle = {
  width: '100%',
  height: `${MAP_HEIGHT}px`,
  borderRadius: '12px',
}

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  clickableIcons: false,
}

function formatCoord(value) {
  if (value === '' || value == null) return '—'
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(6) : '—'
}

function parseCoordinates(latitude, longitude) {
  if (latitude === '' || latitude == null || longitude === '' || longitude == null) {
    return null
  }
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  if (Math.abs(lat) < 1e-6 && Math.abs(lng) < 1e-6) return null
  return { lat, lng }
}

export default function PropertyLocationPicker({
  latitude = '',
  longitude = '',
  onLocationChange,
  className = '',
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
  })

  const mapRef = useRef(null)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [locating, setLocating] = useState(false)

  const position = useMemo(
    () => parseCoordinates(latitude, longitude),
    [latitude, longitude],
  )

  const center = position ?? defaultCenter
  const zoom = position ? 16 : 12

  const setCoordinates = useCallback(
    (lat, lng) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

      mapRef.current?.panTo({ lat, lng })
      mapRef.current?.setZoom(16)
      setMessage('Location pinned')
      setError('')
      onLocationChange?.({ latitude: lat, longitude: lng })
    },
    [onLocationChange],
  )

  const onMapClick = useCallback(
    (event) => {
      const lat = event.latLng?.lat()
      const lng = event.latLng?.lng()
      if (lat == null || lng == null) return
      setCoordinates(lat, lng)
    },
    [setCoordinates],
  )

  const onMarkerDragEnd = useCallback(
    (event) => {
      const lat = event.latLng?.lat()
      const lng = event.latLng?.lng()
      if (lat == null || lng == null) return
      setCoordinates(lat, lng)
    },
    [setCoordinates],
  )

  function clearLocation() {
    setMessage('')
    setError('')
    mapRef.current?.panTo(defaultCenter)
    mapRef.current?.setZoom(12)
    onLocationChange?.({ latitude: '', longitude: '' })
  }

  function useCurrentLocation() {
    setError('')
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        setCoordinates(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        setLocating(false)
        setError('Could not get your location. Check permissions and try again.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  }

  function handleMapLoad(map) {
    mapRef.current = map
    const coords = parseCoordinates(latitude, longitude)
    if (coords) {
      map.setCenter(coords)
      map.setZoom(16)
    } else {
      map.setCenter(defaultCenter)
      map.setZoom(12)
    }
  }

  useEffect(() => {
    if (!mapRef.current) return
    const coords = parseCoordinates(latitude, longitude)
    if (coords) {
      mapRef.current.setCenter(coords)
      mapRef.current.setZoom(16)
    } else {
      mapRef.current.setCenter(defaultCenter)
      mapRef.current.setZoom(12)
    }
  }, [latitude, longitude])

  if (!apiKey || apiKey === 'your_api_key_here') {
    return (
      <div
        className={`rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4 text-sm text-[#92400E] ${className}`}
        role="alert"
      >
        <p className="font-semibold text-[#B45309]">Google Maps API key required</p>
        <p className="mt-1">
          Add <code className="rounded bg-white/80 px-1 py-0.5 text-xs">VITE_GOOGLE_MAPS_API_KEY</code> to{' '}
          <code className="rounded bg-white/80 px-1 py-0.5 text-xs">react-web/.env.local</code> and restart the dev
          server.
        </p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div
        className={`rounded-xl border border-[#FC8181]/40 bg-[#FFF5F5] p-4 text-sm text-[#C53030] ${className}`}
        role="alert"
      >
        Unable to load Google Maps. Check your API key, enabled APIs (Maps JavaScript), and browser restrictions.
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div
        className={`flex h-[400px] items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] ${className}`}
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-[#E88D5B]/25 border-t-[#E88D5B]" />
          <p className="mt-3 text-sm font-medium text-[#4A5568]">Loading map…</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="inline-flex items-center gap-2 rounded-lg bg-[#E88D5B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d67a4a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden="true">📍</span>
          {locating ? 'Finding location…' : 'Use Current Location'}
        </button>
        <button
          type="button"
          onClick={clearLocation}
          disabled={!position}
          className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#4A5568] transition hover:bg-[#F7FAFC] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear location
        </button>
      </div>

      {message ? (
        <p
          className="rounded-lg border border-[#48BB78]/30 bg-[#48BB78]/10 px-3 py-2 text-sm text-[#276749]"
          role="status"
        >
          ✅ {message}
        </p>
      ) : null}

      {error ? (
        <p
          className="rounded-lg border border-[#FC8181]/30 bg-[#FC8181]/10 px-3 py-2 text-sm text-[#C53030]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[#E2E8F0] shadow-sm">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={zoom}
          options={mapOptions}
          onClick={onMapClick}
          onLoad={handleMapLoad}
        >
          {position ? (
            <Marker
              position={position}
              draggable
              onDragEnd={onMarkerDragEnd}
              animation={window.google.maps.Animation.DROP}
            />
          ) : null}
        </GoogleMap>
      </div>

      <p className="text-xs text-[#A0AEC0]">
        Pin the property on the map for location only. Enter the full address in the fields above — map actions do not
        change your address.
      </p>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] p-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#A0AEC0]">Latitude</p>
          <p className="mt-0.5 font-mono text-sm text-[#2D3748]">{formatCoord(latitude)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#A0AEC0]">Longitude</p>
          <p className="mt-0.5 font-mono text-sm text-[#2D3748]">{formatCoord(longitude)}</p>
        </div>
      </div>
    </div>
  )
}
