import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudentLayout from '../components/StudentLayout'
import StudentBookingDetailModal from '../components/student/StudentBookingDetailModal'
import StudentDepositModal from '../components/StudentDepositModal'
import { useStudentGuard } from '../hooks/useStudentGuard'
import { useToast } from '../context/ToastContext'
import { showBookingDecisionNotification } from '../components/common/NotificationToast'
import { parsePropertyDeposit } from '../utils/propertyDeposit'
import StudentBookings from './dashboard/StudentBookings'
import ReviewForm from '../components/student/ReviewForm'
import { fetchStudentReviews } from '../services/reviewService'

const BOOKING_STATUS_SEEN_KEY = 'mysewa_student_booking_status_seen'

function loadBookingStatusSeen() {
  try {
    const raw = sessionStorage.getItem(BOOKING_STATUS_SEEN_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveBookingStatusSeen(map) {
  try {
    sessionStorage.setItem(BOOKING_STATUS_SEEN_KEY, JSON.stringify(map))
  } catch {
    /* ignore storage failures */
  }
}

function notifyNewBookingDecisions(items, pushToast) {
  const seen = loadBookingStatusSeen()
  const nextSeen = { ...seen }
  let changed = false

  for (const app of items) {
    if (!app?.id) continue
    const id = String(app.id)
    const status = String(app.status || 'pending').toLowerCase()
    const prev = seen[id]

    if (prev === 'pending' && (status === 'accepted' || status === 'rejected')) {
      showBookingDecisionNotification(pushToast, app)
    }

    if (nextSeen[id] !== status) {
      nextSeen[id] = status
      changed = true
    }
  }

  if (changed) saveBookingStatusSeen(nextSeen)
}

async function fetchPropertyMap(token, propertyIds) {
  const map = {}
  if (!token || propertyIds.length === 0) return map

  await Promise.all(
    propertyIds.map(async (id) => {
      try {
        const res = await fetch(`/api/v1/properties/${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          map[Number(id)] = data.item || data
        }
      } catch {
        /* ignore per-property failures */
      }
    }),
  )

  return map
}

export default function StudentBookingsPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, error: authError } = useStudentGuard()
  const { pushToast } = useToast()

  const [applications, setApplications] = useState([])
  const [propertyById, setPropertyById] = useState({})
  const [loading, setLoading] = useState(true)
  const [detailApp, setDetailApp] = useState(null)
  const [depositModalApp, setDepositModalApp] = useState(null)
  const [reviewTarget, setReviewTarget] = useState(null)
  const [reviewedPropertyIds, setReviewedPropertyIds] = useState(() => new Set())

  const loadApplications = useCallback(async () => {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !user?.id) return
    setLoading(true)
    try {
      const res = await fetch('/api/v1/applications/for-student', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Failed to load bookings (HTTP ${res.status})`)
      const items = Array.isArray(data.items) ? data.items : []
      const propertyIds = [...new Set(items.map((a) => a.propertyId).filter(Boolean))]
      const properties = await fetchPropertyMap(token, propertyIds)
      setPropertyById(properties)

      const enriched = items.map((app) => {
        const property = properties[Number(app.propertyId)]
        const listingDeposit = parsePropertyDeposit(property)
        if (listingDeposit == null) return app
        return {
          ...app,
          depositAmount: listingDeposit,
          propertyDepositAmount: listingDeposit,
          property,
        }
      })
      setApplications(enriched)
      notifyNewBookingDecisions(enriched, pushToast)
    } catch (e) {
      setApplications([])
      setPropertyById({})
      pushToast({ message: e.message || 'Unable to load your bookings.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [user?.id, pushToast])

  useEffect(() => {
    if (user?.id) loadApplications()
  }, [user?.id, loadApplications])

  const loadReviewedProperties = useCallback(async () => {
    const token = localStorage.getItem('mysewa_token')
    if (!token) {
      setReviewedPropertyIds(new Set())
      return
    }
    try {
      const data = await fetchStudentReviews(token)
      const ids = new Set(
        (Array.isArray(data.items) ? data.items : [])
          .map((r) => Number(r.propertyId))
          .filter((id) => Number.isFinite(id)),
      )
      setReviewedPropertyIds(ids)
    } catch {
      setReviewedPropertyIds(new Set())
    }
  }, [])

  useEffect(() => {
    if (user?.id) loadReviewedProperties()
  }, [user?.id, loadReviewedProperties])

  function mergeApplicationRow(updated) {
    if (!updated?.id) return
    setApplications((prev) =>
      prev.map((row) => {
        if (Number(row.id) !== Number(updated.id)) return row
        const merged = { ...row, ...updated }
        if (updated.depositPaid !== undefined) merged.depositPaid = updated.depositPaid
        else merged.depositPaid = true
        return merged
      }),
    )
    if (detailApp?.id === updated.id) {
      setDetailApp((prev) => (prev ? { ...prev, ...updated, depositPaid: updated.depositPaid ?? true } : prev))
    }
  }

  function handlePayDeposit(app) {
    setDetailApp(null)
    setDepositModalApp(app)
  }

  if (authLoading) {
    return (
      <StudentLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA]">
          <p className="text-sm text-[#A0AEC0]">Loading…</p>
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
      {depositModalApp ? (
        <StudentDepositModal
          application={depositModalApp}
          onClose={() => setDepositModalApp(null)}
          onCompleted={(item) => mergeApplicationRow(item)}
        />
      ) : null}

      {detailApp ? (
        <StudentBookingDetailModal
          application={detailApp}
          onClose={() => setDetailApp(null)}
          onPayDeposit={handlePayDeposit}
        />
      ) : null}

      {reviewTarget ? (
        <ReviewForm
          propertyId={reviewTarget.propertyId}
          bookingId={reviewTarget.id}
          propertyName={reviewTarget.propertyName}
          onClose={() => setReviewTarget(null)}
          onSubmitted={() => {
            loadReviewedProperties()
            setReviewTarget(null)
          }}
        />
      ) : null}

      <StudentBookings
        applications={applications}
        propertyById={propertyById}
        loading={loading}
        onViewDetails={setDetailApp}
        onPayDeposit={handlePayDeposit}
        onLeaveReview={setReviewTarget}
        reviewedPropertyIds={reviewedPropertyIds}
        onBrowse={() => navigate('/properties')}
      />
    </StudentLayout>
  )
}
