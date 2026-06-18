import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import TopNavBar from '../components/TopNavBar'
import LandlordPropertyCard from '../components/LandlordPropertyCard'
import PropertyApplicationModal from '../components/PropertyApplicationModal'
import PropertyViewModal from '../components/PropertyViewModal'
import StudentAccountSiteFooter from '../components/StudentAccountSiteFooter'
import { useToast } from '../context/ToastContext'
import { fetchNearbyFacilities } from '../utils/nearbyFacilities'

function matchesSearchKeywords(bagLower, keywordRaw) {
  const keyword = keywordRaw.trim().toLowerCase()
  if (!keyword) return true
  const tokens = keyword.split(/\s+/).filter(Boolean)
  if (!tokens.length) return true
  return tokens.every((t) => bagLower.includes(t))
}

export default function LandingPage() {
  const { pushToast } = useToast()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q')?.trim() || '')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    campus: '',
    type: '',
    status: '',
    minPrice: '',
    maxPrice: '',
    gender: '',
    religion: '',
    race: '',
  })
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const openViewSeqRef = useRef(0)
  const [viewOpen, setViewOpen] = useState(null)
  const [viewOpening, setViewOpening] = useState(false)
  const [applyTarget, setApplyTarget] = useState(null)

  const discardViewSession = useCallback(() => {
    openViewSeqRef.current += 1
    setViewOpen(null)
    setViewOpening(false)
  }, [])

  const openPropertyView = useCallback(async (item) => {
    const seq = ++openViewSeqRef.current
    const lat = Number(item.latitude)
    const lng = Number(item.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setViewOpening(false)
      setViewOpen({ item })
      return
    }
    setViewOpening(true)
    try {
      const rows = await fetchNearbyFacilities(lat, lng)
      if (openViewSeqRef.current !== seq) return
      setViewOpen({ item, prefetchedNearbyPlaces: rows })
    } catch {
      if (openViewSeqRef.current !== seq) return
      setViewOpen({ item, prefetchedNearbyPlaces: [] })
    } finally {
      if (openViewSeqRef.current === seq) setViewOpening(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadProperties() {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/v1/properties/search')
        if (!res.ok) throw new Error(`Failed to load properties (HTTP ${res.status})`)
        const data = await res.json()
        if (!cancelled) setItems(Array.isArray(data.items) ? data.items : [])
      } catch (e) {
        if (!cancelled) setError(e.message || 'Unable to load properties.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadProperties()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const q = searchParams.get('q')
    if (q !== null) setQuery(q.trim())
  }, [searchParams])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const bag = [item.name, item.type, item.location, item.campus, item.city, item.state, item.rentalStyle]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!matchesSearchKeywords(bag, query)) return false
      const price = Number(item.price ?? 0)
      if (filters.campus && String(item.campus || '') !== filters.campus) return false
      if (filters.type && String(item.type || '').toLowerCase() !== filters.type.toLowerCase()) return false
      if (filters.status && String(item.status || '').toLowerCase() !== filters.status.toLowerCase()) return false
      if (filters.minPrice && !(price >= Number(filters.minPrice))) return false
      if (filters.maxPrice && !(price <= Number(filters.maxPrice))) return false
      if (filters.gender && String(item.gender || '').toLowerCase() !== filters.gender.toLowerCase()) return false
      if (filters.religion && String(item.religion || '').toLowerCase() !== filters.religion.toLowerCase()) return false
      if (filters.race && String(item.race || '').toLowerCase() !== filters.race.toLowerCase()) return false
      return true
    })
  }, [items, query, filters])

  const suggestedItems = useMemo(() => {
    if (!items.length) return []
    const available = items.filter((i) => String(i.status || '').toLowerCase() !== 'rented')
    const pool = available.length >= 4 ? available : items
    return pool.slice(0, 6)
  }, [items])

  const clearFilters = useCallback(() => {
    setFilters({
      campus: '',
      type: '',
      status: '',
      minPrice: '',
      maxPrice: '',
      gender: '',
      religion: '',
      race: '',
    })
  }, [])

  const openPropertyApply = useCallback((item) => {
    discardViewSession()
    setApplyTarget(item)
  }, [discardViewSession])

  return (
    <main className="app-shell">
      <TopNavBar />

      {viewOpening ? (
        <div className="pv-preopen-backdrop" role="status" aria-busy="true" aria-live="polite">
          <div className="pv-preopen-panel">
            <span className="pv-preopen-spinner" aria-hidden="true" />
            <span className="pv-preopen-text">Loading listing…</span>
          </div>
        </div>
      ) : null}

      {viewOpen ? (
        <PropertyViewModal
          item={viewOpen.item}
          prefetchedNearbyPlaces={viewOpen.prefetchedNearbyPlaces}
          onClose={discardViewSession}
          readOnly
        />
      ) : null}

      {applyTarget ? (
        <PropertyApplicationModal
          key={applyTarget.id}
          property={applyTarget}
          onClose={() => setApplyTarget(null)}
          pushToast={pushToast}
        />
      ) : null}

      <div className="student-account-page-with-footer">
      <section className="content landing-three">
        {/* 1 — Suggested properties */}
        <section className="landing-block landing-block--suggested" aria-labelledby="landing-suggested-title">
          <header className="landing-block-head">
            <h2 id="landing-suggested-title">Suggested properties</h2>
            <p className="landing-block-lead">Hand-picked style picks from available listings — updated when data loads.</p>
          </header>
          {loading ? <div className="results-empty">Loading suggestions…</div> : null}
          {!loading && error ? <div className="results-empty">{error}</div> : null}
          {!loading && !error && suggestedItems.length === 0 ? (
            <div className="results-empty">No properties to suggest yet.</div>
          ) : null}
          {!loading && !error && suggestedItems.length > 0 ? (
            <div className="landlord-property-grid landing-suggested-grid">
              {suggestedItems.map((item) => (
                <LandlordPropertyCard
                  key={`suggested-${item.id}`}
                  item={item}
                  onView={openPropertyView}
                  onApply={openPropertyApply}
                />
              ))}
            </div>
          ) : null}
        </section>

        {/* 2 — Filter + search results */}
        <section className="landing-block landing-block--search" id="landing-search-section" aria-labelledby="landing-search-title">
          <header className="landing-block-head">
            <h2 id="landing-search-title">Search &amp; results</h2>
            <p className="landing-block-lead">Filter listings and browse everything that matches your keyword.</p>
          </header>

          <div className="search-results-section landing-search-inner">
            <section className="search-strip">
              <div className="search-strip-inner">
                <div className="search-strip-field search-strip-field-wide">
                  <input
                    type="text"
                    placeholder="Type location, university, property name, or keyword..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <button type="button" className="search-strip-btn search-strip-filter-btn" onClick={() => setShowFilters((prev) => !prev)}>
                  Filter
                </button>
                <button type="button" className="search-strip-btn">
                  Search
                </button>
              </div>
            </section>

            {showFilters ? (
              <section className="filter-panel" aria-label="Property filters">
                <div className="filter-row">
                  <label>
                    Property Type
                    <select value={filters.type} onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}>
                      <option value="">All</option>
                      <option value="house">House</option>
                      <option value="apartment">Apartment</option>
                      <option value="condo">Condo</option>
                      <option value="room">Room</option>
                    </select>
                  </label>
                  <label>
                    Nearest Campus
                    <select value={filters.campus} onChange={(e) => setFilters((prev) => ({ ...prev, campus: e.target.value }))}>
                      <option value="">Select</option>
                      <option value="UMT">Universiti Malaysia Terengganu (UMT)</option>
                      <option value="UniSZA">Universiti Sultan Zainal Abidin (UniSZA)</option>
                      <option value="ILPKT">Institusi Latihan Perindustrian Kuala Terengganu (ILPKT)</option>
                      <option value="IPGM">Institut Pendidikan Guru Malaysia (IPGM)</option>
                    </select>
                  </label>
                  <label>
                    Status
                    <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
                      <option value="">All</option>
                      <option value="available">Available</option>
                      <option value="rented">Rented</option>
                      <option value="maintenance">Under Maintenance</option>
                    </select>
                  </label>
                  <label>
                    Gender Preference
                    <select value={filters.gender} onChange={(e) => setFilters((prev) => ({ ...prev, gender: e.target.value }))}>
                      <option value="">All</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </label>
                </div>
                <div className="filter-row filter-row-second">
                  <label>
                    Min Price (RM)
                    <input
                      type="number"
                      min="0"
                      value={filters.minPrice}
                      onChange={(e) => setFilters((prev) => ({ ...prev, minPrice: e.target.value }))}
                      placeholder="e.g. 300"
                    />
                  </label>
                  <label>
                    Max Price (RM)
                    <input
                      type="number"
                      min="0"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: e.target.value }))}
                      placeholder="e.g. 1800"
                    />
                  </label>
                  <label>
                    Religion Preference
                    <select value={filters.religion} onChange={(e) => setFilters((prev) => ({ ...prev, religion: e.target.value }))}>
                      <option value="">All</option>
                      <option value="islam">Islam</option>
                      <option value="buddhism">Buddhism</option>
                      <option value="hinduism">Hinduism</option>
                      <option value="christianity">Christianity</option>
                    </select>
                  </label>
                  <label>
                    Race Preference
                    <select value={filters.race} onChange={(e) => setFilters((prev) => ({ ...prev, race: e.target.value }))}>
                      <option value="">All</option>
                      <option value="malay">Malay</option>
                      <option value="chinese">Chinese</option>
                      <option value="indian">Indian</option>
                      <option value="others">Others</option>
                    </select>
                  </label>
                </div>
                <div className="filter-actions">
                  <button type="button" className="filter-clear-btn" onClick={clearFilters}>
                    Clear
                  </button>
                </div>
              </section>
            ) : null}

            <section className="results-panel" id="landing-search-results" aria-labelledby="landing-results-heading">
              <div className="results-panel-head">
                <h3 id="landing-results-heading">Search results</h3>
                {!loading && !error ? (
                  <span className="results-count-pill">
                    {filteredItems.length} match{filteredItems.length === 1 ? '' : 'es'}
                  </span>
                ) : null}
              </div>
              {loading ? <div className="results-empty">Loading properties...</div> : null}
              {!loading && error ? <div className="results-empty">{error}</div> : null}
              {!loading && !error && filteredItems.length === 0 ? <div className="results-empty">No properties matched your search.</div> : null}
              {!loading && !error && filteredItems.length > 0 ? (
                <div className="landlord-property-grid">
                  {filteredItems.map((item) => (
                    <LandlordPropertyCard
                      key={item.id}
                      item={item}
                      onView={openPropertyView}
                      onApply={openPropertyApply}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        </section>
      </section>

      <StudentAccountSiteFooter />
      </div>
    </main>
  )
}
