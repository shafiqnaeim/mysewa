function formatRelativeTime(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const diff = Date.now() - d.getTime()
    const days = Math.floor(diff / 86400000)
    if (days < 1) return 'today'
    if (days === 1) return '1 day ago'
    if (days < 30) return `${days} days ago`
    const months = Math.floor(days / 30)
    if (months === 1) return '1 month ago'
    return `${months} months ago`
  } catch {
    return ''
  }
}

function StarRating({ rating, onChange, disabled = false, size = 'lg' }) {
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

function ReviewCard({ review, editing, editRating, editComment, saving, onEdit, onCancelEdit, onSaveEdit, onDelete, onEditRatingChange, onEditCommentChange }) {
  if (editing) {
    return (
      <article className="rounded-xl border border-[#6C2BD9] bg-[#F9F7FF] p-6 shadow-sm">
        <h3 className="font-bold text-[#1A1A2E]">{review.propertyName}</h3>
        <div className="mt-4">
          <p className="text-sm font-medium text-[#4B5563]">Rating</p>
          <StarRating rating={editRating} onChange={onEditRatingChange} size="lg" />
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
    <article className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <h3 className="font-bold text-[#1A1A2E]">{review.propertyName}</h3>
      <div className="mt-2">
        <StarRating rating={review.rating} size="sm" />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#4B5563]">{review.comment}</p>
      <p className="mt-3 text-xs text-[#6B7280]">
        Posted: {formatRelativeTime(review.createdAt) || '—'}
      </p>
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
    </article>
  )
}

export default function StudentReviews({
  loading = false,
  currentProperty,
  canSubmitReview = false,
  rating = 5,
  comment = '',
  submitting = false,
  pastReviews = [],
  editingId = null,
  editRating = 5,
  editComment = '',
  savingId = null,
  onRatingChange,
  onCommentChange,
  onSubmitReview,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onEditRatingChange,
  onEditCommentChange,
  onBrowseProperties,
}) {
  const showWriteForm = canSubmitReview && currentProperty

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
            <span aria-hidden="true">⭐ </span>
            My Reviews
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">Share your experience with properties and landlords</p>
        </header>

        {loading ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-12 text-center shadow-sm">
            <p className="text-sm text-[#6B7280]">Loading reviews…</p>
          </div>
        ) : (
          <>
            {showWriteForm ? (
              <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#1A1A2E]">
                  <span aria-hidden="true">📝 </span>
                  Write a Review
                </h2>
                <p className="mt-2 text-sm text-[#6B7280]">
                  Property: <strong className="text-[#1A1A2E]">{currentProperty.name}</strong>
                </p>

                <form className="mt-6 space-y-4" onSubmit={onSubmitReview}>
                  <div>
                    <p className="text-sm font-medium text-[#4B5563]">Rating</p>
                    <div className="mt-2">
                      <StarRating rating={rating} onChange={onRatingChange} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="student-review-comment" className="text-sm font-medium text-[#4B5563]">
                      Comment
                    </label>
                    <textarea
                      id="student-review-comment"
                      rows={4}
                      value={comment}
                      onChange={(e) => onCommentChange(e.target.value)}
                      disabled={submitting}
                      maxLength={4000}
                      placeholder="At least 10 characters about the listing…"
                      className="mt-2 w-full rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-sm outline-none focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || comment.trim().length < 10}
                    className="rounded-lg bg-[#6C2BD9] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6] disabled:opacity-50"
                  >
                    {submitting ? 'Posting…' : 'Post Review'}
                  </button>
                </form>
              </section>
            ) : currentProperty && !canSubmitReview ? (
              <section className="rounded-xl border border-[#E2E8F0] bg-[#F9F7FF] p-6 shadow-sm">
                <p className="text-sm text-[#4B5563]">
                  You have already reviewed <strong>{currentProperty.name}</strong>, or you need an accepted
                  application before you can leave a review.
                </p>
              </section>
            ) : !currentProperty ? (
              <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#6B7280]">
                  Get an accepted rental application to leave a review for your property.
                </p>
                <button
                  type="button"
                  onClick={onBrowseProperties}
                  className="mt-4 rounded-lg bg-[#6C2BD9] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6]"
                >
                  Browse Properties
                </button>
              </section>
            ) : null}

            <section>
              <h2 className="text-lg font-bold text-[#1A1A2E]">
                <span aria-hidden="true">📋 </span>
                Your Past Reviews
              </h2>

              {!hasPastReviews ? (
                <div className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-10 text-center shadow-sm">
                  <p className="text-sm font-medium text-[#1A1A2E]">You haven&apos;t left any reviews yet</p>
                  <button
                    type="button"
                    onClick={onBrowseProperties}
                    className="mt-6 rounded-lg bg-[#6C2BD9] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6]"
                  >
                    Browse Properties
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {pastReviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
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
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
