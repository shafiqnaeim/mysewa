import { useCallback, useMemo, useRef } from 'react'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'
import CampusCustomMarker from './CampusCustomMarker'
import {
  createCampusMarkerIcon,
  getCampusMarkerColor,
} from '../../utils/campusMarkerColors'
import {
  parseMapCoordinates,
  resolveGoogleMapsApiKey,
  TERENGGANU_CENTER,
} from '../../utils/googleMaps'

const DEFAULT_HEIGHT = 420

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  clickableIcons: false,
}

function campusMatchesSearch(campus, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return true
  const hay = `${campus.code || ''} ${campus.name || ''}`.toLowerCase()
  return hay.includes(q)
}

function pinnedCampuses(universities) {
  return (universities || []).filter(
    (u) =>
      u.latitude != null &&
      u.longitude != null &&
      Number.isFinite(Number(u.latitude)) &&
      Number.isFinite(Number(u.longitude)),
  )
}

/**
 * Google Maps campus editor / overview with branded campus markers.
 * @param {'overview'|'single'} mode
 */
export default function CampusMap({
  mode = 'overview',
  universities = [],
  selectedId = null,
  latitude = '',
  longitude = '',
  searchQuery = '',
  showSearch = false,
  onSearchQueryChange,
  onPinChange,
  onCampusSelect,
  onBlankMapClick,
  height = DEFAULT_HEIGHT,
}) {
  const apiKey = resolveGoogleMapsApiKey()
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey })
  const mapRef = useRef(null)

  const draftPosition = useMemo(
    () => parseMapCoordinates(latitude, longitude),
    [latitude, longitude],
  )

  const selectedCampus = useMemo(
    () => (universities || []).find((u) => u.id === selectedId) || null,
    [universities, selectedId],
  )

  const allPinned = useMemo(() => pinnedCampuses(universities), [universities])

  const visiblePinned = useMemo(() => {
    if (!showSearch || mode !== 'overview') return allPinned
    return allPinned.filter((u) => campusMatchesSearch(u, searchQuery))
  }, [allPinned, searchQuery, showSearch, mode])

  const center = useMemo(() => {
    if (draftPosition) return draftPosition
    if (visiblePinned.length) {
      const lat = visiblePinned.reduce((s, u) => s + Number(u.latitude), 0) / visiblePinned.length
      const lng = visiblePinned.reduce((s, u) => s + Number(u.longitude), 0) / visiblePinned.length
      return { lat, lng }
    }
    return TERENGGANU_CENTER
  }, [draftPosition, visiblePinned])

  const zoom = draftPosition ? 15 : visiblePinned.length === 1 ? 14 : 12

  const onMapClick = useCallback(
    (event) => {
      const lat = event.latLng?.lat()
      const lng = event.latLng?.lng()
      if (lat == null || lng == null) return

      if (mode === 'single' || selectedId) {
        onPinChange?.(lat, lng)
        return
      }
      onBlankMapClick?.(lat, lng)
    },
    [mode, selectedId, onPinChange, onBlankMapClick],
  )

  const onMarkerDragEnd = useCallback(
    (event) => {
      const lat = event.latLng?.lat()
      const lng = event.latLng?.lng()
      if (lat == null || lng == null) return
      onPinChange?.(lat, lng)
    },
    [onPinChange],
  )

  const draftMarkerIcon = useMemo(() => {
    if (!isLoaded) return undefined
    const code = selectedCampus?.code || 'NEW'
    const color = getCampusMarkerColor(selectedCampus?.code)
    return createCampusMarkerIcon(code, color, { selected: true, draft: true })
  }, [isLoaded, selectedCampus?.code])

  const mapContainerStyle = useMemo(
    () => ({
      width: '100%',
      height: `${height}px`,
      borderRadius: '0 0 12px 12px',
    }),
    [height],
  )

  if (!apiKey) {
    return (
      <div
        className="flex items-center justify-center bg-[#FEF2F2] px-4 text-center text-sm text-[#991B1B]"
        style={{ height }}
      >
        Set <code className="mx-1 rounded bg-white px-1">VITE_GOOGLE_MAPS_API_KEY</code> in your environment, then
        rebuild the app.
      </div>
    )
  }

  if (loadError) {
    return (
      <div
        className="flex items-center justify-center bg-[#FEF2F2] px-4 text-center text-sm text-[#991B1B]"
        style={{ height }}
      >
        Could not load Google Maps. Check your API key and billing settings.
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div
        className="flex items-center justify-center bg-[#FAFAFA] text-sm text-[#6B7280]"
        style={{ height }}
      >
        Loading map…
      </div>
    )
  }

  const showDraftMarker =
    (mode === 'single' || selectedId != null) &&
    draftPosition &&
    Number.isFinite(draftPosition.lat) &&
    Number.isFinite(draftPosition.lng)

  const markerUniversities = mode === 'overview' ? allPinned : universities

  return (
    <div>
      {showSearch ? (
        <div className="border-b border-[#E2E8F0] bg-white px-4 py-3">
          <label className="sr-only" htmlFor="campus-map-search">
            Search for campus
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
              aria-hidden="true"
            >
              🔍
            </span>
            <input
              id="campus-map-search"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange?.(e.target.value)}
              placeholder="Search for campus…"
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20"
            />
          </div>
        </div>
      ) : null}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        options={mapOptions}
        onClick={onMapClick}
        onLoad={(map) => {
          mapRef.current = map
        }}
      >
        {markerUniversities.map((u) => {
          const isSelected = u.id === selectedId
          const dimmed = showSearch && mode === 'overview' && !campusMatchesSearch(u, searchQuery)
          if (mode === 'single' && isSelected) return null
          if (mode === 'overview' && isSelected && showDraftMarker) return null

          return (
            <CampusCustomMarker
              key={`campus-${u.id}`}
              university={u}
              selected={isSelected}
              dimmed={dimmed}
              onClick={onCampusSelect}
            />
          )
        })}

        {showDraftMarker ? (
          <Marker
            position={draftPosition}
            draggable
            onDragEnd={onMarkerDragEnd}
            icon={draftMarkerIcon}
            zIndex={30}
          />
        ) : null}
      </GoogleMap>
    </div>
  )
}
