import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudentLayout from '../components/StudentLayout'
import ReviewForm from '../components/student/ReviewForm'
import { useStudentGuard } from '../hooks/useStudentGuard'
import { useToast } from '../context/ToastContext'
import { fetchStudentReviews } from '../services/reviewService'
import { canLeaveReview, isReviewEligibleApplication } from '../utils/reviewEligibility'
import StudentReviews from './dashboard/StudentReviews'

async function readApiErrorMessage(res) {
  const text = await res.text().catch(() => '')
  const trimmed = text.trim()
  if (!trimmed) return `Request failed (${res.status})`
  try {
    const data = JSON.parse(trimmed)
    if (data?.message) return data.message
  } catch {
    /* ignore */
  }
  return trimmed.length < 220 ? trimmed : `Request failed (${res.status})`
}

function buildReviewedPropertyIds(reviews) {
  return new Set(
    (Array.isArray(reviews) ? reviews : [])
      .map((r) => Number(r.propertyId))
      .filter((id) => Number.isFinite(id)),
  )
}

export default function StudentReviewsPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, error: authError } = useStudentGuard()
  const { pushToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState([])
  const [submittedReviews, setSubmittedReviews] = useState([])
  const [reviewTarget, setReviewTarget] = useState(null)

  const [editingId, setEditingId] = useState(null)
  const [editRating, setEditRating] = useState(5)
  const [editComment, setEditComment] = useState('')
  const [savingId, setSavingId] = useState(null)

  const reviewedPropertyIds = useMemo(
    () => buildReviewedPropertyIds(submittedReviews),
    [submittedReviews],
  )

  const approvedBookings = useMemo(
    () => applications.filter((a) => isReviewEligibleApplication(a)),
    [applications],
  )

  const pendingBookings = useMemo(
    () => approvedBookings.filter((a) => canLeaveReview(a, reviewedPropertyIds)),
    [approvedBookings, reviewedPropertyIds],
  )

  const applicationByPropertyId = useMemo(() => {
    const map = {}
    for (const app of approvedBookings) {
      const pid = Number(app.propertyId)
      if (!Number.isFinite(pid)) continue
      if (!map[pid]) map[pid] = app
    }
    return map
  }, [approvedBookings])

  const loadData = useCallback(async () => {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !user?.id) return
    setLoading(true)
    try {
      const [appsRes, reviewsData] = await Promise.all([
        fetch('/api/v1/applications/for-student', { headers: { Authorization: `Bearer ${token}` } }),
        fetchStudentReviews(token),
      ])

      const appsData = await appsRes.json().catch(() => ({}))
      if (appsRes.ok) {
        setApplications(Array.isArray(appsData.items) ? appsData.items : [])
      } else {
        setApplications([])
        pushToast({ message: appsData.message || 'Unable to load your bookings.', type: 'error' })
      }

      setSubmittedReviews(Array.isArray(reviewsData.items) ? reviewsData.items : [])
    } catch (e) {
      setApplications([])
      setSubmittedReviews([])
      pushToast({ message: e.message || 'Unable to load reviews.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [user?.id, pushToast])

  useEffect(() => {
    if (user?.id) loadData()
  }, [user?.id, loadData])

  function handleEdit(review) {
    setEditingId(review.id)
    setEditRating(review.ratingOverall ?? review.rating ?? 5)
    setEditComment(review.publicComment || review.comment || '')
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditRating(5)
    setEditComment('')
  }

  async function handleSaveEdit(review) {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !review?.id) return
    setSavingId(review.id)
    try {
      const res = await fetch(`/api/v1/reviews/${review.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          propertyId: review.propertyId,
          rating: editRating,
          comment: editComment.trim(),
        }),
      })
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      pushToast({ message: 'Review updated.', type: 'success' })
      handleCancelEdit()
      await loadData()
    } catch (err) {
      pushToast({ message: err.message || 'Could not update review.', type: 'error' })
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(review) {
    if (!review?.id) return
    if (!window.confirm('Delete this review? This cannot be undone.')) return
    const token = localStorage.getItem('mysewa_token')
    if (!token) return
    setSavingId(review.id)
    try {
      const res = await fetch(`/api/v1/reviews/${review.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      pushToast({ message: 'Review deleted.', type: 'success' })
      if (editingId === review.id) handleCancelEdit()
      await loadData()
    } catch (err) {
      pushToast({ message: err.message || 'Could not delete review.', type: 'error' })
    } finally {
      setSavingId(null)
    }
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
      {reviewTarget ? (
        <ReviewForm
          propertyId={reviewTarget.propertyId}
          bookingId={reviewTarget.id}
          propertyName={reviewTarget.propertyName || `Property #${reviewTarget.propertyId}`}
          onClose={() => setReviewTarget(null)}
          onSubmitted={() => {
            setReviewTarget(null)
            loadData()
          }}
        />
      ) : null}

      <StudentReviews
        loading={loading}
        pendingBookings={pendingBookings}
        submittedReviews={submittedReviews}
        applicationByPropertyId={applicationByPropertyId}
        editingId={editingId}
        editRating={editRating}
        editComment={editComment}
        savingId={savingId}
        onLeaveReview={setReviewTarget}
        onEdit={handleEdit}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
        onDelete={handleDelete}
        onEditRatingChange={setEditRating}
        onEditCommentChange={setEditComment}
        onBrowseProperties={() => navigate('/properties')}
      />
    </StudentLayout>
  )
}
