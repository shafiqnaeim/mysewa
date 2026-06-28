import {
  formatCapacityLine,
  formatPropertyLocationLine,
  formatRatingScore,
  listPropertyImageUrls,
  propertyReviewCount,
} from '../utils/propertyDisplay'
import { AMENITY_LABELS, listAmenityIds } from '../utils/amenities'

const AMENITY_EMOJI = {
  wifi: '📶',
  furnished: '🛋️',
  parking: '🅿️',
  aircond: '❄️',
  utilities: '💡',
  washing: '🧺',
  fridge: '🧊',
  water_heater: '🚿',
  kitchen: '🍳',
  desk: '📚',
  wardrobe: '👔',
  private_bathroom: '🚽',
  cctv: '📹',
  security: '🔒',
  balcony: '🌿',
}

function amenityShortLabel(id) {
  if (id === 'aircond') return 'AC'
  const label = AMENITY_LABELS[id] || id
  if (label === 'Wi-Fi') return 'WiFi'
  if (label === 'Air conditioning') return 'AC'
  if (label === 'Parking') return 'Parking'
  if (label === 'Furnished') return 'Furnished'
  return label.length > 14 ? `${label.slice(0, 12)}…` : label
}

function formatPriceAmount(price) {
  const n = Number(price)
  if (!Number.isFinite(n) || n <= 0) return null
  return n.toLocaleString('en-MY', { maximumFractionDigits: 0 })
}

function getStatusConfig(status) {
  const s = String(status || 'available').toLowerCase()

  if (s === 'rented' || s === 'booked' || s === 'occupied') {
    return {
      label: 'Occupied',
      badgeClass: 'bg-blue-100 text-blue-800',
    }
  }

  if (s === 'pending' || s === 'maintenance') {
    return {
      label: s === 'maintenance' ? 'Maintenance' : 'Pending',
      badgeClass: 'bg-yellow-100 text-yellow-800',
    }
  }

  return {
    label: 'Available',
    badgeClass: 'bg-green-100 text-green-800',
  }
}

function ImagePlaceholder() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#EDF2F7] to-[#E2E8F0] text-[#A0AEC0]">
      <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
        <path d="M3 16l5-4 4 3 4-5 5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="mt-2 text-xs font-medium">No photo yet</span>
    </div>
  )
}

export default function PropertyCard({ property, onView, onEdit, onDelete }) {
  const imageUrl = listPropertyImageUrls(property)[0] || ''
  const location = formatPropertyLocationLine(property)
  const capacity = formatCapacityLine(property)
  const rating = formatRatingScore(property)
  const reviewCount = propertyReviewCount(property)
  const status = getStatusConfig(property.status)
  const priceAmount = formatPriceAmount(property.price)
  const amenityIds = listAmenityIds(property.amenities)
  const visibleAmenities = amenityIds.slice(0, 4)
  const hiddenAmenityCount = Math.max(0, amenityIds.length - visibleAmenities.length)

  return (
    <article className="group overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm transition hover:shadow-md">
      {/* Image + status overlay */}
      <div className="relative h-48 w-full overflow-hidden bg-[#E2E8F0]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <ImagePlaceholder />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${status.badgeClass}`}
        >
          {status.label}
        </span>
        {property.type ? (
          <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-[#4A5568] shadow-sm">
            {property.type}
          </span>
        ) : null}
      </div>

      <div className="p-5">
        {/* Title & address */}
        <h3 className="line-clamp-2 text-lg font-bold text-[#2D3748]">
          {property.name || 'Untitled property'}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-[#A0AEC0]">{location}</p>
        <p className="mt-2 text-xl font-bold text-[#E88D5B]">
          {priceAmount ? (
            <>
              RM {priceAmount}
              <span className="text-sm font-semibold text-[#A0AEC0]">/month</span>
            </>
          ) : (
            <span className="text-base font-semibold text-[#A0AEC0]">Price not set</span>
          )}
        </p>

        {/* Stats badges */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] px-2 py-2.5 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#A0AEC0]">Price</p>
            <p className="mt-1 text-xs font-semibold leading-snug text-[#2D3748]">
              <span aria-hidden="true">💰 </span>
              {priceAmount ? `RM ${priceAmount}` : '—'}
            </p>
            <p className="text-[10px] text-[#A0AEC0]">/month</p>
          </div>
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] px-2 py-2.5 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#A0AEC0]">Capacity</p>
            <p className="mt-1 text-xs font-semibold leading-snug text-[#2D3748]">
              <span aria-hidden="true">👥 </span>
              {capacity}
            </p>
          </div>
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] px-2 py-2.5 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#A0AEC0]">Rating</p>
            <p className="mt-1 text-xs font-semibold leading-snug text-[#2D3748]">
              <span aria-hidden="true">⭐ </span>
              {rating}
            </p>
            <p className="text-[10px] text-[#A0AEC0]">
              ({reviewCount} review{reviewCount === 1 ? '' : 's'})
            </p>
          </div>
        </div>

        {/* Amenities */}
        {visibleAmenities.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Amenities">
            {visibleAmenities.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-[#F7FAFC] px-2.5 py-1 text-xs font-medium text-[#4A5568]"
                title={AMENITY_LABELS[id] || id}
              >
                <span aria-hidden="true">{AMENITY_EMOJI[id] || '✓'}</span>
                {amenityShortLabel(id)}
              </span>
            ))}
            {hiddenAmenityCount > 0 ? (
              <span className="inline-flex items-center rounded-full bg-[#F7FAFC] px-2.5 py-1 text-xs font-medium text-[#A0AEC0]">
                +{hiddenAmenityCount} more
              </span>
            ) : null}
          </div>
        ) : null}

        {/* Actions */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onView?.(property)}
            className="rounded-lg bg-[#E88D5B] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#D97747]"
          >
            View
          </button>
          <button
            type="button"
            onClick={() => onEdit?.(property)}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-xs font-semibold text-[#2D3748] transition hover:bg-[#F7FAFC]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(property)}
            className="rounded-lg px-3 py-2.5 text-xs font-semibold text-red-500 transition hover:bg-red-50"
            aria-label={`Delete ${property.name || 'property'}`}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}
