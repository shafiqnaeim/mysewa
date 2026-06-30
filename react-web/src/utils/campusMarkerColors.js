/** Branded campus marker colors (admin map). */
export const CAMPUS_MARKER_COLORS = {
  UMT: '#0057B3',
  UniSZA: '#00843D',
  ILPKT: '#F47920',
  IPGM: '#6A1B9A',
}

const DEFAULT_CAMPUS_COLOR = '#DC2626'

export function getCampusMarkerColor(code) {
  const normalized = String(code || '').trim()
  if (!normalized) return DEFAULT_CAMPUS_COLOR

  const exact = CAMPUS_MARKER_COLORS[normalized]
  if (exact) return exact

  const upper = normalized.toUpperCase()
  const byUpper = Object.entries(CAMPUS_MARKER_COLORS).find(
    ([key]) => key.toUpperCase() === upper,
  )
  if (byUpper) return byUpper[1]

  return DEFAULT_CAMPUS_COLOR
}

/**
 * SVG marker icon for draggable Google Maps pins (matches CampusCustomMarker look).
 */
export function createCampusMarkerIcon(code, color, options = {}) {
  const { selected = false, dimmed = false, draft = false } = options
  if (typeof window === 'undefined' || !window.google?.maps) return undefined

  const opacity = dimmed ? 0.35 : 1
  const label = draft ? '✎' : String(code || '?').slice(0, 8)
  const bg = draft ? '#DC2626' : color || DEFAULT_CAMPUS_COLOR
  const stroke = selected ? '#DC2626' : 'none'
  const strokeWidth = selected ? 3 : 0
  const w = 56
  const h = 64

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 56 64">
    <defs>
      <filter id="s" x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.22"/>
      </filter>
    </defs>
    <g filter="url(#s)" opacity="${opacity}">
      <rect x="4" y="4" width="48" height="48" rx="10" fill="${bg}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <text x="28" y="33" text-anchor="middle" dominant-baseline="middle" fill="#FFFFFF" font-family="system-ui,Arial,sans-serif" font-size="11" font-weight="700">${label}</text>
      <path d="M28 50 L18 62 L38 62 Z" fill="${bg}"/>
    </g>
  </svg>`

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(w, h),
    anchor: new window.google.maps.Point(28, 62),
  }
}
