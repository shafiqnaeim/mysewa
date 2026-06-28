import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import TopNavBar from '../components/TopNavBar'
import LandingHero from '../components/landing/LandingHero'
import LandingFeatures from '../components/landing/LandingFeatures'
import LandingTrending from '../components/landing/LandingTrending'
import LandingSearchSection from '../components/landing/LandingSearchSection'
import LandingSplitCTA from '../components/landing/LandingSplitCTA'
import LandingTestimonials from '../components/landing/LandingTestimonials'
import StudentAccountSiteFooter from '../components/StudentAccountSiteFooter'
import LandingUrgencyBar from '../components/landing/LandingUrgencyBar'
import PropertyApplicationModal from '../components/PropertyApplicationModal'
import PropertyViewModal from '../components/PropertyViewModal'
import { useToast } from '../context/ToastContext'
import { fetchNearbyFacilities } from '../utils/nearbyFacilities'
import { TRENDING_FALLBACK, mapApiItemToTrending } from '../components/landing/landingData'

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
  const searchSectionRef = useRef(null)

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

  const trendingItems = useMemo(() => {
    if (!items.length) return TRENDING_FALLBACK
    const available = items.filter((i) => String(i.status || '').toLowerCase() !== 'rented')
    const pool = (available.length >= 5 ? available : items).slice(0, 5)
    const mapped = pool.map((item, i) => mapApiItemToTrending(item, i))
    while (mapped.length < 5) {
      const fallback = TRENDING_FALLBACK[mapped.length % TRENDING_FALLBACK.length]
      mapped.push({ ...fallback, id: `trend-fill-${mapped.length}` })
    }
    return mapped.slice(0, 5)
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

  const openPropertyApply = useCallback(
    (item) => {
      discardViewSession()
      setApplyTarget(item)
    },
    [discardViewSession],
  )

  const handleHeroSearch = useCallback(({ location, maxPrice }) => {
    if (location?.trim()) setQuery(location.trim())
    if (maxPrice) setFilters((prev) => ({ ...prev, maxPrice: String(maxPrice) }))
    setShowFilters(Boolean(maxPrice))
    searchSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleTrendingSelect = useCallback(
    (card) => {
      if (card.raw) {
        openPropertyView(card.raw)
        return
      }
      pushToast({ message: 'Demo listing — connect to live data when properties are loaded.', type: 'info' })
    },
    [openPropertyView, pushToast],
  )

  return (
    <div className="min-h-screen overflow-x-hidden bg-story-bg font-sans text-story-primary site-page-with-footer">
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

      <LandingHero onSearch={handleHeroSearch} />
      <LandingFeatures />
      <LandingTrending items={trendingItems} loading={loading} onSelect={handleTrendingSelect} />
      <LandingSearchSection
        ref={searchSectionRef}
        query={query}
        setQuery={setQuery}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        filters={filters}
        setFilters={setFilters}
        clearFilters={clearFilters}
        loading={loading}
        error={error}
        filteredItems={filteredItems}
        onView={openPropertyView}
        onApply={openPropertyApply}
      />
      <LandingSplitCTA />
      <LandingTestimonials />
      <StudentAccountSiteFooter />
      <LandingUrgencyBar />
    </div>
  )
}
