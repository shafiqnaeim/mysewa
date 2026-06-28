import { useEffect, useMemo, useState } from 'react'
import PropertyAvailabilityCalendar from '../../components/PropertyAvailabilityCalendar'
import { parseRentalStyleMeta } from './AddProperty'
import { AMENITY_LABELS, listAmenityIds } from '../../utils/amenities'
import {
  formatCapacityLine,
  formatPreferenceLabel,
  formatRatingScore,
  listPropertyImageUrls,
  propertyReviewCount,
} from '../../utils/propertyDisplay'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import EmptyState from '../../components/errors/EmptyState'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'location', label: 'Location' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'reports', label: 'Reports' },
]

const AMENITY_EMOJI = {
  wifi: '📶',
  furnished: '🛋️',
  parking: '🅿️',
  aircond: '❄️',
  utilities: '💡',
  pet_friendly: '🐾',
}

function getStatusConfig(status) {
  const s = String(status || 'available').toLowerCase()
  if (s === 'rented' || s === 'booked' || s === 'occupied') {
    return { label: 'OCCUPIED', badgeClass: 'bg-blue-100 text-blue-800' }
  }
  if (s === 'pending' || s === 'maintenance') {
    return { label: s === 'maintenance' ? 'MAINTENANCE' : 'PENDING', badgeClass: 'bg-yellow-100 text-yellow-800' }
  }
  return { label: 'AVAILABLE', badgeClass: 'bg-green-100 text-green-800' }
}

function formatListedDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatAddressLines(property) {
  const lines = []
  const street = String(property?.location || '').trim()
  if (street) lines.push(street)

  const postcode = String(property?.postcode || '').trim()
  const city = String(property?.city || '').trim()
  const cityLine = [postcode, city].filter(Boolean).join(' ')
  if (cityLine) lines.push(cityLine)

  const state = String(property?.state || 'Terengganu').trim()
  lines.push(state ? `${state}, Malaysia` : 'Malaysia')

  return lines
}

function ImageLightbox({ src, onClose }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  if (!src) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Property image"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white transition hover:bg-white/20"
        aria-label="Close"
      >
        ✕
      </button>
      <img
        src={src}
        alt=""
        className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
function formatPrice(property) {
  const n = Number(property?.price)
  if (!Number.isFinite(n) || n <= 0) return null
  return n.toLocaleString('en-MY', { maximumFractionDigits: 0 })
}

function parseCoordinates(property) {
  const lat = Number(property?.latitude)
  const lng = Number(property?.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) < 1e-6 && Math.abs(lng) < 1e-6) return null
  return { lat, lng }
}

function googleMapsAddressLink(property) {
  const query = formatAddressLines(property).join(', ')
  if (!query.trim()) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function googleMapsEmbedUrl(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`
}

function StatCard({ label, icon, children }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-[#A0AEC0]">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-snug text-[#2D3748]">
        <span aria-hidden="true">{icon} </span>
        {children}
      </p>
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${
        active ? 'bg-[#E88D5B] text-white shadow-sm' : 'bg-white text-[#4A5568] hover:bg-[#F7FAFC]'
      }`}
    >
      {children}
    </button>
  )
}

function DetailReviewsTab({ propertyId }) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const token = localStorage.getItem('mysewa_token')
        const res = await fetch(`/api/v1/reviews/for-property/${encodeURIComponent(propertyId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const data = await res.json().catch(() => ({}))
        if (!cancelled && res.ok) setItems(Array.isArray(data.items) ? data.items : [])
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (propertyId) load()
    return () => {
      cancelled = true
    }
  }, [propertyId])

  if (loading) {
    return <p className="text-sm text-[#A0AEC0]">Loading reviews…</p>
  }

  if (!items.length) {
    return (
      <EmptyState
        icon="📭"
        title="No Reviews Yet"
        message="Accepted tenants can leave the first review."
      />
    )
  }

  return (
    <ul className="space-y-4">
      {items.map((review) => (
        <li key={review.id} className="rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-[#2D3748]">{review.studentDisplayName || 'Student'}</p>
            <p className="text-sm text-[#ED8936]" aria-label={`${review.rating} out of 5 stars`}>
              {'★'.repeat(review.rating)}
              <span className="text-[#E2E8F0]">{'★'.repeat(5 - review.rating)}</span>
            </p>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#4A5568]">{review.comment}</p>
          {review.createdAt ? (
            <p className="mt-2 text-xs text-[#A0AEC0]">{new Date(review.createdAt).toLocaleString()}</p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function DetailReportsTab({ propertyId, token }) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/v1/properties/${encodeURIComponent(propertyId)}/tenant-reports`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const data = await res.json().catch(() => ({}))
        if (!cancelled && res.ok) setItems(Array.isArray(data.items) ? data.items : [])
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (propertyId) load()
    return () => {
      cancelled = true
    }
  }, [propertyId, token])

  if (loading) {
    return <p className="text-sm text-[#A0AEC0]">Loading reports…</p>
  }

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#F7FAFC] px-6 py-10 text-center">
        <p className="text-4xl" aria-hidden="true">
          📋
        </p>
        <p className="mt-3 font-semibold text-[#2D3748]">No maintenance reports</p>
        <p className="mt-1 text-sm text-[#A0AEC0]">Tenant reports for this property will show up here.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-4">
      {items.map((report) => {
        const status = String(report.status || 'pending').toLowerCase()
        const resolved = status === 'resolved' || status === 'received'
        return (
          <li key={report.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-[#2D3748]">{report.studentName || 'Tenant'}</p>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  resolved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {resolved ? 'Resolved' : 'Pending'}
              </span>
            </div>
            <p className="mt-2 text-sm text-[#4A5568]">{report.message}</p>
            {report.createdAt ? (
              <p className="mt-2 text-xs text-[#A0AEC0]">{new Date(report.createdAt).toLocaleString()}</p>
            ) : null}
            {report.imageUrl ? (
              <a
                href={resolveMediaUrl(report.imageUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-medium text-[#E88D5B] hover:text-[#D97747]"
              >
                View attached image →
              </a>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

export default function LandlordPropertyDetail({
  property,
  token,
  onEdit,
  onDelete,
}) {
  const [activeTab, setActiveTab] = useState('overview')
  const [lightboxSrc, setLightboxSrc] = useState('')

  const images = useMemo(() => listPropertyImageUrls(property), [property])
  const status = getStatusConfig(property.status)
  const priceAmount = formatPrice(property)
  const capacity = formatCapacityLine(property)
  const rating = formatRatingScore(property)
  const reviewCount = propertyReviewCount(property)
  const listedDate = formatListedDate(property.createdAt)
  const addressLines = formatAddressLines(property)
  const mapsAddressUrl = googleMapsAddressLink(property)
  const coords = parseCoordinates(property)
  const amenityIds = listAmenityIds(property.amenities)
  const meta = parseRentalStyleMeta(property.rentalStyle)

  const preferences = [
    ['Gender', formatPreferenceLabel(property.gender) || 'Any'],
    ['Religion', formatPreferenceLabel(property.religion) || 'Any'],
    ['Race', formatPreferenceLabel(property.race) || 'Any'],
  ]

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-[#FAFAFA] font-sans text-[#2D3748]">
      {lightboxSrc ? <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc('')} /> : null}

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-[#2D3748] sm:text-3xl">
                {property.name || 'Untitled property'}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onEdit?.(property)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#E88D5B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#D97747]"
                >
                  <span aria-hidden="true">✏️</span>
                  Edit Property
                </button>
                <button
                  type="button"
                  onClick={() => onDelete?.(property)}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600"
                >
                  <span aria-hidden="true">🗑</span>
                  Delete Property
                </button>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {property.type ? (
                <span className="rounded-full bg-[#F7FAFC] px-3 py-1 text-xs font-semibold text-[#4A5568] ring-1 ring-[#E2E8F0]">
                  {property.type}
                </span>
              ) : null}
              <span className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${status.badgeClass}`}>
                {status.label}
              </span>
            </div>
          </div>
        </header>

        <section className="space-y-6 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          {images.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  onClick={() => setLightboxSrc(src)}
                  className="group relative overflow-hidden rounded-lg bg-[#E2E8F0] text-left"
                  aria-label={`View image ${index + 1} of ${images.length}`}
                >
                  <img
                    src={src}
                    alt=""
                    className="h-48 w-full object-cover transition group-hover:scale-[1.02]"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-xs font-medium text-white opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
                    View full size
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg bg-[#E2E8F0] text-sm font-medium text-[#A0AEC0]">
              No photos yet
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold text-[#2D3748]">
              <span aria-hidden="true">💰 </span>
              Price
            </h2>
            <p className="mt-2 text-xl font-bold text-[#E88D5B]">
              {priceAmount ? (
                <>
                  RM {priceAmount}
                  <span className="text-base font-semibold text-[#A0AEC0]">/month</span>
                </>
              ) : (
                <span className="text-base text-[#A0AEC0]">Price not set</span>
              )}
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-[#2D3748]">
              <span aria-hidden="true">📍 </span>
              Full Address
            </h2>
            <address className="mt-2 space-y-1 text-sm not-italic leading-relaxed text-[#4A5568]">
              {addressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </address>
            {mapsAddressUrl ? (
              <a
                href={mapsAddressUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-[#E88D5B] hover:text-[#D97747]"
              >
                Open in Maps →
              </a>
            ) : null}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-[#2D3748]">
              <span aria-hidden="true">📝 </span>
              Description
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#4A5568]">
              {property.description?.trim() || 'No description provided.'}
            </p>
          </div>
        </section>
        {/* Stats row */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Price" icon="💰">
            {priceAmount ? `RM ${priceAmount}/month` : 'Not set'}
          </StatCard>
          <StatCard label="Capacity" icon="👥">
            {capacity}
          </StatCard>
          <StatCard label="Rating" icon="⭐">
            {rating} ({reviewCount} review{reviewCount === 1 ? '' : 's'})
          </StatCard>
          <StatCard label="Listed" icon="📅">
            {listedDate}
          </StatCard>
        </section>

        {/* Tabs */}
        <section className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
          <div className="flex gap-2 overflow-x-auto border-b border-[#E2E8F0] p-3">
            {TABS.map((tab) => (
              <TabButton key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </TabButton>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'overview' ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-[#2D3748]">Description</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#4A5568]">
                    {property.description?.trim() || 'No description provided for this listing.'}
                  </p>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#2D3748]">Tenant preferences</h2>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {preferences.map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-[#A0AEC0]">{label}</p>
                        <p className="mt-1 font-semibold text-[#2D3748]">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#2D3748]">Availability</h2>
                  <p className="mt-2 text-sm text-[#4A5568]">
                    Available from{' '}
                    <span className="font-semibold text-[#2D3748]">
                      {meta.availableFrom
                        ? new Date(meta.availableFrom).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'Immediately'}
                    </span>
                  </p>
                </div>
              </div>
            ) : null}

            {activeTab === 'amenities' ? (
              amenityIds.length ? (
                <div className="flex flex-wrap gap-2">
                  {amenityIds.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#F7FAFC] px-4 py-2 text-sm font-medium text-[#4A5568]"
                    >
                      <span aria-hidden="true">{AMENITY_EMOJI[id] || '✓'}</span>
                      {AMENITY_LABELS[id] || id}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#A0AEC0]">No amenities listed for this property.</p>
              )
            ) : null}

            {activeTab === 'location' ? (
              coords ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[#A0AEC0]">Full Address</p>
                    <address className="mt-2 space-y-1 text-sm not-italic leading-relaxed text-[#4A5568]">
                      {addressLines.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </address>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-[#E2E8F0]">
                    <iframe
                      title="Property location map"
                      src={googleMapsEmbedUrl(coords.lat, coords.lng)}
                      className="h-80 w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                  {mapsAddressUrl ? (
                    <a
                      href={mapsAddressUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-sm font-semibold text-[#E88D5B] hover:text-[#D97747]"
                    >
                      Open in Maps →
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-[#A0AEC0]">No map pin set for this property.</p>
              )
            ) : null}

            {activeTab === 'calendar' ? (
              <div>
                <PropertyAvailabilityCalendar status={property.status} />
              </div>
            ) : null}

            {activeTab === 'reviews' ? (
              <DetailReviewsTab propertyId={property.id} />
            ) : null}

            {activeTab === 'reports' ? <DetailReportsTab propertyId={property.id} token={token} /> : null}
          </div>
        </section>
      </div>
    </div>
  )
}
