import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudentLayout from '../components/StudentLayout'
import PropertyViewModal from '../components/PropertyViewModal'
import { useStudentGuard } from '../hooks/useStudentGuard'
import { useToast } from '../context/ToastContext'
import { fetchNearbyFacilities } from '../utils/nearbyFacilities'
import { listPropertyImageUrls } from '../utils/propertyDisplay'
import { readSavedProperties, removeSavedProperty } from '../utils/savedProperties'
import { TRENDING_FALLBACK } from '../components/landing/landingData'
import StudentSavedProperties from './dashboard/StudentSavedProperties'

function mapEntryToCard(entry, index, apiItem) {
  const snap = entry.snapshot || {}
  const image =
    (apiItem && listPropertyImageUrls(apiItem)[0]) ||
    snap.image ||
    TRENDING_FALLBACK[index % TRENDING_FALLBACK.length].image

  const address =
    apiItem
      ? [apiItem.location, apiItem.city, apiItem.state].filter(Boolean).join(', ')
      : snap.address

  return {
    id: entry.propertyId,
    propertyId: entry.propertyId,
    savedAt: entry.savedAt,
    name: apiItem?.name || snap.name || `Property #${entry.propertyId}`,
    price: Number(apiItem?.price ?? snap.price) || 0,
    address: address || 'Terengganu',
    rating: Number(apiItem?.averageRating ?? apiItem?.rating ?? snap.rating) || 4.5,
    image,
    raw: apiItem || { id: entry.propertyId, name: snap.name, price: snap.price, location: snap.address },
  }
}

export default function StudentSavedPropertiesPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, error: authError } = useStudentGuard()
  const { pushToast } = useToast()
  const openViewSeqRef = useRef(0)

  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState([])
  const [removingId, setRemovingId] = useState(null)
  const [viewOpen, setViewOpen] = useState(null)
  const [viewOpening, setViewOpening] = useState(false)

  const loadSaved = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const entries = readSavedProperties(user.id)
      if (!entries.length) {
        setProperties([])
        return
      }

      const cards = await Promise.all(
        entries.map(async (entry, index) => {
          try {
            const res = await fetch(`/api/v1/properties/${encodeURIComponent(entry.propertyId)}`)
            const data = await res.json().catch(() => ({}))
            const item = res.ok ? data.item || data : null
            return mapEntryToCard(entry, index, item)
          } catch {
            return mapEntryToCard(entry, index, null)
          }
        }),
      )
      setProperties(cards)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) loadSaved()
  }, [user?.id, loadSaved])

  useEffect(() => {
    function onChanged() {
      if (user?.id) loadSaved()
    }
    window.addEventListener('mysewa-saved-properties-changed', onChanged)
    return () => window.removeEventListener('mysewa-saved-properties-changed', onChanged)
  }, [user?.id, loadSaved])

  const discardViewSession = useCallback(() => {
    openViewSeqRef.current += 1
    setViewOpen(null)
    setViewOpening(false)
  }, [])

  const openPropertyView = useCallback(async (property) => {
    const item = property.raw || property
    const seq = ++openViewSeqRef.current
    const lat = Number(item.latitude)
    const lng = Number(item.longitude)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
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

  function handleRemove(property) {
    if (!user?.id || property?.id == null) return
    setRemovingId(property.id)
    removeSavedProperty(user.id, property.id)
    setProperties((prev) => prev.filter((p) => String(p.id) !== String(property.id)))
    pushToast({ message: 'Removed from saved properties.', type: 'success' })
    setRemovingId(null)
  }

  if (authLoading) {
    return (
      <StudentLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA]">
          <p className="text-sm text-[#6B7280]">Loading…</p>
        </div>
      </StudentLayout>
    )
  }

  if (authError) {
    return (
      <StudentLayout>
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Error: {authError}
          </div>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      {viewOpening ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" role="status" aria-busy="true">
          <div className="rounded-xl bg-white px-6 py-4 shadow-lg">
            <p className="text-sm font-medium text-[#1A1A2E]">Loading listing…</p>
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

      <StudentSavedProperties
        loading={loading}
        properties={properties}
        removingId={removingId}
        onViewDetails={openPropertyView}
        onRemove={handleRemove}
        onBrowseProperties={() => navigate('/properties')}
      />
    </StudentLayout>
  )
}
