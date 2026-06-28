const inputClass =
  'w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#1A1A2E] outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20'

function ListingStatusBadge({ status }) {
  const s = String(status || 'pending').toLowerCase()
  const classes =
    s === 'verified'
      ? 'bg-green-100 text-green-800'
      : s === 'rejected'
        ? 'bg-red-100 text-red-800'
        : 'bg-yellow-100 text-yellow-800'
  const label = s === 'verified' ? 'Verified' : s === 'rejected' ? 'Rejected' : 'Pending'
  const emoji = s === 'verified' ? '✅' : s === 'rejected' ? '❌' : '⏳'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`}>
      <span aria-hidden="true">{emoji}</span> {label}
    </span>
  )
}

function Pagination({ page, totalPages, total, pageSize, onPageChange, noun = 'properties' }) {
  if (totalPages <= 1 && total <= pageSize) {
    return (
      <p className="mt-6 text-sm text-[#6B7280]">
        Showing {total.toLocaleString('en-MY')} {noun}
      </p>
    )
  }

  const start = page * pageSize + 1
  const end = Math.min((page + 1) * pageSize, total)

  const pages = []
  const maxVisible = 5
  let startPage = Math.max(0, page - 2)
  let endPage = Math.min(totalPages - 1, startPage + maxVisible - 1)
  if (endPage - startPage < maxVisible - 1) startPage = Math.max(0, endPage - maxVisible + 1)
  for (let i = startPage; i <= endPage; i += 1) pages.push(i)

  return (
    <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[#6B7280]">
        Showing {start}-{end} of {total.toLocaleString('en-MY')} {noun}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#4B5563] hover:bg-[#FAFAFA] disabled:opacity-50"
        >
          Previous
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              p === page
                ? 'bg-[#DC2626] text-white'
                : 'border border-[#E2E8F0] bg-white text-[#4B5563] hover:bg-[#FAFAFA]'
            }`}
          >
            {p + 1}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#4B5563] hover:bg-[#FAFAFA] disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}

function PropertyDetailModal({
  property,
  detailLoading,
  imageUrls,
  bookings,
  reviews,
  saving,
  onClose,
  onVerify,
  onUnverify,
  onReject,
  onDelete,
}) {
  if (!property) return null

  const listingStatus = property.listingStatus
  const isVerified = listingStatus === 'verified'
  const isRejected = listingStatus === 'rejected'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-[#E2E8F0] px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-[#1A1A2E]">{property.name || `Property #${property.id}`}</h2>
            <p className="mt-1 text-sm text-[#6B7280]">{property.addressLine}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[#6B7280] hover:bg-[#FAFAFA]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          {imageUrls.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {imageUrls.map((url) => (
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="h-32 w-48 shrink-0 rounded-lg border border-[#E2E8F0] object-cover"
                />
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-[#E2E8F0] bg-[#FAFAFA] text-sm text-[#6B7280]">
              No images uploaded
            </div>
          )}

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-[#6B7280]">Property ID</dt>
              <dd className="mt-1 text-sm font-medium text-[#1A1A2E]">{property.id}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-[#6B7280]">Landlord</dt>
              <dd className="mt-1 text-sm text-[#1A1A2E]">{property.landlordName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-[#6B7280]">Price</dt>
              <dd className="mt-1 text-sm font-semibold text-[#DC2626]">{property.priceDisplay}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-[#6B7280]">Listing status</dt>
              <dd className="mt-1">
                <ListingStatusBadge status={listingStatus} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-[#6B7280]">Availability</dt>
              <dd className="mt-1 text-sm capitalize text-[#1A1A2E]">{property.rawStatus || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-[#6B7280]">Listed</dt>
              <dd className="mt-1 text-sm text-[#1A1A2E]">{property.listedDisplay}</dd>
            </div>
            {property.type ? (
              <div>
                <dt className="text-xs font-semibold uppercase text-[#6B7280]">Type</dt>
                <dd className="mt-1 text-sm text-[#1A1A2E]">{property.type}</dd>
              </div>
            ) : null}
            {property.campus ? (
              <div>
                <dt className="text-xs font-semibold uppercase text-[#6B7280]">Campus</dt>
                <dd className="mt-1 text-sm text-[#1A1A2E]">{property.campus}</dd>
              </div>
            ) : null}
          </dl>

          {property.description ? (
            <section>
              <h3 className="text-sm font-bold text-[#1A1A2E]">Description</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#4B5563]">{property.description}</p>
            </section>
          ) : null}

          <section>
            <h3 className="text-sm font-bold text-[#1A1A2E]">Bookings history</h3>
            {detailLoading ? (
              <p className="mt-2 text-sm text-[#6B7280]">Loading…</p>
            ) : bookings.length === 0 ? (
              <p className="mt-2 text-sm text-[#6B7280]">No bookings yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-[#E2E8F0] rounded-lg border border-[#E2E8F0]">
                {bookings.map((b) => (
                  <li key={b.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-[#1A1A2E]">Application #{b.id}</span>
                    <span className="capitalize text-[#6B7280]">{b.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-sm font-bold text-[#1A1A2E]">Reviews</h3>
            {detailLoading ? (
              <p className="mt-2 text-sm text-[#6B7280]">Loading…</p>
            ) : reviews.length === 0 ? (
              <p className="mt-2 text-sm text-[#6B7280]">No reviews yet.</p>
            ) : (
              <ul className="mt-2 space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] px-3 py-2 text-sm">
                    <p className="font-medium text-[#1A1A2E]">
                      {'★'.repeat(Math.min(5, Number(r.rating) || 0))} — {r.studentDisplayName || 'Student'}
                    </p>
                    {r.comment ? <p className="mt-1 text-[#4B5563]">{r.comment}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-[#E2E8F0] px-6 py-4">
          {isVerified ? (
            <button
              type="button"
              disabled={saving}
              onClick={onUnverify}
              className="rounded-lg border border-[#F59E0B] bg-white px-4 py-2 text-sm font-semibold text-[#D97706] hover:bg-[#FFFBEB] disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Unverify'}
            </button>
          ) : (
            <button
              type="button"
              disabled={saving || isRejected}
              onClick={onVerify}
              className="rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-white hover:bg-[#059669] disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Verify'}
            </button>
          )}
          {!isRejected ? (
            <button
              type="button"
              disabled={saving}
              onClick={onReject}
              className="rounded-lg border border-[#DC2626] bg-white px-4 py-2 text-sm font-semibold text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-50"
            >
              Reject
            </button>
          ) : null}
          <button
            type="button"
            disabled={saving}
            onClick={onDelete}
            className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminProperties({
  totalProperties,
  properties,
  loading,
  searchInput,
  statusFilter,
  minPrice,
  maxPrice,
  selectedIds,
  page,
  totalPages,
  pageSize,
  filteredTotal,
  detailProperty,
  detailLoading,
  detailImageUrls,
  detailBookings,
  detailReviews,
  actionSavingId,
  bulkSaving,
  onSearchInputChange,
  onStatusFilterChange,
  onMinPriceChange,
  onMaxPriceChange,
  onSearch,
  onReset,
  onToggleSelect,
  onToggleSelectAll,
  onPageChange,
  onViewProperty,
  onCloseDetail,
  onVerifyProperty,
  onUnverifyProperty,
  onRejectProperty,
  onDeleteProperty,
  onBulkVerify,
  onBulkDelete,
}) {
  const allSelected = properties.length > 0 && properties.every((p) => selectedIds.has(p.id))

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
            <span aria-hidden="true">🏠 </span>
            Manage Properties
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">View and manage all property listings</p>
          <p className="mt-1 text-sm font-semibold text-[#DC2626]">
            {totalProperties.toLocaleString('en-MY')} total properties
          </p>
        </header>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm lg:col-span-1">
              <span className="mb-1.5 block font-medium text-[#4B5563]">Search</span>
              <input
                type="search"
                className={inputClass}
                placeholder="Title or address…"
                value={searchInput}
                onChange={(e) => onSearchInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-[#4B5563]">Status</span>
              <select className={inputClass} value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)}>
                <option value="all">All</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-[#4B5563]">Min price (RM)</span>
              <input
                type="number"
                min="0"
                className={inputClass}
                placeholder="0"
                value={minPrice}
                onChange={(e) => onMinPriceChange(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-[#4B5563]">Max price (RM)</span>
              <input
                type="number"
                min="0"
                className={inputClass}
                placeholder="5000"
                value={maxPrice}
                onChange={(e) => onMaxPriceChange(e.target.value)}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSearch}
              className="rounded-lg bg-[#DC2626] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B91C1C]"
            >
              Search
            </button>
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg border border-[#E2E8F0] bg-white px-5 py-2.5 text-sm font-semibold text-[#4B5563] hover:bg-[#FAFAFA]"
            >
              Reset
            </button>
          </div>
        </section>

        {selectedIds.size > 0 ? (
          <section className="flex flex-wrap items-center gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
            <p className="text-sm font-medium text-[#991B1B]">{selectedIds.size} selected</p>
            <button
              type="button"
              disabled={bulkSaving}
              onClick={onBulkVerify}
              className="rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-white hover:bg-[#059669] disabled:opacity-50"
            >
              Verify Selected
            </button>
            <button
              type="button"
              disabled={bulkSaving}
              onClick={onBulkDelete}
              className="rounded-lg border border-[#DC2626] bg-white px-4 py-2 text-sm font-semibold text-[#DC2626] hover:bg-[#FEE2E2] disabled:opacity-50"
            >
              Delete Selected
            </button>
          </section>
        ) : null}

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-sm text-[#6B7280]">Loading properties…</p>
          ) : properties.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No properties match your filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                    <th className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={onToggleSelectAll}
                        aria-label="Select all on this page"
                      />
                    </th>
                    <th className="px-3 py-3">ID</th>
                    <th className="px-3 py-3">Property</th>
                    <th className="px-3 py-3">Landlord</th>
                    <th className="px-3 py-3">Price</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Listed</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((row) => {
                    const isVerified = row.listingStatus === 'verified'
                    const isRejected = row.listingStatus === 'rejected'
                    const isPending = row.listingStatus === 'pending'
                    return (
                      <tr key={row.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#FAFAFA]">
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(row.id)}
                            onChange={() => onToggleSelect(row.id)}
                            aria-label={`Select ${row.name}`}
                          />
                        </td>
                        <td className="px-3 py-3 text-[#6B7280]">{row.id}</td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-[#1A1A2E]">{row.name}</p>
                          {row.city ? <p className="text-xs text-[#6B7280]">{row.city}</p> : null}
                        </td>
                        <td className="px-3 py-3 text-[#4B5563]">{row.landlordName}</td>
                        <td className="px-3 py-3 font-medium text-[#1A1A2E]">{row.priceDisplay}</td>
                        <td className="px-3 py-3">
                          <ListingStatusBadge status={row.listingStatus} />
                        </td>
                        <td className="px-3 py-3 text-[#6B7280]">{row.listedDisplay}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => onViewProperty(row)}
                              className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#4B5563] hover:bg-[#FAFAFA]"
                            >
                              View
                            </button>
                            {isVerified ? (
                              <button
                                type="button"
                                disabled={actionSavingId === row.id}
                                onClick={() => onUnverifyProperty(row)}
                                className="rounded-lg border border-[#F59E0B] bg-white px-3 py-1.5 text-xs font-semibold text-[#D97706] hover:bg-[#FFFBEB] disabled:opacity-50"
                              >
                                Unverify
                              </button>
                            ) : null}
                            {isPending ? (
                              <>
                                <button
                                  type="button"
                                  disabled={actionSavingId === row.id}
                                  onClick={() => onVerifyProperty(row)}
                                  className="rounded-lg bg-[#10B981] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#059669] disabled:opacity-50"
                                >
                                  Verify
                                </button>
                                <button
                                  type="button"
                                  disabled={actionSavingId === row.id}
                                  onClick={() => onRejectProperty(row)}
                                  className="rounded-lg border border-[#DC2626] bg-white px-3 py-1.5 text-xs font-semibold text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </>
                            ) : null}
                            {isRejected ? (
                              <button
                                type="button"
                                disabled={actionSavingId === row.id}
                                onClick={() => onDeleteProperty(row)}
                                className="rounded-lg bg-[#DC2626] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-50"
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            total={filteredTotal}
            pageSize={pageSize}
            onPageChange={onPageChange}
          />
        </section>
      </div>

      <PropertyDetailModal
        property={detailProperty}
        detailLoading={detailLoading}
        imageUrls={detailImageUrls}
        bookings={detailBookings}
        reviews={detailReviews}
        saving={detailProperty && actionSavingId === detailProperty.id}
        onClose={onCloseDetail}
        onVerify={() => detailProperty && onVerifyProperty(detailProperty)}
        onUnverify={() => detailProperty && onUnverifyProperty(detailProperty)}
        onReject={() => detailProperty && onRejectProperty(detailProperty)}
        onDelete={() => detailProperty && onDeleteProperty(detailProperty)}
      />
    </div>
  )
}
