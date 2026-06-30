import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useToast } from '../../context/ToastContext'
import { submitReview, uploadReviewPhotos } from '../../services/reviewService'
import {
  CATEGORY_COMMENT_MAX,
  MAX_REVIEW_PHOTOS,
  PUBLIC_COMMENT_MAX,
  REVIEW_CATEGORIES,
} from '../../utils/reviewCategories'
import AnimatedStarRating, {
  AnonymousToggle,
  AnimatedStarRow,
  computeRatingsAverage,
} from '../reviews/AnimatedStarRating'

function emptyRatings() {
  return REVIEW_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.key]: 0 }), {})
}

export default function ReviewForm({
  propertyId,
  bookingId,
  propertyName,
  onClose,
  onSubmitted,
}) {
  const { pushToast } = useToast()
  const [ratings, setRatings] = useState(emptyRatings)
  const [publicComment, setPublicComment] = useState('')
  const [photoFiles, setPhotoFiles] = useState([])
  const [anonymous, setAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const photoPreviews = useMemo(
    () => photoFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [photoFiles],
  )

  const liveAverage = useMemo(
    () => computeRatingsAverage(ratings, REVIEW_CATEGORIES.map((c) => c.key)),
    [ratings],
  )

  const ratedCount = useMemo(
    () => REVIEW_CATEGORIES.filter((c) => Number(ratings[c.key]) > 0).length,
    [ratings],
  )

  function handlePhotoChange(e) {
    const picked = Array.from(e.target.files || [])
    if (!picked.length) return
    setPhotoFiles((prev) => {
      const merged = [...prev, ...picked].slice(0, MAX_REVIEW_PHOTOS)
      if (prev.length + picked.length > MAX_REVIEW_PHOTOS) {
        pushToast({ message: `You can attach up to ${MAX_REVIEW_PHOTOS} photos.`, type: 'error' })
      }
      return merged
    })
    e.target.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const token = localStorage.getItem('mysewa_token')
    if (!token) {
      pushToast({ message: 'Sign in as a student to leave a review.', type: 'error' })
      return
    }

    for (const cat of REVIEW_CATEGORIES) {
      const stars = Number(ratings[cat.key])
      if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
        pushToast({ message: `Please rate: ${cat.label}`, type: 'error' })
        return
      }
    }

    setSubmitting(true)
    try {
      let photoUrls = []
      if (photoFiles.length > 0) {
        const upload = await uploadReviewPhotos(photoFiles, token)
        photoUrls = Array.isArray(upload.files) ? upload.files : []
      }

      const payload = {
        propertyId: Number(propertyId),
        bookingId: bookingId != null ? Number(bookingId) : undefined,
        ratingCleanliness: ratings.cleanliness,
        ratingCondition: ratings.condition,
        ratingAmenities: ratings.amenities,
        ratingLandlord: ratings.landlord,
        ratingLocation: ratings.location,
        ratingValue: ratings.value,
        ratingOverall: ratings.overall,
        publicComment: publicComment.trim() || undefined,
        photos: photoUrls,
        anonymous,
      }

      await submitReview(payload, token)
      setSuccess(true)
      pushToast({ message: '✅ Thank you — your review was submitted!', type: 'success' })
      setTimeout(() => {
        onSubmitted?.()
        onClose?.()
      }, 1200)
    } catch (err) {
      pushToast({ message: err.message || 'Could not submit review.', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="presentation"
        onClick={submitting || success ? undefined : onClose}
      >
        <motion.div
          className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-form-title"
          onClick={(ev) => ev.stopPropagation()}
        >
          <div className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-white/95 px-6 py-5 backdrop-blur sm:px-8">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-[#A0AEC0] transition hover:bg-[#F7FAFC] hover:text-[#2D3748]"
              aria-label="Close"
            >
              ✕
            </button>
            <h2 id="review-form-title" className="text-xl font-bold text-[#2D3748]">
              <span aria-hidden="true">⭐ </span>
              How was your stay?
            </h2>
            {propertyName ? (
              <p className="mt-1 text-sm text-[#718096]">
                Share your experience at <strong className="text-[#2D3748]">{propertyName}</strong>
              </p>
            ) : null}
            {liveAverage != null ? (
              <motion.div
                key={liveAverage}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#FFFBEB] px-3 py-1.5 text-sm font-semibold text-[#B45309]"
              >
                <AnimatedStarRow value={liveAverage} size="sm" />
                <span>Live average: {liveAverage.toFixed(1)}</span>
                <span className="text-xs font-normal text-[#D97706]">({ratedCount}/7 rated)</span>
              </motion.div>
            ) : null}
          </div>

          {success ? (
            <motion.div
              className="flex flex-col items-center justify-center px-8 py-16 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <motion.div
                className="flex h-20 w-20 items-center justify-center rounded-full bg-[#D1FAE5] text-4xl"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: 2, duration: 0.5 }}
              >
                ✨
              </motion.div>
              <p className="mt-4 text-lg font-bold text-[#2D3748]">Review submitted!</p>
              <p className="mt-1 text-sm text-[#718096]">Thanks for helping future tenants.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6 sm:px-8">
              <p className="text-sm font-semibold text-[#4A5568]">Rate each category</p>

              {REVIEW_CATEGORIES.map((cat, index) => {
                const labelId = `review-cat-${cat.key}`
                return (
                  <motion.div
                    key={cat.key}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="flex flex-col gap-2 rounded-xl border border-[#E2E8F0] bg-[#FAFAFA] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p id={labelId} className="text-sm font-semibold text-[#2D3748]">
                      <span aria-hidden="true">{cat.emoji} </span>
                      {cat.shortLabel || cat.label}
                    </p>
                    <AnimatedStarRating
                      labelId={labelId}
                      value={Number(ratings[cat.key]) || 0}
                      onChange={(n) => setRatings((prev) => ({ ...prev, [cat.key]: n }))}
                      disabled={submitting}
                      showHint={cat.key === 'cleanliness'}
                    />
                  </motion.div>
                )
              })}

              <div>
                <label className="text-sm font-semibold text-[#2D3748]" htmlFor="review-public-comment">
                  <span aria-hidden="true">📝 </span>
                  Write your review (optional)
                </label>
                <textarea
                  id="review-public-comment"
                  rows={4}
                  maxLength={PUBLIC_COMMENT_MAX}
                  value={publicComment}
                  onChange={(ev) => setPublicComment(ev.target.value.slice(0, PUBLIC_COMMENT_MAX))}
                  disabled={submitting}
                  placeholder="What did you like? What could be improved?"
                  className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#2D3748] outline-none transition focus:border-[#6C2BD9] focus:ring-2 focus:ring-[#6C2BD9]/20"
                />
                <p className="mt-1 text-right text-xs text-[#A0AEC0]">
                  {publicComment.length}/{PUBLIC_COMMENT_MAX}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#2D3748]">
                  <span aria-hidden="true">📸 </span>
                  Add photos (optional)
                </p>
                <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#E2E8F0] bg-[#FAFAFA] px-4 py-6 transition hover:border-[#6C2BD9] hover:bg-[#F9F7FF]">
                  <span className="text-2xl" aria-hidden="true">
                    📷
                  </span>
                  <span className="mt-2 text-sm font-medium text-[#4A5568]">
                    Upload up to {MAX_REVIEW_PHOTOS} photos
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    disabled={submitting || photoFiles.length >= MAX_REVIEW_PHOTOS}
                    onChange={handlePhotoChange}
                    className="sr-only"
                  />
                </label>
                {photoPreviews.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {photoPreviews.map((preview, index) => (
                      <motion.div
                        key={preview.url}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative"
                      >
                        <img
                          src={preview.url}
                          alt=""
                          className="h-20 w-20 rounded-xl border border-[#E2E8F0] object-cover shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setPhotoFiles((prev) => prev.filter((_, i) => i !== index))}
                          disabled={submitting}
                          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow"
                          aria-label="Remove photo"
                        >
                          ✕
                        </button>
                      </motion.div>
                    ))}
                  </div>
                ) : null}
              </div>

              <AnonymousToggle anonymous={anonymous} onChange={setAnonymous} disabled={submitting} />

              <div className="flex flex-col gap-3 border-t border-[#E2E8F0] pt-4 sm:flex-row">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={onClose}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-5 py-3 text-sm font-semibold text-[#2D3748] transition hover:bg-[#F7FAFC] disabled:opacity-60"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={submitting ? undefined : { scale: 1.02 }}
                  whileTap={submitting ? undefined : { scale: 0.98 }}
                  animate={submitting ? { opacity: [1, 0.7, 1] } : {}}
                  transition={submitting ? { repeat: Infinity, duration: 1.2 } : {}}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#6C2BD9] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#5B21B6] disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true">✨</span>
                      Submit Review
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
