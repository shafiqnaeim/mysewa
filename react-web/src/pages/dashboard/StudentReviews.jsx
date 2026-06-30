import { motion } from 'framer-motion'
import { AnimatedStarRow } from '../../components/reviews/AnimatedStarRating'

function formatDateRange(moveIn, moveOut) {
  const fmt = (value) => {
    if (!value) return '—'
    try {
      const d = new Date(value.includes('T') ? value : `${value}T12:00:00`)
      if (Number.isNaN(d.getTime())) return String(value)
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return '—'
    }
  }
  return `${fmt(moveIn)} — ${fmt(moveOut)}`
}

function StarRatingInput({ rating, onChange, disabled = false, size = 'lg' }) {
  const sizeClass = size === 'lg' ? 'text-2xl' : 'text-base'
  return (
    <div className={`inline-flex gap-1 ${sizeClass}`} role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(n)}
          className={`transition ${rating >= n ? 'text-[#F59E0B]' : 'text-[#E5E7EB]'} ${onChange ? 'hover:scale-110' : ''}`}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function PendingRentalCard({ application, onLeaveReview, index }) {
  const moveOut = application.leaseEnd || application.leaseEndDate
  const name = application.propertyName || `Property #${application.propertyId}`

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm"
    >
      <h3 className="text-lg font-bold text-[#2D3748]">
        <span aria-hidden="true">🏠 </span>
        {name}
      </h3>
      <p className="mt-2 text-sm text-[#718096]">
        <span aria-hidden="true">📅 </span>
        {formatDateRange(application.preferredMoveIn, moveOut)}
      </p>
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onLeaveReview?.(application)}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#6C2BD9] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#5B21B6]"
      >
        <span aria-hidden="true">⭐</span>
        Leave a Review
      </motion.button>
    </motion.article>
  )
}

function SubmittedReviewCard({
  review,
  application,
  editing,
  editRating,
  editComment,
  saving,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onEditRatingChange,
  onEditCommentChange,
  index,
}) {
  const name = review.propertyName || application?.propertyName || `Property #${review.propertyId}`
  const moveOut = application?.leaseEnd || application?.leaseEndDate
  const rating = review.ratingOverall ?? review.rating ?? 0
  const comment = review.publicComment || review.comment || ''

  if (editing) {
    return (
      <article className="rounded-2xl border border-[#6C2BD9] bg-[#F9F7FF] p-6 shadow-sm">
        <h3 className="font-bold text-[#2D3748]">
          <span aria-hidden="true">🏠 </span>
          {name}
        </h3>
        <div className="mt-4">
          <p className="text-sm font-medium text-[#4B5563]">Rating</p>
          <StarRatingInput rating={editRating} onChange={onEditRatingChange} size="lg" />
        </div>
        <label className="mt-4 block text-sm font-medium text-[#4B5563]" htmlFor={`edit-comment-${review.id}`}>
          Comment
        </label>
        <textarea
          id={`edit-comment-${review.id}`}
          rows={4}
          value={editComment}
          onChange={(e) => onEditCommentChange(e.target.value)}
          disabled={saving}
          maxLength={4000}
          className="mt-2 w-full rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-sm outline-none focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving || editComment.trim().length < 10}
            onClick={onSaveEdit}
            className="rounded-lg bg-[#6C2BD9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5B21B6] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onCancelEdit}
            className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#4B5563] hover:bg-[#FAFAFA]"
          >
            Cancel
          </button>
        </div>
      </article>
    )
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm"
    >
      <h3 className="text-lg font-bold text-[#2D3748]">
        <span aria-hidden="true">🏠 </span>
        {name}
      </h3>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#4A5568]">
        <AnimatedStarRow value={rating} size="sm" />
        <span>
          <strong className="text-[#2D3748]">{Number(rating).toFixed(1)}</strong>
          {application ? (
            <>
              {' '}
              · {formatDateRange(application.preferredMoveIn, moveOut)}
            </>
          ) : null}
        </span>
      </div>
      {comment ? (
        <p className="mt-3 text-sm leading-relaxed text-[#4B5563]">&ldquo;{comment}&rdquo;</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-[#6C2BD9] bg-white px-4 py-2 text-xs font-semibold text-[#6C2BD9] hover:bg-[#F3F0FF]"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-[#EF4444] bg-white px-4 py-2 text-xs font-semibold text-[#EF4444] hover:bg-[#FEF2F2]"
        >
          Delete
        </button>
      </div>
    </motion.article>
  )
}

export default function StudentReviews({
  loading = false,
  pendingBookings = [],
  submittedReviews = [],
  applicationByPropertyId = {},
  editingId = null,
  editRating = 5,
  editComment = '',
  savingId = null,
  onLeaveReview,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onEditRatingChange,
  onEditCommentChange,
  onBrowseProperties,
}) {
  const hasApproved = pendingBookings.length > 0 || submittedReviews.length > 0
  const hasSubmitted = submittedReviews.length > 0

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
            <span aria-hidden="true">⭐ </span>
            My Reviews
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">Share your experience with properties and landlords</p>
        </header>

        {loading ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-12 text-center shadow-sm">
            <p className="text-sm text-[#6B7280]">Loading your reviews…</p>
          </div>
        ) : !hasApproved ? (
          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-12 text-center shadow-sm">
            <p className="text-base font-semibold text-[#2D3748]">You don&apos;t have any approved bookings yet</p>
            <p className="mt-2 text-sm text-[#718096]">Browse properties and apply to get started</p>
            <button
              type="button"
              onClick={onBrowseProperties}
              className="mt-6 rounded-xl bg-[#6C2BD9] px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#5B21B6]"
            >
              Browse Properties
            </button>
          </section>
        ) : (
          <>
            {pendingBookings.length > 0 ? (
              <section>
                <h2 className="text-lg font-bold text-[#2D3748]">
                  <span aria-hidden="true">📋 </span>
                  Your Approved Rentals
                </h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {pendingBookings.map((application, index) => (
                    <PendingRentalCard
                      key={application.id ?? `${application.propertyId}-${index}`}
                      application={application}
                      onLeaveReview={onLeaveReview}
                      index={index}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {hasSubmitted ? (
              <section>
                <h2 className="text-lg font-bold text-[#2D3748]">
                  <span aria-hidden="true">✅ </span>
                  Your Reviews
                </h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {submittedReviews.map((review, index) => (
                    <SubmittedReviewCard
                      key={review.id}
                      review={review}
                      application={
                        applicationByPropertyId[Number(review.propertyId)] ||
                        (review.bookingId
                          ? Object.values(applicationByPropertyId).find(
                              (a) => Number(a?.id) === Number(review.bookingId),
                            )
                          : null)
                      }
                      editing={editingId === review.id}
                      editRating={editRating}
                      editComment={editComment}
                      saving={savingId === review.id}
                      onEdit={() => onEdit(review)}
                      onCancelEdit={onCancelEdit}
                      onSaveEdit={() => onSaveEdit(review)}
                      onDelete={() => onDelete(review)}
                      onEditRatingChange={onEditRatingChange}
                      onEditCommentChange={onEditCommentChange}
                      index={index}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
