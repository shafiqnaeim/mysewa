import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudentLayout from '../components/StudentLayout'
import { useToast } from '../context/ToastContext'
import { listAmenityIds } from '../utils/amenities'
import {
  formatPropertyLocationLine,
  listPropertyImageUrls,
} from '../utils/propertyDisplay'
import { readSavedProperties, toggleSavedProperty } from '../utils/savedProperties'
import StudentPropertySearch, {
  EMPTY_FILTERS,
  PAGE_SIZE,
} from './dashboard/StudentPropertySearch'

function normalizeType(type) {
  const t = String(type || '').toLowerCase()
  if (t.includes('room')) return 'room'
  if (t.includes('studio')) return 'studio'
  if (t.includes('apartment') || t.includes('condo') || t.includes('flat')) return 'apartment'
  if (t.includes('house') || t.includes('terrace') || t.includes('villa') || t.includes('bungalow')) return 'house'
  return t
}

function formatDistanceLabel(item) {
  const dist = String(item.distance || '').trim()
  if (dist) return dist
  return null
}

function mapApiToCard(item) {
  const imageUrls = listPropertyImageUrls(item)
  const image = imageUrls[0] || null

  const location = formatPropertyLocationLine(item)
  const address = [item.location, item.city, item.state].filter(Boolean).join(', ') || location
  const reviewCountRaw = Number(item.reviewCount ?? item.reviewsCount ?? 0)
  const reviewCount = Number.isFinite(reviewCountRaw) && reviewCountRaw >= 0 ? reviewCountRaw : 0
  const ratingRaw = item.averageRating ?? item.rating
  const rating =
    ratingRaw != null && ratingRaw !== '' && Number.isFinite(Number(ratingRaw)) ? Number(ratingRaw) : 0
  const capacity = Number(item.capacity) > 0 ? Number(item.capacity) : 1

  return {
    id: item.id,
    name: item.name || 'Rental listing',
    price: Number(item.price) || 0,
    address,
    location,
    shortAddress: item.city || item.state || location,
    distanceLabel: formatDistanceLabel(item),
    rating,
    reviewCount,
    type: normalizeType(item.type),
    capacity,
    status: String(item.status || 'available').toLowerCase(),
    campus: item.campus || '',
    gender: item.gender || '',
    religion: item.religion || '',
    race: item.race || '',
    verified: Boolean(item.verified ?? item.isVerified),
    studentApproved: String(item.rentalStyle || '').toLowerCase().includes('student'),
    amenities: listAmenityIds(item.amenities).slice(0, 3),
    image,
    raw: item,
  }
}

function isOccupiedStatus(status) {
  const s = String(status || '').toLowerCase()
  return s === 'rented' || s === 'booked' || s === 'occupied' || s === 'maintenance'
}

function matchesReligion(propertyReligion, filter) {
  if (!filter) return true
  const r = String(propertyReligion || '').toLowerCase()
  if (filter === 'muslim') return r === 'islam' || r === 'muslim'
  if (filter === 'non-muslim') return r && r !== 'islam' && r !== 'muslim'
  return true
}

function filterProperties(list, applied) {
  const keyword = applied.keyword.trim().toLowerCase()
  return list.filter((p) => {
    if (keyword) {
      const bag = [
        p.name,
        p.address,
        p.location,
        p.shortAddress,
        p.type,
        p.campus,
        p.raw?.city,
        p.raw?.state,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!bag.includes(keyword)) return false
    }

    if (applied.propertyType && p.type !== applied.propertyType) return false

    const price = Number(p.price) || 0
    if (applied.minPrice && price < Number(applied.minPrice)) return false
    if (applied.maxPrice && price > Number(applied.maxPrice)) return false

    if (applied.campus && String(p.campus || '') !== applied.campus) return false

    if (applied.status === 'available' && isOccupiedStatus(p.status)) return false
    if (applied.status === 'occupied' && !isOccupiedStatus(p.status)) return false

    if (!matchesReligion(p.religion, applied.religion)) return false

    if (applied.gender && String(p.gender || '').toLowerCase() !== applied.gender.toLowerCase()) {
      return false
    }

    if (applied.race && String(p.race || '').toLowerCase() !== applied.race.toLowerCase()) {
      return false
    }

    return true
  })
}

export default function StudentPropertySearchPage() {
  const navigate = useNavigate()
  const { pushToast } = useToast()

  const [userId, setUserId] = useState(null)
  const [savedRevision, setSavedRevision] = useState(0)

  const [allProperties, setAllProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    async function loadProperties() {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/properties?size=100')
        if (!res.ok) throw new Error(`Failed to load properties (HTTP ${res.status})`)
        const data = await res.json()
        const items = Array.isArray(data.items) ? data.items : []
        if (!cancelled) {
          setAllProperties(items.map(mapApiToCard))
        }
      } catch (e) {
        if (!cancelled) {
          setAllProperties([])
          setError(e.message || 'Unable to load properties. Please try again later.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadProperties()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(
    () => filterProperties(allProperties, appliedFilters),
    [allProperties, appliedFilters],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  useEffect(() => {
    if (page > totalPages) setPage(1)
  }, [page, totalPages])

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = filtered.length === 0 ? 0 : Math.min(page * PAGE_SIZE, filtered.length)

  function openPropertyView(property) {
    navigate(`/properties/${property.id}`)
  }

  useEffect(() => {
    const token = localStorage.getItem('mysewa_token')
    if (!token) {
      setUserId(null)
      return
    }
    let cancelled = false
    async function loadMe() {
      try {
        const res = await fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json().catch(() => ({}))
        if (!cancelled && res.ok && data.user?.id) setUserId(data.user.id)
      } catch {
        if (!cancelled) setUserId(null)
      }
    }
    loadMe()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function onSavedChanged() {
      setSavedRevision((n) => n + 1)
    }
    window.addEventListener('mysewa-saved-properties-changed', onSavedChanged)
    return () => window.removeEventListener('mysewa-saved-properties-changed', onSavedChanged)
  }, [])

  const savedIds = useMemo(() => {
    if (!userId) return new Set()
    return new Set(readSavedProperties(userId).map((e) => String(e.propertyId)))
  }, [userId, savedRevision])

  function handleToggleSave(property) {
    if (!userId) {
      pushToast({ message: 'Sign in as a student to save listings.', type: 'info' })
      navigate('/signin')
      return
    }
    const wasSaved = savedIds.has(String(property.id))
    toggleSavedProperty(userId, property)
    pushToast({
      message: wasSaved ? 'Removed from saved properties.' : 'Saved to your wishlist.',
      type: 'success',
    })
    setSavedRevision((n) => n + 1)
  }

  function handleSearch() {
    setAppliedFilters({ ...draftFilters })
    setPage(1)
  }

  function handleClearFilters() {
    setDraftFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
    setPage(1)
  }

  return (
    <StudentLayout>
      <StudentPropertySearch
        properties={pageItems}
        totalAvailable={filtered.length}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        loading={loading}
        error={error}
        filters={draftFilters}
        onFiltersChange={setDraftFilters}
        onSearch={handleSearch}
        onClearFilters={handleClearFilters}
        page={page}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onViewDetails={openPropertyView}
        savedIds={savedIds}
        onToggleSave={handleToggleSave}
      />
    </StudentLayout>
  )
}
