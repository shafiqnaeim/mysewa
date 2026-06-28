import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudentLayout from '../components/StudentLayout'
import { useStudentGuard } from '../hooks/useStudentGuard'
import { useToast } from '../context/ToastContext'
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

export default function StudentReviewsPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, error: authError } = useStudentGuard()
  const { pushToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState([])
  const [pastReviews, setPastReviews] = useState([])
  const [canSubmitReview, setCanSubmitReview] = useState(false)

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editRating, setEditRating] = useState(5)
  const [editComment, setEditComment] = useState('')
  const [savingId, setSavingId] = useState(null)

  const acceptedApplications = useMemo(
    () => applications.filter((a) => String(a.status || '').toLowerCase() === 'accepted' && a.propertyId != null),
    [applications],
  )

  const primaryApplication = useMemo(() => {
    if (!acceptedApplications.length) return null
    return [...acceptedApplications].sort((a, b) => {
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime()
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime()
      return tb - ta
    })[0]
  }, [acceptedApplications])

  const currentProperty = useMemo(() => {
    if (!primaryApplication) return null
    return {
      id: primaryApplication.propertyId,
      name: primaryApplication.propertyName || `Property #${primaryApplication.propertyId}`,
    }
  }, [primaryApplication])

  const loadReviews = useCallback(async () => {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !user?.id) return
    setLoading(true)
    try {
      const [appsRes, reviewsRes] = await Promise.all([
        fetch('/api/v1/applications/for-student', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/reviews/for-student', { headers: { Authorization: `Bearer ${token}` } }),
      ])

      const appsData = await appsRes.json().catch(() => ({}))
      if (appsRes.ok) setApplications(Array.isArray(appsData.items) ? appsData.items : [])

      const reviewsData = await reviewsRes.json().catch(() => ({}))
      if (!reviewsRes.ok) throw new Error(reviewsData.message || `Failed to load reviews (HTTP ${reviewsRes.status})`)
      setPastReviews(Array.isArray(reviewsData.items) ? reviewsData.items : [])
    } catch (e) {
      setPastReviews([])
      pushToast({ message: e.message || 'Unable to load reviews.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [user?.id, pushToast])

  const loadCanSubmit = useCallback(async () => {
    if (!currentProperty?.id) {
      setCanSubmitReview(false)
      return
    }
    const token = localStorage.getItem('mysewa_token')
    if (!token) return
    try {
      const res = await fetch(`/api/v1/reviews/for-property/${encodeURIComponent(currentProperty.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setCanSubmitReview(Boolean(data.canSubmitReview))
      else setCanSubmitReview(false)
    } catch {
      setCanSubmitReview(false)
    }
  }, [currentProperty?.id])

  useEffect(() => {
    if (user?.id) loadReviews()
  }, [user?.id, loadReviews])

  useEffect(() => {
    loadCanSubmit()
  }, [loadCanSubmit, pastReviews])

  async function handleSubmitReview(e) {
    e.preventDefault()
    const token = localStorage.getItem('mysewa_token')
    if (!token || !currentProperty?.id) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          propertyId: currentProperty.id,
          rating,
          comment: comment.trim(),
        }),
      })
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      pushToast({ message: 'Thanks — your review was posted.', type: 'success' })
      setComment('')
      setRating(5)
      await loadReviews()
      await loadCanSubmit()
    } catch (err) {
      pushToast({ message: err.message || 'Could not post review.', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(review) {
    setEditingId(review.id)
    setEditRating(review.rating || 5)
    setEditComment(review.comment || '')
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
      await loadReviews()
      await loadCanSubmit()
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
      await loadReviews()
      await loadCanSubmit()
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
      <StudentReviews
        loading={loading}
        currentProperty={currentProperty}
        canSubmitReview={canSubmitReview}
        rating={rating}
        comment={comment}
        submitting={submitting}
        pastReviews={pastReviews}
        editingId={editingId}
        editRating={editRating}
        editComment={editComment}
        savingId={savingId}
        onRatingChange={setRating}
        onCommentChange={setComment}
        onSubmitReview={handleSubmitReview}
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
