import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StudentLayout from '../components/StudentLayout'
import LoadingSkeleton from '../components/errors/LoadingSkeleton'
import NetworkError from '../components/errors/NetworkError'
import { PrimaryButton, OutlineButton } from '../components/errors/PropertyNotFound'
import { useToast } from '../context/ToastContext'
import StudentPropertyDetail from './dashboard/StudentPropertyDetail'

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

  const loadProperty = useCallback(async () => {
    if (!id || !isNumericId) {
      setPageState('not_found')
      return
    }

    setPageState('loading')

    const token = localStorage.getItem('mysewa_token')
    let res
    try {
      res = await fetch(`/api/v1/properties/${encodeURIComponent(id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    } catch {
      setPageState('network')
      return
    }

    const data = await res.json().catch(() => ({}))

    if (res.status === 404) {
      setPageState('not_found')
      return
    }

    if (!res.ok) {
      setPageState('network')
      return
    }

    const item = data.item
    if (!item) {
      setPageState('not_found')
      return
    }

    setProperty(item)
    setPageState('ready')
  }, [id, isNumericId])

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

    const propertyId = numericId
    if (!propertyId) {
      setPageState('not_found')
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
