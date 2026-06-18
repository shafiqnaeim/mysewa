import { useLayoutEffect, useRef, useState } from 'react'
import { AMENITY_LABELS, listAmenityIds } from '../utils/amenities'
import AmenityIcon from './AmenityIcon'

const ICON_SLOT_PX = 28
const GAP_PX = 6
const OVERFLOW_SLOT_PX = 34

function countFitting(width, total) {
  if (total <= 0 || width <= 0) return 0
  for (let visible = total; visible >= 0; visible -= 1) {
    const hidden = total - visible
    const iconsW = visible * ICON_SLOT_PX + Math.max(0, visible - 1) * GAP_PX
    const overflowW = hidden > 0 ? OVERFLOW_SLOT_PX + (visible > 0 ? GAP_PX : 0) : 0
    if (iconsW + overflowW <= width) return visible
  }
  return 0
}

export default function PropertyCardAmenityIcons({ amenitiesField, className = '' }) {
  const containerRef = useRef(null)
  const ids = listAmenityIds(amenitiesField)
  const [visibleCount, setVisibleCount] = useState(ids.length)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return undefined

    const measure = () => {
      setVisibleCount(countFitting(el.clientWidth, ids.length))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ids.length, ids.join('|')])

  if (!ids.length) return null

  const shown = ids.slice(0, visibleCount)
  const hidden = ids.length - shown.length
  const hiddenTitle = ids
    .slice(visibleCount)
    .map((id) => AMENITY_LABELS[id] || id)
    .join(', ')

  return (
    <div
      ref={containerRef}
      className={`landlord-property-card-amenities${className ? ` ${className}` : ''}`}
      aria-label="Amenities"
    >
      {shown.map((id) => (
        <span key={id} className="landlord-property-card-amenity" title={AMENITY_LABELS[id] || id}>
          <AmenityIcon id={id} />
        </span>
      ))}
      {hidden > 0 ? (
        <span className="landlord-property-card-amenity landlord-property-card-amenity--more" title={hiddenTitle}>
          +{hidden}
        </span>
      ) : null}
    </div>
  )
}
