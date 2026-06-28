import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StudentLayout from '../components/StudentLayout'
import LoadingSkeleton from '../components/errors/LoadingSkeleton'
import NetworkError from '../components/errors/NetworkError'
import { PrimaryButton, OutlineButton } from '../components/errors/PropertyNotFound'
import { useToast } from '../context/ToastContext'
import { TRENDING_FALLBACK } from '../components/landing/landingData'
import StudentPropertyDetail from './dashboard/StudentPropertyDetail'
import { DUMMY_PROPERTIES } from './dashboard/StudentPropertySearch'

const DEMO_DETAIL_BY_ID = Object.fromEntries(
  DUMMY_PROPERTIES.map((p, index) => [
    String(p.id),
    {
      id: p.id,
      name: p.name,
      price: p.price,
      type: p.type,
      status: 'available',
      capacity: p.bedrooms >= 4 ? 10 : p.bedrooms * 3,
      bedrooms: p.bedrooms,
      city: p.shortAddress,
      state: 'Terengganu',
      location: p.address,
      description: `Comfortable ${p.type} near campus — ideal for students. Includes essential amenities and easy access to public transport.`,
      gender: 'any',
      religion: 'any',
      race: 'any',
      verified: p.verified,
      rentalStyle: p.studentApproved ? 'student' : 'general',
      amenities: p.amenities,
      images: JSON.stringify([p.image]),
      rentalStyle: JSON.stringify({ deposit: 1500 }),
      latitude: 5.33 + index * 0.01,
      longitude: 103.14 + index * 0.01,
      averageRating: p.rating,
      reviewCount: p.reviewCount,
    },
  ]),
)

function enrichDemoFromApi(item, demoId) {
  const demo = DEMO_DETAIL_BY_ID[demoId]
  if (!demo) return item
  return { ...demo, ...item, id: demo.id }
}

export default function StudentPropertyDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { pushToast } = useToast()

  const [property, setProperty] = useState(null)
  const [pageState, setPageState] = useState('loading')
  const [viewerUser, setViewerUser] = useState(null)
  const [viewerLoaded, setViewerLoaded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0)

  const numericId = Number(id)
  const isNumericId = Number.isFinite(numericId) && numericId > 0
  const demoFallback = DEMO_DETAIL_BY_ID[String(id)]

  const loadProperty = useCallback(async () => {
    if (!id) {
      setPageState('not_found')
      return
    }

    setPageState('loading')

    if (!isNumericId && demoFallback) {
      setProperty(demoFallback)
      setPageState('ready')
      return
    }

    const token = localStorage.getItem('mysewa_token')
    let res
    try {
      res = await fetch(`/api/v1/properties/${encodeURIComponent(id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    } catch {
      if (demoFallback) {
        setProperty(demoFallback)
        setPageState('ready')
        return
      }
      setPageState('network')
      return
    }

    const data = await res.json().catch(() => ({}))

    if (res.status === 404) {
      if (demoFallback) {
        setProperty(demoFallback)
        setPageState('ready')
        return
      }
      setPageState('not_found')
      return
    }

    if (!res.ok) {
      if (demoFallback) {
        setProperty(demoFallback)
        setPageState('ready')
        return
      }
      setPageState('network')
      return
    }

    let item = data.item
    if (!item && demoFallback) {
      item = demoFallback
    }
    if (!item) {
      setPageState('not_found')
      return
    }

    if (!item.images && demoFallback?.images) {
      item = enrichDemoFromApi(item, String(id))
    }

    if (!listPropertyHasImages(item) && TRENDING_FALLBACK.length) {
      const thumb = TRENDING_FALLBACK[(numericId || 0) % TRENDING_FALLBACK.length].image
      item = { ...item, images: JSON.stringify([thumb]) }
    }

    setProperty(item)
    setPageState('ready')
  }, [id, isNumericId, demoFallback])

  function listPropertyHasImages(item) {
    const raw = item?.images
    if (!raw) return Boolean(item?.thumbnailPath || item?.coverImageUrl)
    if (Array.isArray(raw)) return raw.length > 0
    return String(raw).trim().length > 2
  }

  useEffect(() => {
    loadProperty()
  }, [loadProperty])

  useEffect(() => {
    const token = localStorage.getItem('mysewa_token')
    if (!token) {
      setViewerUser(null)
      setViewerLoaded(true)
      return
    }
    let cancelled = false
    fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json().catch(() => ({})))
      .then((data) => {
        if (!cancelled) setViewerUser(data.user || null)
      })
      .catch(() => {
        if (!cancelled) setViewerUser(null)
      })
      .finally(() => {
        if (!cancelled) setViewerLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmitApplication({ preferredMoveIn, leaseEndDate, leaseMonths }) {
    const token = localStorage.getItem('mysewa_token')
    if (!token) {
      pushToast({ message: 'Please sign in with a student account to apply.', type: 'info', duration: 6000 })
      navigate('/signin')
      return
    }
    if (!viewerUser || String(viewerUser.role || '').toLowerCase() !== 'student') {
      pushToast({
        message: 'Only student accounts can submit applications.',
        type: 'error',
        duration: 7000,
      })
      return
    }

    const propertyId = isNumericId ? numericId : property?.id
    if (!propertyId || (typeof propertyId === 'string' && propertyId.startsWith('demo-'))) {
      pushToast({
        message: 'This is a demo listing — sign in and browse live properties to apply.',
        type: 'info',
        duration: 7000,
      })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          propertyId: Number(propertyId),
          preferredMoveIn,
          leaseEndDate,
          leaseMonths,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Request failed (HTTP ${res.status})`)
      pushToast({
        message: `Application sent for "${property?.name || 'this listing'}". The landlord will review it soon.`,
        type: 'success',
        duration: 6500,
      })
      setReviewRefreshKey((n) => n + 1)
    } catch (err) {
      pushToast({ message: err.message || 'Unable to submit application.', type: 'error', duration: 7000 })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <StudentLayout>
      <div className="px-4 py-8 sm:px-6">
        {pageState === 'loading' ? <LoadingSkeleton /> : null}

        {pageState === 'network' ? (
          <NetworkError onRetry={loadProperty} />
        ) : null}

        {pageState === 'not_found' ? (
          <div className="mx-auto max-w-lg text-center">
            <p className="text-5xl" aria-hidden="true">
              🏠
            </p>
            <h1 className="mt-4 text-xl font-bold text-[#2D3748]">Property not found</h1>
            <p className="mt-2 text-sm text-[#A0AEC0]">
              This listing may have been removed or the link is incorrect.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <PrimaryButton onClick={() => navigate('/properties')}>Browse properties</PrimaryButton>
              <OutlineButton onClick={() => navigate(-1)}>Go back</OutlineButton>
            </div>
          </div>
        ) : null}

        {pageState === 'ready' && property ? (
          <StudentPropertyDetail
            property={property}
            viewerUser={viewerUser}
            viewerLoaded={viewerLoaded}
            onSubmitApplication={handleSubmitApplication}
            submitting={submitting}
            reviewRefreshKey={reviewRefreshKey}
          />
        ) : null}
      </div>
    </StudentLayout>
  )
}
