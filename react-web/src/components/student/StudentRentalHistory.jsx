import { motion } from 'framer-motion'
import { AnimatedStarRow } from '../reviews/AnimatedStarRating'
import { canLeaveReview, isReviewEligibleApplication } from '../../utils/reviewEligibility'

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

function RentalHistoryCard({ application, property, reviewedPropertyIds, onLeaveReview, index }) {
  const canReview = canLeaveReview(application, reviewedPropertyIds)
  const avg = property?.averageRating
  const count = property?.reviewCount ?? 0
  const moveOut = application.leaseEnd || application.leaseEndDate

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -3 }}
      className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm transition hover:shadow-lg"
    >
      <h3 className="text-lg font-bold text-[#2D3748]">
        <span aria-hidden="true">🏠 </span>
        {application.propertyName || property?.name || `Property #${application.propertyId}`}
      </h3>
      <p className="mt-2 text-sm text-[#718096]">
        <span aria-hidden="true">📅 </span>
        {formatDateRange(application.preferredMoveIn, moveOut)}
      </p>
      {avg != null && Number(avg) > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#4A5568]">
          <AnimatedStarRow value={avg} />
          <span>
            Average: <strong className="text-[#2D3748]">{Number(avg).toFixed(1)}</strong>
            {count ? ` (${count} review${count === 1 ? '' : 's'})` : ''}
          </span>
        </div>
      ) : null}
      {canReview ? (
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onLeaveReview?.(application)}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#6C2BD9] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#5B21B6]"
        >
          <span aria-hidden="true">✍️</span>
          Leave a Review
        </motion.button>
      ) : (
        <p className="mt-4 text-xs font-medium text-[#10B981]">✅ Review submitted</p>
      )}
    </motion.article>
  )
}

export default function StudentRentalHistory({
  applications = [],
  propertyById = {},
  reviewedPropertyIds = new Set(),
  onLeaveReview,
}) {
  const reviewable = applications.filter((app) => isReviewEligibleApplication(app))

  if (!reviewable.length) return null

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-[#2D3748]">
        <span aria-hidden="true">📋 </span>
        My Rental History
      </h2>
      <p className="mt-1 text-sm text-[#A0AEC0]">Approved rentals — share your experience</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {reviewable.map((application, index) => (
          <RentalHistoryCard
            key={application.id}
            application={application}
            property={propertyById[Number(application.propertyId)]}
            reviewedPropertyIds={reviewedPropertyIds}
            onLeaveReview={onLeaveReview}
            index={index}
          />
        ))}
      </div>
    </section>
  )
}
