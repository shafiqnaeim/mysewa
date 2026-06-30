import { OverlayView } from '@react-google-maps/api'
import { getCampusMarkerColor } from '../../utils/campusMarkerColors'

/**
 * Branded HTML marker for campus pins on Google Maps (OverlayView).
 */
export default function CampusCustomMarker({
  university,
  selected = false,
  dimmed = false,
  onClick,
}) {
  const lat = Number(university.latitude)
  const lng = Number(university.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const code = university.code || university.name?.slice(0, 6) || '•'
  const color = getCampusMarkerColor(university.code)
  const opacity = dimmed ? 0.35 : 1

  return (
    <OverlayView
      position={{ lat, lng }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(width, height) => ({
        x: -width / 2,
        y: -height,
      })}
    >
      <button
        type="button"
        title={university.name || code}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(university)
        }}
        className="relative border-0 bg-transparent p-0 transition-transform hover:scale-105"
        style={{ opacity, cursor: 'pointer' }}
        aria-label={university.name || code}
      >
        <div
          className="flex h-14 w-14 items-center justify-center rounded-lg text-sm font-bold text-white shadow-lg"
          style={{
            backgroundColor: color,
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            outline: selected ? '3px solid #DC2626' : 'none',
            outlineOffset: '2px',
          }}
        >
          {code}
        </div>
        <div
          className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 shadow-sm"
          style={{
            backgroundColor: color,
            borderRight: '1px solid rgba(0,0,0,0.08)',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}
          aria-hidden="true"
        />
      </button>
    </OverlayView>
  )
}
