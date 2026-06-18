import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../context/ToastContext'

async function readApiErrorMessage(res) {
  const text = await res.text().catch(() => '')
  const trimmed = text.trim()
  if (!trimmed) return `Request failed (${res.status})`
  try {
    const data = JSON.parse(trimmed)
    if (data && typeof data.message === 'string' && data.message.trim()) return data.message.trim()
  } catch {
    /* not JSON */
  }
  if (trimmed.length < 220) return trimmed
  return `Request failed (${res.status})`
}

function StarsInput({ value, onChange, disabled }) {
  return (
    <div className="pv-reviews-stars-input" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`pv-reviews-star-btn${value >= n ? ' pv-reviews-star-btn--on' : ''}`}
          disabled={disabled}
          aria-checked={value === n}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function PropertyReviewsSection({ propertyId, onPropertyRefresh, hideSectionTitle = false }) {
  const { pushToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [canSubmit, setCanSubmit] = useState(false)
  const [myReview, setMyReview] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!propertyId) return
    setLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('mysewa_token') : null
      const res = await fetch(`/api/v1/reviews/for-property/${encodeURIComponent(propertyId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      const data = await res.json().catch(() => ({}))
      setItems(Array.isArray(data.items) ? data.items : [])
      setCanSubmit(Boolean(data.canSubmitReview))
      setMyReview(data.myReview || null)
    } catch (e) {
      setItems([])
      setCanSubmit(false)
      setMyReview(null)
      pushToast({ message: e.message || 'Could not load reviews.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [propertyId, pushToast])

  useEffect(() => {
    load()
  }, [load])

  async function submitReview(e) {
    e.preventDefault()
    const token = localStorage.getItem('mysewa_token')
    if (!token) {
      pushToast({ message: 'Sign in as a student to leave a review.', type: 'error' })
      return
    }
    const pid = Number(propertyId)
    const stars = Number(rating)
    if (!Number.isFinite(pid) || pid <= 0) {
      pushToast({ message: 'Invalid listing — cannot submit review.', type: 'error' })
      return
    }
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
      pushToast({ message: 'Pick a rating from 1 to 5.', type: 'error' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ propertyId: pid, rating: stars, comment: comment.trim() }),
      })
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      pushToast({ message: 'Thanks — your review was posted.', type: 'success' })
      setComment('')
      setRating(5)
      await load()
      if (typeof onPropertyRefresh === 'function') onPropertyRefresh()
    } catch (err) {
      pushToast({ message: err.message || 'Could not submit review.', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      className={`pv-section pv-section--reviews${hideSectionTitle ? ' pv-section--reviews-embed' : ''}`}
      aria-labelledby={hideSectionTitle ? undefined : 'pv-reviews-heading'}
      aria-label={hideSectionTitle ? 'Reviews and ratings' : undefined}
    >
      {hideSectionTitle ? null : (
        <h3 id="pv-reviews-heading" className="pv-section-title">
          Reviews &amp; ratings
        </h3>
      )}
      {loading ? <p className="pv-section-text">Loading reviews…</p> : null}
      {!loading && myReview ? (
        <p className="pv-reviews-your-review">
          <strong>Your review:</strong> {myReview.rating}/5 — {myReview.comment}
        </p>
      ) : null}
      {!loading && canSubmit ? (
        <form className="pv-reviews-form" onSubmit={submitReview}>
          <p className="pv-section-text">You have an accepted application for this listing — share a quick rating.</p>
          <label className="pv-reviews-label">Rating</label>
          <StarsInput value={rating} onChange={setRating} disabled={submitting} />
          <label className="pv-reviews-label" htmlFor="pv-review-comment">
            Comment
          </label>
          <textarea
            id="pv-review-comment"
            className="pv-reviews-textarea"
            rows={3}
            maxLength={4000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="At least 10 characters about the listing or landlord communication."
            disabled={submitting}
          />
          <button type="submit" className="pv-reviews-submit" disabled={submitting || comment.trim().length < 10}>
            {submitting ? 'Posting…' : 'Post review'}
          </button>
        </form>
      ) : null}
      {!loading && !items.length && !canSubmit && !myReview ? (
        <p className="pv-section-text">No reviews yet. Accepted tenants can leave the first review.</p>
      ) : null}
      {!loading && items.length > 0 ? (
        <ul className="pv-reviews-list">
          {items.map((r) => (
            <li key={r.id} className="pv-reviews-item">
              <div className="pv-reviews-item-top">
                <span className="pv-reviews-item-name">{r.studentDisplayName || 'Student'}</span>
                <span className="pv-reviews-item-stars" aria-label={`${r.rating} of 5`}>
                  {'★'.repeat(r.rating)}
                  <span className="pv-reviews-item-stars-muted">{'★'.repeat(5 - r.rating)}</span>
                </span>
              </div>
              <p className="pv-reviews-item-text">{r.comment}</p>
              {r.createdAt ? <p className="pv-reviews-item-date">{new Date(r.createdAt).toLocaleString()}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
