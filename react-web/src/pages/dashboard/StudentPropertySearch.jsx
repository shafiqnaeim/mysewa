import { useState } from 'react'
import { PropertyCardSkeleton } from '../../components/errors/LoadingSkeleton'
import { AMENITY_LABELS } from '../../utils/amenities'

const PAGE_SIZE = 6

export const EMPTY_FILTERS = {
  keyword: '',
  minPrice: '',
  maxPrice: '',
  propertyType: '',
  campus: '',
  status: '',
  religion: '',
  gender: '',
  race: '',
}
const KEYWORD_INPUT_CLASS =
  'w-full rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm text-[#2D3748] outline-none transition placeholder:text-[#A0AEC0] focus:border-[#E88D5B] focus:ring-2 focus:ring-[#E88D5B]/20'

const INPUT_CLASS =
  'mt-1.5 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#2D3748] outline-none transition placeholder:text-[#A0AEC0] focus:border-[#E88D5B] focus:ring-2 focus:ring-[#E88D5B]/20'

const LABEL_CLASS = 'block text-xs font-medium text-[#4A5568]'
export const DUMMY_PROPERTIES = [
  {
    id: 'demo-casa',
    name: 'Casa Apartment',
    price: 1500,
    address: 'Jalan Universiti, Section 12',
    location: 'Gong Badak, Kuala Terengganu',
    shortAddress: 'Kuala Terengganu',
    distanceMins: 5,
    rating: 4.8,
    reviewCount: 12,
    type: 'apartment',
    capacity: 4,
    status: 'available',
    campus: 'UMT',
    gender: 'mixed',
    religion: 'islam',
    race: 'malay',
    amenities: ['wifi', 'furnished', 'parking'],
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'demo-studio',
    name: 'Studio Room',
    price: 800,
    address: 'Kampung Gong Badak, Kuala Nerus',
    location: 'Kuala Nerus',
    shortAddress: 'Kuala Nerus',
    distanceMins: 10,
    rating: 4.5,
    reviewCount: 6,
    type: 'studio',
    capacity: 1,
    status: 'available',
    campus: 'UMT',
    gender: 'female',
    religion: 'islam',
    race: 'chinese',
    amenities: ['wifi', 'furnished', 'aircond'],
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'demo-green',
    name: 'Green Villa',
    price: 2000,
    address: 'Jalan Sultan Mahmud, Kuala Terengganu',
    location: 'Kuala Terengganu',
    shortAddress: 'Kuala Terengganu',
    distanceMins: 3,
    rating: 5.0,
    reviewCount: 24,
    type: 'house',
    capacity: 8,
    status: 'rented',
    campus: 'UniSZA',
    gender: 'male',
    religion: 'buddhism',
    race: 'indian',
    amenities: ['wifi', 'parking', 'aircond'],
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'demo-sunset',
    name: 'Sunset Apartment',
    price: 1200,
    address: 'Persiaran UMT, Gong Badak',
    location: 'Gong Badak',
    shortAddress: 'Gong Badak',
    distanceMins: 8,
    rating: 4.2,
    reviewCount: 3,
    type: 'apartment',
    capacity: 3,
    status: 'available',
    campus: 'UMT',
    amenities: ['wifi', 'parking', 'washing'],
    image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'demo-blue',
    name: 'Blue House',
    price: 900,
    address: 'Lorong Batu Buruk, Kuala Terengganu',
    location: 'Kuala Terengganu',
    shortAddress: 'Kuala Terengganu',
    distanceMins: 15,
    rating: 4.0,
    reviewCount: 0,
    type: 'house',
    capacity: 6,
    status: 'available',
    campus: 'IPGM',
    amenities: ['wifi', 'kitchen', 'fridge'],
    image: 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'demo-garden',
    name: 'Garden Home',
    price: 1800,
    address: 'Taman Universiti, Kuala Nerus',
    location: 'Kuala Nerus',
    shortAddress: 'Kuala Nerus',
    distanceMins: 6,
    rating: 4.7,
    reviewCount: 9,
    type: 'house',
    capacity: 5,
    status: 'available',
    campus: 'ILPKT',
    amenities: ['wifi', 'parking', 'furnished'],
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
  },
]

export { PAGE_SIZE }

function formatPrice(price) {
  const n = Number(price)
  if (!Number.isFinite(n) || n <= 0) return 'RM —'
  return `RM ${n.toLocaleString('en-MY')}`
}

function amenityLabel(id) {
  if (id === 'wifi') return 'WiFi'
  if (id === 'aircond') return 'AC'
  const label = AMENITY_LABELS[id] || id
  if (label === 'Wi-Fi') return 'WiFi'
  if (label === 'Furnished') return 'Furnished'
  if (label === 'Parking') return 'Parking'
  return label.length > 14 ? `${label.slice(0, 12)}…` : label
}

function getAvailabilityBadge(status) {
  const s = String(status || 'available').toLowerCase()
  if (s === 'rented' || s === 'booked' || s === 'occupied' || s === 'maintenance') {
    return { label: 'OCCUPIED', className: 'bg-blue-600 text-white' }
  }
  return { label: 'AVAILABLE', className: 'bg-[#48BB78] text-white' }
}

function StudentPropertyCard({ property, saved, onViewDetails, onToggleSave }) {
  const badge = getAvailabilityBadge(property.status)
  const rating = Number(property.rating) || 0
  const reviewCount = Number(property.reviewCount) || 0
  const capacity = Number(property.capacity) > 0 ? Number(property.capacity) : 1

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md">
      <div className="relative overflow-hidden">
        <img
          src={property.image}
          alt=""
          className="h-48 w-full rounded-t-xl object-cover transition duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
        <span
          className={`absolute right-3 top-3 rounded-md px-2.5 py-1 text-[10px] font-bold tracking-wide shadow-sm ${badge.className}`}
        >
          {badge.label}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleSave?.(property)
          }}
          className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-base shadow-sm transition hover:scale-110"
          aria-label={saved ? 'Remove from saved' : 'Save property'}
        >
          {saved ? '❤️' : '🤍'}
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-lg font-bold text-[#2D3748]">{property.name}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {property.location || property.shortAddress || property.address}
        </p>

        <p className="mt-2 text-xl font-bold text-[#E88D5B]">{formatPrice(property.price)}</p>

        <p className="mt-2 text-sm text-[#4A5568]">
          <span aria-hidden="true">⭐ </span>
          {rating.toFixed(1)} ({reviewCount} review{reviewCount === 1 ? '' : 's'})
        </p>

        <p className="mt-1 text-sm text-[#4A5568]">
          <span aria-hidden="true">🚶 </span>
          {property.distanceMins} mins to campus
        </p>

        <p className="mt-1 text-sm text-[#4A5568]">
          <span aria-hidden="true">👥 </span>
          {capacity} {capacity === 1 ? 'person' : 'persons'}
        </p>

        {property.amenities?.length ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {property.amenities.slice(0, 3).map((id) => (
              <li
                key={id}
                className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-[#4A5568]"
              >
                {amenityLabel(id)}
              </li>
            ))}
          </ul>
        ) : null}

        <button
          type="button"
          onClick={() => onViewDetails(property)}
          className="mt-auto pt-4 text-left text-sm font-medium text-[#E88D5B] transition hover:underline"
        >
          View Details →
        </button>
      </div>
    </article>
  )
}

function getVisiblePages(current, total) {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages = new Set([1, total, current, current - 1, current + 1])
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
}

function Pagination({ page, totalPages, totalAvailable, rangeStart, rangeEnd, onPageChange }) {
  const pages = getVisiblePages(page, totalPages)

  return (
    <div className="mt-10 space-y-4">
      <p className="text-center text-sm text-[#A0AEC0]">
        {totalAvailable === 0
          ? 'Showing 0 results'
          : `Showing ${rangeStart}-${rangeEnd} of ${totalAvailable} results`}
      </p>
      {totalPages > 1 ? (
        <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#4A5568] transition hover:bg-[#F7FAFC] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          {pages.map((p, index) => {
            const prev = pages[index - 1]
            const showEllipsis = prev != null && p - prev > 1
            return (
              <span key={p} className="inline-flex items-center gap-2">
                {showEllipsis ? <span className="px-1 text-[#A0AEC0]">…</span> : null}
                <button
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`min-w-10 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    p === page
                      ? 'bg-[#2D3748] text-white shadow-sm'
                      : 'border border-[#E2E8F0] bg-white text-[#4A5568] hover:bg-[#F7FAFC]'
                  }`}
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </button>
              </span>
            )
          })}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#4A5568] transition hover:bg-[#F7FAFC] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      ) : null}
    </div>
  )
}

function SearchBar({ filters, onFiltersChange, onSearch, onClearFilters }) {
  const [filtersOpen, setFiltersOpen] = useState(true)

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm" aria-label="Search filters">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Location, university, property name..."
          value={filters.keyword}
          onChange={(e) => onFiltersChange({ ...filters, keyword: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearch?.()
          }}
          className={KEYWORD_INPUT_CLASS}
          aria-label="Search keyword"
        />

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={onSearch}
            className="inline-flex items-center gap-2 rounded-full bg-[#E88D5B] px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d67a4a]"
          >
            <span aria-hidden="true">🔍</span>
            Search
          </button>
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className="whitespace-nowrap text-sm font-medium text-[#E88D5B] transition hover:underline"
            aria-expanded={filtersOpen}
          >
            {filtersOpen ? 'Hide filters' : 'Show filters'}
          </button>
        </div>
      </div>

      {filtersOpen ? (
        <div className="mt-4 border-t border-[#E2E8F0] pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className={LABEL_CLASS}>
              Property Type
              <select
                value={filters.propertyType}
                onChange={(e) => onFiltersChange({ ...filters, propertyType: e.target.value })}
                className={INPUT_CLASS}
              >
                <option value="">All</option>
                <option value="house">House</option>
                <option value="apartment">Apartment</option>
                <option value="studio">Studio</option>
                <option value="room">Room</option>
              </select>
            </label>

            <label className={LABEL_CLASS}>
              Nearest Campus
              <select
                value={filters.campus}
                onChange={(e) => onFiltersChange({ ...filters, campus: e.target.value })}
                className={INPUT_CLASS}
              >
                <option value="">All</option>
                <option value="UMT">UMT</option>
                <option value="UniSZA">UniSZA</option>
                <option value="IPGM">IPGM</option>
                <option value="ILPKT">ILPKT</option>
              </select>
            </label>

            <label className={LABEL_CLASS}>
              Status
              <select
                value={filters.status}
                onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
                className={INPUT_CLASS}
              >
                <option value="">All</option>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
              </select>
            </label>

            <label className={LABEL_CLASS}>
              Min Price
              <input
                type="number"
                min="0"
                placeholder="e.g. 300"
                value={filters.minPrice}
                onChange={(e) => onFiltersChange({ ...filters, minPrice: e.target.value })}
                className={INPUT_CLASS}
              />
            </label>

            <label className={LABEL_CLASS}>
              Max Price
              <input
                type="number"
                min="0"
                placeholder="e.g. 1800"
                value={filters.maxPrice}
                onChange={(e) => onFiltersChange({ ...filters, maxPrice: e.target.value })}
                className={INPUT_CLASS}
              />
            </label>

            <label className={LABEL_CLASS}>
              Religion Preference
              <select
                value={filters.religion}
                onChange={(e) => onFiltersChange({ ...filters, religion: e.target.value })}
                className={INPUT_CLASS}
              >
                <option value="">All</option>
                <option value="muslim">Muslim</option>
                <option value="non-muslim">Non-Muslim</option>
              </select>
            </label>

            <label className={LABEL_CLASS}>
              Gender Preference
              <select
                value={filters.gender}
                onChange={(e) => onFiltersChange({ ...filters, gender: e.target.value })}
                className={INPUT_CLASS}
              >
                <option value="">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>

            <label className={LABEL_CLASS}>
              Race Preference
              <select
                value={filters.race}
                onChange={(e) => onFiltersChange({ ...filters, race: e.target.value })}
                className={INPUT_CLASS}
              >
                <option value="">All</option>
                <option value="malay">Malay</option>
                <option value="chinese">Chinese</option>
                <option value="indian">Indian</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 text-sm font-medium text-[#E88D5B] transition hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : null}
    </section>
  )
}
export default function StudentPropertySearch({
  properties = [],
  totalAvailable = 0,
  rangeStart = 0,
  rangeEnd = 0,
  loading = false,
  error = '',
  filters = EMPTY_FILTERS,
  onFiltersChange,
  onSearch,
  onClearFilters,
  page = 1,
  totalPages = 1,
  onPageChange,
  onViewDetails,
  savedIds = new Set(),
  onToggleSave,
}) {
  return (
    <div className="min-h-screen w-full bg-[#F7FAFC] font-sans text-[#2D3748]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-3xl font-bold text-[#2D3748]">
            <span aria-hidden="true">🔍 </span>
            Find Your Student Home
          </h1>
          <p className="mt-2 text-sm text-gray-500">Browse verified listings near your campus</p>
          <p className="mt-2 text-sm font-medium text-[#E88D5B]">
            {loading
              ? 'Loading properties…'
              : `${totalAvailable} propert${totalAvailable === 1 ? 'y' : 'ies'} available`}
          </p>
        </header>

        <SearchBar
          filters={filters}
          onFiltersChange={onFiltersChange}
          onSearch={onSearch}
          onClearFilters={onClearFilters}
        />

        {error ? (
          <div
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {loading ? (
          <section
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            aria-busy="true"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <PropertyCardSkeleton key={i} />
            ))}
          </section>
        ) : properties.length === 0 ? (
          <div className="rounded-xl bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-5xl" aria-hidden="true">
              🏠
            </p>
            <h2 className="mt-4 text-lg font-bold text-[#2D3748]">No properties found</h2>
            <p className="mt-2 text-sm text-gray-500">Try adjusting your filters</p>
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-6 rounded-full border border-[#E2E8F0] bg-white px-6 py-2 text-sm font-semibold text-[#2D3748] transition hover:bg-[#F7FAFC]"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <StudentPropertyCard
                key={property.id}
                property={property}
                saved={savedIds.has(String(property.id))}
                onViewDetails={onViewDetails}
                onToggleSave={onToggleSave}
              />
            ))}
          </section>
        )}

        {!loading ? (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalAvailable={totalAvailable}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onPageChange={onPageChange}
          />
        ) : null}
      </div>
    </div>
  )
}
