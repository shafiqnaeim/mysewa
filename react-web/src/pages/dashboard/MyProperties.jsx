import { useMemo } from 'react'
import PropertyCard from '../../components/PropertyCard'

function IconPlus({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function EmptyIllustration() {
  return (
    <svg className="mx-auto h-24 w-24 text-[#E2E8F0]" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <rect x="20" y="40" width="80" height="60" rx="6" stroke="currentColor" strokeWidth="3" />
      <path d="M20 52h80" stroke="currentColor" strokeWidth="3" />
      <rect x="32" y="62" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2.5" />
      <rect x="56" y="62" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2.5" />
      <path d="M60 40L40 24h40l-20 16Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  )
}

function isOccupied(status) {
  const s = String(status || '').toLowerCase()
  return s === 'rented' || s === 'booked'
}

function isAvailable(status) {
  const s = String(status || 'available').toLowerCase()
  return s === 'available'
}

function computeStats(properties) {
  const list = Array.isArray(properties) ? properties : []
  const total = list.length
  const available = list.filter((p) => isAvailable(p.status)).length
  const occupied = list.filter((p) => isOccupied(p.status)).length
  const revenue = list
    .filter((p) => isOccupied(p.status))
    .reduce((sum, p) => sum + (Number(p.price) || 0), 0)

  return { total, available, occupied, revenue }
}

function formatRevenue(amount) {
  return `RM ${amount.toLocaleString('en-MY', { maximumFractionDigits: 0 })}`
}

const STAT_CARDS = [
  { key: 'total', label: 'Total Properties', border: 'border-l-[#E88D5B]' },
  { key: 'available', label: 'Available', border: 'border-l-[#48BB78]' },
  { key: 'occupied', label: 'Occupied', border: 'border-l-[#3182CE]' },
  { key: 'revenue', label: 'Total Revenue', border: 'border-l-[#ED8936]' },
]

export default function MyProperties({
  properties = [],
  loading = false,
  onAdd,
  onView,
  onEdit,
  onDelete,
}) {
  const stats = useMemo(() => computeStats(properties), [properties])

  const statValues = {
    total: String(stats.total),
    available: String(stats.available),
    occupied: String(stats.occupied),
    revenue: formatRevenue(stats.revenue),
  }

  return (
    <div className="min-h-[calc(100vh-4.5rem)] w-full bg-[#FAFAFA] font-sans text-[#2D3748]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2D3748]">My Properties</h1>
            <p className="mt-1 text-sm text-[#A0AEC0]">Manage all your rental properties</p>
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-full bg-[#E88D5B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d97a48]"
          >
            <IconPlus />
            Add New Property
          </button>
        </header>

        {/* Statistics */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_CARDS.map((card) => (
            <article
              key={card.key}
              className={`rounded-xl border border-[#E2E8F0] border-l-4 bg-white p-6 shadow-sm transition hover:shadow-md ${card.border}`}
            >
              <p className="text-sm text-[#A0AEC0]">{card.label}</p>
              <p className="mt-2 text-2xl font-bold text-[#2D3748]">{statValues[card.key]}</p>
            </article>
          ))}
        </section>

        {/* Property list */}
        <section>
          {loading ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-12 text-center shadow-sm">
              <p className="text-sm text-[#A0AEC0]">Loading your properties…</p>
            </div>
          ) : properties.length === 0 ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-12 text-center shadow-sm">
              <EmptyIllustration />
              <h2 className="mt-6 text-lg font-semibold text-[#2D3748]">No properties yet</h2>
              <p className="mt-2 text-sm text-[#A0AEC0]">
                Create your first listing to start receiving rental applications.
              </p>
              <button
                type="button"
                onClick={onAdd}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#E88D5B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d97a48]"
              >
                <IconPlus />
                Add Your First Property
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
