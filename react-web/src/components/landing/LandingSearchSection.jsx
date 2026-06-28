import { forwardRef } from 'react'
import LandlordPropertyCard from '../LandlordPropertyCard'
import LandingReveal from './LandingReveal'

const LandingSearchSection = forwardRef(function LandingSearchSection(
  {
    query,
    setQuery,
    showFilters,
    setShowFilters,
    filters,
    setFilters,
    clearFilters,
    loading,
    error,
    filteredItems,
    onView,
    onApply,
  },
  ref,
) {
  return (
    <section
      ref={ref}
      id="landing-search-section"
      className="bg-story-bg px-4 py-16 sm:px-6 lg:px-8"
      aria-labelledby="landing-search-title"
    >
      <div className="mx-auto max-w-7xl">
        <LandingReveal className="mb-8 text-center">
          <h2 id="landing-search-title" className="font-display text-3xl text-story-primary sm:text-4xl">
            Search &amp; results
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-story-primary/70">
            Filter listings and browse everything that matches your keyword.
          </p>
        </LandingReveal>

        <LandingReveal delay={0.08}>
          <div className="rounded-2xl border border-story-primary/10 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <label className="block text-left">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-story-primary/60">
                  Keyword
                </span>
                <input
                  type="text"
                  placeholder="Location, university, property name…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-xl border border-story-primary/10 bg-story-bg px-4 py-3 text-sm text-story-primary outline-none ring-story-accent/40 focus:ring-2"
                />
              </label>
              <button
                type="button"
                onClick={() => setShowFilters((prev) => !prev)}
                className="rounded-xl border border-story-primary bg-white px-5 py-3 text-sm font-bold text-story-primary transition hover:scale-[1.02]"
              >
                {showFilters ? 'Hide filters' : 'Filter'}
              </button>
              <button
                type="button"
                className="rounded-xl bg-story-primary px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.02]"
              >
                Search
              </button>
            </div>
          </div>
        </LandingReveal>

        {showFilters ? (
          <LandingReveal delay={0.1} className="mt-4">
            <div className="rounded-2xl border border-story-primary/10 bg-white p-5 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block text-sm font-semibold text-story-primary">
                  Property Type
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-story-primary/10 bg-story-bg px-3 py-2.5 text-sm"
                  >
                    <option value="">All</option>
                    <option value="house">House</option>
                    <option value="apartment">Apartment</option>
                    <option value="condo">Condo</option>
                    <option value="room">Room</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold text-story-primary">
                  Nearest Campus
                  <select
                    value={filters.campus}
                    onChange={(e) => setFilters((prev) => ({ ...prev, campus: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-story-primary/10 bg-story-bg px-3 py-2.5 text-sm"
                  >
                    <option value="">Select</option>
                    <option value="UMT">UMT</option>
                    <option value="UniSZA">UniSZA</option>
                    <option value="ILPKT">ILPKT</option>
                    <option value="IPGM">IPGM</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold text-story-primary">
                  Status
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-story-primary/10 bg-story-bg px-3 py-2.5 text-sm"
                  >
                    <option value="">All</option>
                    <option value="available">Available</option>
                    <option value="rented">Rented</option>
                    <option value="maintenance">Under Maintenance</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold text-story-primary">
                  Gender Preference
                  <select
                    value={filters.gender}
                    onChange={(e) => setFilters((prev) => ({ ...prev, gender: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-story-primary/10 bg-story-bg px-3 py-2.5 text-sm"
                  >
                    <option value="">All</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold text-story-primary">
                  Min Price (RM)
                  <input
                    type="number"
                    min="0"
                    value={filters.minPrice}
                    onChange={(e) => setFilters((prev) => ({ ...prev, minPrice: e.target.value }))}
                    placeholder="e.g. 300"
                    className="mt-1 w-full rounded-xl border border-story-primary/10 bg-story-bg px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="block text-sm font-semibold text-story-primary">
                  Max Price (RM)
                  <input
                    type="number"
                    min="0"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: e.target.value }))}
                    placeholder="e.g. 1800"
                    className="mt-1 w-full rounded-xl border border-story-primary/10 bg-story-bg px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="block text-sm font-semibold text-story-primary">
                  Religion Preference
                  <select
                    value={filters.religion}
                    onChange={(e) => setFilters((prev) => ({ ...prev, religion: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-story-primary/10 bg-story-bg px-3 py-2.5 text-sm"
                  >
                    <option value="">All</option>
                    <option value="islam">Islam</option>
                    <option value="buddhism">Buddhism</option>
                    <option value="hinduism">Hinduism</option>
                    <option value="christianity">Christianity</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold text-story-primary">
                  Race Preference
                  <select
                    value={filters.race}
                    onChange={(e) => setFilters((prev) => ({ ...prev, race: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-story-primary/10 bg-story-bg px-3 py-2.5 text-sm"
                  >
                    <option value="">All</option>
                    <option value="malay">Malay</option>
                    <option value="chinese">Chinese</option>
                    <option value="indian">Indian</option>
                    <option value="others">Others</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-full px-4 py-2 text-sm font-bold text-story-primary/70 hover:bg-story-primary/5"
                >
                  Clear filters
                </button>
              </div>
            </div>
          </LandingReveal>
        ) : null}

        <LandingReveal delay={0.14} className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-story-primary">Search results</h3>
            {!loading && !error ? (
              <span className="rounded-full bg-story-accent/25 px-3 py-1 text-xs font-bold text-story-primary">
                {filteredItems.length} match{filteredItems.length === 1 ? '' : 'es'}
              </span>
            ) : null}
          </div>

          {loading ? <p className="text-story-primary/60">Loading properties…</p> : null}
          {!loading && error ? <p className="text-red-700">{error}</p> : null}
          {!loading && !error && filteredItems.length === 0 ? (
            <p className="text-story-primary/60">No properties matched your search.</p>
          ) : null}
          {!loading && !error && filteredItems.length > 0 ? (
            <div className="landlord-property-grid">
              {filteredItems.map((item) => (
                <LandlordPropertyCard key={item.id} item={item} onView={onView} onApply={onApply} />
              ))}
            </div>
          ) : null}
        </LandingReveal>
      </div>
    </section>
  )
})

export default LandingSearchSection
