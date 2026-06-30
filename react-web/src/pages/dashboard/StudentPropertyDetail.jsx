import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AvailabilityCalendar from '../../components/AvailabilityCalendar'
import { ReviewAggregatesPanel, ReviewCard } from '../../components/reviews/MultiCategoryReviewDisplay'
import { fetchPropertyReviews } from '../../services/reviewService'
import { useToast } from '../../context/ToastContext'
import { AMENITY_LABELS, listAmenityIds } from '../../utils/amenities'
import { canViewPropertyContactPayment } from '../../utils/applicationDisplayStatus'
import {
  earliestBookYMD,
  estimateTotalPrice,
  formatYmdForDisplay,
  leaseMonthsFromDates,
  leaseSpanDays,
  parseYMD,
  pickLeaseDates,
} from '../../utils/bookingDates'
import { formatDepositAmount, parsePropertyDeposit } from '../../utils/propertyDeposit'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import { isPropertySaved, toggleSavedProperty } from '../../utils/savedProperties'
import { listPaymentMethodLabels, paymentMethodsFromApi, formatTenantPreferenceDisplay } from './AddProperty'
import {
  formatCapacityLine,
  formatRatingScore,
  listPropertyImageUrls,
  propertyReviewCount,
} from '../../utils/propertyDisplay'

const INPUT_CLASS =
  'w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#2D3748] outline-none transition focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20'

const AMENITY_EMOJI = {
  furnished: '🛏️',
  wifi: '📶',
  aircond: '❄️',
  pet_friendly: '🐾',
  parking: '🅿️',
  utilities: '💡',
  water_heater: '🛁',
  pool: '🏊',
  gym: '💪',
  security: '🔐',
  tv: '📺',
  power_backup: '🔌',
  washing: '🧺',
  kitchen: '🍽️',
  private_bathroom: '🚪',
  garden: '🌿',
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

function googleMapsAddressLink(property) {
  const query = formatAddressLines(property).join(', ')
  if (!query.trim()) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function googleMapsEmbedUrl(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`
}

function getStatusConfig(status) {
  const s = String(status || 'available').toLowerCase()
  if (s === 'rented' || s === 'booked' || s === 'occupied') {
    return { label: 'OCCUPIED', badgeClass: 'bg-red-100 text-red-800' }
  }
  if (s === 'pending' || s === 'maintenance') {
    return { label: s === 'maintenance' ? 'MAINTENANCE' : 'PENDING', badgeClass: 'bg-yellow-100 text-yellow-800' }
  }
  return { label: 'AVAILABLE', badgeClass: 'bg-green-100 text-green-800' }
}

function formatPriceAmount(price) {
  const n = Number(price)
  if (!Number.isFinite(n) || n <= 0) return null
  return n.toLocaleString('en-MY', { maximumFractionDigits: 0 })
}

function whatsAppLink(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return null
  const normalized = digits.startsWith('0') ? `6${digits}` : digits
  return `https://wa.me/${normalized}`
}

function PageSection({ title, icon, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm ${className}`}>
      <h2 className="mb-4 text-lg font-bold text-[#2D3748]">
        {icon ? <span aria-hidden="true">{icon} </span> : null}
        {title}
      </h2>
      {children}
    </section>
  )
}

function StatTile({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">{label}</p>
      <p className="mt-2 text-base font-bold text-[#2D3748]">
        <span aria-hidden="true">{icon} </span>
        {value}
      </p>
    </div>
  )
}

function AmenityScrollRow({ amenityIds }) {
  const scrollRef = useRef(null)

  const scrollBy = useCallback((delta) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' })
  }, [])

  if (!amenityIds.length) {
    return <p className="text-sm text-[#A0AEC0]">No amenities listed for this property.</p>
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => scrollBy(-220)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-sm text-[#2D3748] shadow-md transition hover:bg-gray-50"
        aria-label="Scroll amenities left"
      >
        ◀
      </button>
      <div
        ref={scrollRef}
        className="flex min-w-0 flex-1 gap-2 overflow-x-auto scroll-smooth py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {amenityIds.map((id) => (
          <span
            key={id}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700"
          >
            <span aria-hidden="true">{AMENITY_EMOJI[id] || '✓'}</span>
            {AMENITY_LABELS[id] || id}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => scrollBy(220)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-sm text-[#2D3748] shadow-md transition hover:bg-gray-50"
        aria-label="Scroll amenities right"
      >
        ▶
      </button>
    </div>
  )
}

function StudentReviewsBlock({ propertyId, averageRating, reviewCount, onRefresh }) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [aggregates, setAggregates] = useState(null)

  const load = useCallback(async () => {
    if (!propertyId) return
    setLoading(true)
    try {
      const data = await fetchPropertyReviews(propertyId)
      setItems(Array.isArray(data.items) ? data.items : [])
      setAggregates(data.aggregates || null)
    } catch {
      setItems([])
      setAggregates(null)
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => {
    load()
  }, [load, onRefresh])

  const score = aggregates?.ratingOverall ?? averageRating ?? '0.0'
  const count = aggregates?.totalReviews ?? reviewCount ?? 0

  return (
    <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-bold text-[#2D3748]">
          <span aria-hidden="true">⭐ </span>
          Reviews
        </h2>
        <p className="text-sm text-[#718096]">
          {Number(score).toFixed(1)} average · {count} review{count === 1 ? '' : 's'}
        </p>
      </div>

      {loading ? <p className="text-sm text-[#A0AEC0]">Loading reviews…</p> : null}

      {!loading ? <ReviewAggregatesPanel aggregates={aggregates} title="Reviews & Ratings" /> : null}

      {!loading && items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#E2E8F0] bg-[#FAFAFA] px-4 py-8 text-center text-sm text-[#A0AEC0]">
          No reviews yet
        </p>
      ) : null}

      {!loading && items.length > 0 ? (
        <ul className="space-y-4">
          {items.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function SubmitApplicationSection({
  sectionRef,
  property,
  viewerUser,
  viewerLoaded,
  moveIn,
  moveOut,
  onMoveInChange,
  onMoveOutChange,
  onSubmit,
  submitting,
}) {
  const durationDays = useMemo(() => leaseSpanDays(moveIn, moveOut), [moveIn, moveOut])
  const estimatedRentTotal = useMemo(
    () => estimateTotalPrice(property?.price, moveIn, moveOut),
    [property?.price, moveIn, moveOut],
  )
  const depositAmount = useMemo(() => parsePropertyDeposit(property), [property])
  const earliest = earliestBookYMD()
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('mysewa_token')
  const isStudent = viewerUser && String(viewerUser.role || '').toLowerCase() === 'student'
  const isAvailable = !['rented', 'booked', 'occupied'].includes(
    String(property?.status || 'available').toLowerCase(),
  )

  return (
    <section
      ref={sectionRef}
      id="apply-section"
      className="rounded-xl border border-[#E88D5B]/40 bg-[#FFF8F3] p-6 shadow-sm"
    >
      <h2 className="mb-4 text-lg font-bold text-[#2D3748]">
        <span aria-hidden="true">📩 </span>
        Submit Application
      </h2>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-[#4A5568]">Move-in Date</span>
            <input
              type="date"
              min={earliest}
              value={moveIn}
              onChange={(e) => onMoveInChange(e.target.value)}
              className={INPUT_CLASS}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-[#4A5568]">Move-out Date</span>
            <input
              type="date"
              min={moveIn || earliest}
              value={moveOut}
              onChange={(e) => onMoveOutChange(e.target.value)}
              className={INPUT_CLASS}
              required
            />
          </label>
        </div>

        <div className="rounded-lg border border-[#E88D5B]/25 bg-white px-4 py-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">Date selection summary</p>
          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-[#A0AEC0]">Move-in</dt>
              <dd className="font-semibold text-[#2D3748]">
                {moveIn ? formatYmdForDisplay(moveIn) : 'Pick on calendar above'}
              </dd>
            </div>
            <div>
              <dt className="text-[#A0AEC0]">Move-out</dt>
              <dd className="font-semibold text-[#2D3748]">
                {moveOut ? formatYmdForDisplay(moveOut) : 'Pick on calendar above'}
              </dd>
            </div>
            <div>
              <dt className="text-[#A0AEC0]">Duration</dt>
              <dd className="font-semibold text-[#2D3748]">
                {durationDays != null && durationDays > 0 ? `${durationDays} days` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[#A0AEC0]">Est. rent total</dt>
              <dd className="font-semibold text-[#2D3748]">
                {estimatedRentTotal != null ? formatDepositAmount(estimatedRentTotal) : '—'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[#A0AEC0]">Security deposit (after approval)</dt>
              <dd className="font-semibold text-[#2D3748]">
                {depositAmount != null ? formatDepositAmount(depositAmount) : '—'}
              </dd>
            </div>
          </dl>
        </div>

        {!viewerLoaded ? (
          <p className="rounded-lg bg-white px-4 py-3 text-sm text-[#A0AEC0]">Checking your sign-in…</p>
        ) : !hasToken ? (
          <p className="rounded-lg border border-[#E88D5B]/30 bg-white px-4 py-3 text-sm text-[#2D3748]">
            <Link to="/signin" className="font-semibold text-[#E88D5B] underline">
              Sign in
            </Link>{' '}
            as a student to submit an application.
          </p>
        ) : !isStudent ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Only student accounts can apply.
          </p>
        ) : !isAvailable ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            This property is currently occupied and not accepting applications.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || !isStudent || !isAvailable}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E88D5B] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#D97747] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden="true">📩</span>
          {submitting ? 'Submitting…' : 'Submit Application'}
        </button>

        <p className="text-center text-xs text-[#A0AEC0]">
          Move-in must be on or after {formatYmdForDisplay(earliest)}. Use the calendar to pick your dates.
        </p>
      </form>
    </section>
  )
}

export default function StudentPropertyDetail({
  property,
  viewerUser,
  viewerLoaded,
  onSubmitApplication,
  submitting,
  reviewRefreshKey = 0,
}) {
  const { pushToast } = useToast()
  const applyRef = useRef(null)
  const [lightboxSrc, setLightboxSrc] = useState('')
  const [moveIn, setMoveIn] = useState('')
  const [moveOut, setMoveOut] = useState('')
  const [saved, setSaved] = useState(false)
  const [savedTick, setSavedTick] = useState(0)
  const [propertyApplication, setPropertyApplication] = useState(null)
  const [applicationLoaded, setApplicationLoaded] = useState(false)

  useEffect(() => {
    setMoveIn('')
    setMoveOut('')
  }, [property?.id])

  useEffect(() => {
    if (!viewerUser?.id || property?.id == null) {
      setSaved(false)
      return
    }
    setSaved(isPropertySaved(viewerUser.id, property.id))
  }, [viewerUser?.id, property?.id, savedTick])

  useEffect(() => {
    const token = localStorage.getItem('mysewa_token')
    const isStudent = viewerUser && String(viewerUser.role || '').toLowerCase() === 'student'
    if (!viewerLoaded || !isStudent || !token || property?.id == null) {
      setPropertyApplication(null)
      setApplicationLoaded(true)
      return
    }

    let cancelled = false
    setApplicationLoaded(false)

    async function loadApplication() {
      try {
        const res = await fetch('/api/v1/applications/for-student', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        const items = res.ok && Array.isArray(data.items) ? data.items : []
        const match = items.find((a) => Number(a.propertyId) === Number(property.id)) || null
        setPropertyApplication(match)
      } catch {
        if (!cancelled) setPropertyApplication(null)
      } finally {
        if (!cancelled) setApplicationLoaded(true)
      }
    }

    loadApplication()
    return () => {
      cancelled = true
    }
  }, [viewerLoaded, viewerUser, property?.id, reviewRefreshKey])

  const images = useMemo(() => listPropertyImageUrls(property), [property])
  const status = getStatusConfig(property?.status)
  const priceAmount = formatPriceAmount(property?.price)
  const addressLines = formatAddressLines(property)
  const mapsAddressUrl = googleMapsAddressLink(property)
  const amenityIds = listAmenityIds(property?.amenities)
  const lat = Number(property?.latitude)
  const lng = Number(property?.longitude)
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng)

  const preferences = [
    ['Gender', formatTenantPreferenceDisplay(property?.gender)],
    ['Religion', formatTenantPreferenceDisplay(property?.religion)],
    ['Race', formatTenantPreferenceDisplay(property?.race)],
    [
      'Married Students',
      property?.acceptsMarriedHousehold
        ? '✅ Accepts Married Students'
        : '❌ Does not accept married students',
    ],
  ]

  const ratingScore = formatRatingScore(property)
  const reviewCount = propertyReviewCount(property)
  const paymentMethodLabels = listPaymentMethodLabels(property?.paymentMethods)
  const paymentMethodsSelected = paymentMethodsFromApi(property?.paymentMethods)
  const depositDisplay = formatDepositAmount(parsePropertyDeposit(property))

  const showContactPayment =
    viewerLoaded &&
    viewerUser &&
    String(viewerUser.role || '').toLowerCase() === 'student' &&
    applicationLoaded &&
    canViewPropertyContactPayment(propertyApplication)

  const isAvailable = !['rented', 'booked', 'occupied'].includes(
    String(property?.status || 'available').toLowerCase(),
  )

  function handleToggleSave() {
    if (!viewerUser?.id) {
      pushToast({ message: 'Sign in to save properties to your wishlist.', type: 'info' })
      return
    }
    const wasSaved = isPropertySaved(viewerUser.id, property.id)
    const thumb = images[0] || ''
    toggleSavedProperty(viewerUser.id, {
      id: property.id,
      name: property.name,
      price: property.price,
      address: addressLines.join(', '),
      image: thumb,
      rating: property.averageRating,
    })
    setSavedTick((n) => n + 1)
    pushToast({
      message: wasSaved ? 'Removed from saved properties.' : 'Saved to your wishlist.',
      type: 'success',
    })
  }

  function scrollToApply() {
    applyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleMessageLandlord() {
    const wa = whatsAppLink(property?.contactPhone)
    if (wa) {
      window.open(wa, '_blank', 'noopener,noreferrer')
      return
    }
    if (property?.contactPhone) {
      window.location.href = `tel:${property.contactPhone}`
      return
    }
    if (property?.contactEmail) {
      window.location.href = `mailto:${property.contactEmail}`
    }
  }

  const shortLocation =
    [property?.city, property?.state].filter(Boolean).join(', ') ||
    addressLines[0] ||
    'Terengganu, Malaysia'

  function handleCalendarPick(ymd) {
    const next = pickLeaseDates(moveIn, moveOut, ymd)
    setMoveIn(next.moveIn)
    setMoveOut(next.moveOut)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!onSubmitApplication) return

    const earliest = earliestBookYMD()
    if (!moveIn || parseYMD(moveIn) < parseYMD(earliest)) return
    if (!moveOut) return
    const days = leaseSpanDays(moveIn, moveOut)
    if (days == null || days < 1) return
    const leaseMonths = leaseMonthsFromDates(moveIn, moveOut)
    if (leaseMonths == null) return

    await onSubmitApplication({
      preferredMoveIn: moveIn,
      leaseEndDate: moveOut,
      leaseMonths,
    })
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-[#2D3748]">
      {lightboxSrc ? <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc('')} /> : null}

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <Link
          to="/properties"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#6C2BD9] transition hover:text-[#5521B5]"
        >
          ← Back to search
        </Link>

        {/* 1. Header */}
        <header className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-[#2D3748] sm:text-3xl">
                {property?.name || 'Property'}
              </h1>
              <p className="mt-2 flex items-start gap-2 text-sm text-[#4A5568]">
                <span aria-hidden="true">📍</span>
                <span>{shortLocation}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {property?.type ? (
                <span className="rounded-full bg-[#F3F0FF] px-3 py-1 text-xs font-semibold text-[#6C2BD9] ring-1 ring-[#E2E8F0]">
                  {property.type}
                </span>
              ) : null}
              <span className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${status.badgeClass}`}>
                {status.label}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-[#E2E8F0] pt-4">
            <button
              type="button"
              onClick={handleToggleSave}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#2D3748] transition hover:bg-[#F7FAFC]"
            >
              <span aria-hidden="true">{saved ? '❤️' : '🤍'}</span>
              {saved ? 'Saved' : 'Save Property'}
            </button>
            {isAvailable ? (
              <button
                type="button"
                onClick={scrollToApply}
                className="inline-flex items-center gap-2 rounded-lg bg-[#E88D5B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#D97747]"
              >
                <span aria-hidden="true">📩</span>
                Apply Now
              </button>
            ) : null}
            {showContactPayment ? (
              <button
                type="button"
                onClick={handleMessageLandlord}
                className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#2D3748] transition hover:bg-[#F7FAFC]"
              >
                <span aria-hidden="true">💬</span>
                Message Landlord
              </button>
            ) : null}
          </div>
        </header>

        {/* Image gallery */}
        <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
          {images.length ? (
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-1 lg:grid-cols-3">
              {images.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  onClick={() => setLightboxSrc(src)}
                  className="group relative aspect-[4/3] overflow-hidden bg-[#E2E8F0] text-left"
                  aria-label={`View image ${index + 1} of ${images.length}`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex aspect-[16/9] items-center justify-center text-sm text-[#A0AEC0]">
              No photos available
            </div>
          )}
        </section>

        {/* 2. Stats row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile
            icon="💰"
            label="Price"
            value={priceAmount ? `RM ${priceAmount}/month` : 'Not set'}
          />
          <StatTile icon="👥" label="Capacity" value={formatCapacityLine(property)} />
          <StatTile
            icon="⭐"
            label="Rating"
            value={`${ratingScore} (${reviewCount} review${reviewCount === 1 ? '' : 's'})`}
          />
        </div>

        {/* 3. Description */}
        <PageSection title="Description" icon="📝">
          <p className="text-sm leading-relaxed text-[#4A5568]">
            {property?.description?.trim() ||
              'No description provided yet. Apply to learn more about this listing.'}
          </p>
          {mapsAddressUrl ? (
            <a
              href={mapsAddressUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm font-semibold text-[#6C2BD9] hover:text-[#5521B5]"
            >
              Open full address in Maps →
            </a>
          ) : null}
        </PageSection>

        {/* 4. Amenities */}
        <PageSection title="Amenities" icon="🏠">
          <AmenityScrollRow amenityIds={amenityIds} />
        </PageSection>

        {/* 5. Tenant preferences */}
        <PageSection title="Tenant Preferences" icon="👤">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {preferences.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#A0AEC0]">{label}</p>
                <p className="mt-1 text-sm font-semibold text-[#2D3748]">{value}</p>
              </div>
            ))}
          </div>
        </PageSection>

        {/* Contact & payment (approved bookings only) */}
        {showContactPayment && (property?.contactPhone || property?.contactEmail) ? (
          <PageSection title="Contact" icon="📞">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {property?.contactPhone ? (
                <div className="rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">Phone</p>
                  <a href={`tel:${property.contactPhone}`} className="mt-1 block text-sm font-semibold text-[#2D3748] hover:text-[#6C2BD9]">
                    {property.contactPhone}
                  </a>
                </div>
              ) : null}
              {property?.contactEmail ? (
                <div className="rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">Email</p>
                  <a href={`mailto:${property.contactEmail}`} className="mt-1 block break-all text-sm font-semibold text-[#2D3748] hover:text-[#6C2BD9]">
                    {property.contactEmail}
                  </a>
                </div>
              ) : null}
              {property?.contactPhone ? (
                <div className="rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">WhatsApp</p>
                  <a
                    href={whatsAppLink(property.contactPhone) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-sm font-semibold text-[#2D3748] hover:text-[#6C2BD9]"
                  >
                    {property.contactPhone}
                  </a>
                </div>
              ) : null}
            </div>
          </PageSection>
        ) : null}

        {showContactPayment ? (
          <PageSection title="Payment" icon="💳">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">Deposit</p>
                <p className="mt-1 text-sm font-semibold text-[#2D3748]">{depositDisplay}</p>
              </div>
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">Payment due</p>
                <p className="mt-1 text-sm font-semibold text-[#2D3748]">
                  {property?.paymentDueDate || '1st of every month'}
                </p>
              </div>
            </div>
            {paymentMethodLabels.length ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">
                  Accepted payment methods
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {paymentMethodLabels.map((label) => (
                    <li
                      key={label}
                      className="rounded-full bg-[#F3F0FF] px-3 py-1.5 text-sm font-medium text-[#6C2BD9] ring-1 ring-[#E2E8F0]"
                    >
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {paymentMethodsSelected.online_banking && (property?.bankName || property?.accountNumber) ? (
              <div className="mt-4 rounded-lg bg-[#F7FAFC] px-4 py-3 text-sm text-[#4A5568]">
                {property?.bankName ? (
                  <p>
                    <span className="font-semibold text-[#2D3748]">Bank: </span>
                    {property.bankName}
                  </p>
                ) : null}
                {property?.accountNumber ? (
                  <p className="mt-1">
                    <span className="font-semibold text-[#2D3748]">Account: </span>
                    {property.accountNumber}
                  </p>
                ) : null}
                {property?.accountHolder ? (
                  <p className="mt-1">
                    <span className="font-semibold text-[#2D3748]">Account name: </span>
                    {property.accountHolder}
                  </p>
                ) : null}
              </div>
            ) : null}
            {paymentMethodsSelected.duitnow_qr && property?.qrCodeUrl ? (
              <img
                src={resolveMediaUrl(property.qrCodeUrl)}
                alt="DuitNow QR code"
                className="mt-4 h-40 w-40 rounded-lg border border-[#E2E8F0] bg-white object-contain p-2"
              />
            ) : null}
          </PageSection>
        ) : null}

        {/* 6. Availability calendar */}
        <section aria-labelledby="availability-calendar-heading">
          <h2 id="availability-calendar-heading" className="mb-4 text-lg font-bold text-[#2D3748]">
            <span aria-hidden="true">📅 </span>
            Availability Calendar
          </h2>
          <AvailabilityCalendar
            propertyId={property?.id}
            viewMode="student"
            status={property?.status}
            onDaySelect={handleCalendarPick}
            moveInYmd={moveIn}
            moveOutYmd={moveOut}
            hideFooterNote
          />
        </section>

        {/* 7. Submit application */}
        <SubmitApplicationSection
          sectionRef={applyRef}
          property={property}
          viewerUser={viewerUser}
          viewerLoaded={viewerLoaded}
          moveIn={moveIn}
          moveOut={moveOut}
          onMoveInChange={setMoveIn}
          onMoveOutChange={setMoveOut}
          onSubmit={handleSubmit}
          submitting={submitting}
        />

        {/* 8. Reviews */}
        <StudentReviewsBlock
          propertyId={property?.id}
          averageRating={ratingScore}
          reviewCount={reviewCount}
          onRefresh={reviewRefreshKey}
        />

        {hasCoords ? (
          <PageSection title="Location" icon="🗺️">
            <div className="overflow-hidden rounded-xl border border-[#E2E8F0]">
              <iframe
                title="Property location map"
                src={googleMapsEmbedUrl(lat, lng)}
                className="h-64 w-full border-0 sm:h-72"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </PageSection>
        ) : null}
      </div>
    </div>
  )
}
