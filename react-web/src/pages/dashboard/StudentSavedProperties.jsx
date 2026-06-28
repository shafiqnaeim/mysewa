function formatPrice(price) {
  const n = Number(price)
  if (!Number.isFinite(n)) return 'RM —'
  return `RM ${n.toLocaleString('en-MY')}/month`
}

function formatRelativeSaved(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    const diff = Date.now() - d.getTime()
    const days = Math.floor(diff / 86400000)
    if (days < 1) return 'today'
    if (days === 1) return '1 day ago'
    if (days < 30) return `${days} days ago`
    const months = Math.floor(days / 30)
    if (months === 1) return '1 month ago'
    return `${months} months ago`
  } catch {
    return '—'
  }
}

function StarRating({ rating }) {
  const value = Number(rating) || 0
  return (
    <span className="inline-flex items-center gap-1 text-sm text-[#1A1A2E]">
      <span aria-hidden="true">{'⭐'.repeat(5)}</span>
      <span className="font-semibold">{value.toFixed(1)}</span>
    </span>
  )
}

function SavedPropertyCard({ property, onViewDetails, onRemove, removing }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm transition hover:shadow-md">
      <div className="relative">
        {property.image ? (
          <img src={property.image} alt="" className="h-48 w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-48 items-center justify-center bg-gray-200 text-sm text-[#6B7280]">No image</div>
        )}
        <span
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg shadow-sm"
          aria-hidden="true"
        >
          ❤️
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xl font-bold text-[#6C2BD9]">{formatPrice(property.price)}</p>
        <h3 className="mt-1 font-bold text-[#1A1A2E]">{property.name}</h3>
        <p className="mt-1 text-sm text-[#6B7280]">{property.address || '—'}</p>

        <div className="mt-3">
          <StarRating rating={property.rating} />
        </div>

        <p className="mt-3 text-xs text-[#6B7280]">Saved: {formatRelativeSaved(property.savedAt)}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onViewDetails(property)}
            className="flex-1 rounded-lg bg-[#6C2BD9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5B21B6]"
          >
            View Details
          </button>
          <button
            type="button"
            disabled={removing}
            onClick={() => onRemove(property)}
            className="rounded-lg border border-[#EF4444] bg-white px-4 py-2.5 text-sm font-semibold text-[#EF4444] transition hover:bg-[#FEF2F2] disabled:opacity-50"
          >
            {removing ? '…' : 'Remove'}
          </button>
        </div>
      </div>
    </article>
  )
}

export default function StudentSavedProperties({
  loading = false,
  properties = [],
  removingId = null,
  onViewDetails,
  onRemove,
  onBrowseProperties,
}) {
  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
            <span aria-hidden="true">❤️ </span>
            Saved Properties
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">Properties you&apos;ve saved for later</p>
          {!loading && properties.length > 0 ? (
            <p className="mt-2 text-sm font-medium text-[#6C2BD9]">
              {properties.length} saved propert{properties.length === 1 ? 'y' : 'ies'}
            </p>
          ) : null}
        </header>

        {loading ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-12 text-center shadow-sm">
            <p className="text-sm text-[#6B7280]">Loading saved properties…</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-12 text-center shadow-sm">
            <p className="text-4xl" aria-hidden="true">
              ❤️
            </p>
            <p className="mt-4 text-lg font-bold text-[#1A1A2E]">You haven&apos;t saved any properties yet</p>
            <p className="mt-2 text-sm text-[#6B7280]">
              Tap the heart on listings while browsing to build your wishlist.
            </p>
            <button
              type="button"
              onClick={onBrowseProperties}
              className="mt-6 rounded-lg bg-[#6C2BD9] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6]"
            >
              Browse Properties
            </button>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <SavedPropertyCard
                key={property.id}
                property={property}
                removing={removingId === property.id}
                onViewDetails={onViewDetails}
                onRemove={onRemove}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
