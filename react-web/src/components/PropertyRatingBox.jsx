import { formatRatingScore, propertyReviewCount } from '../utils/propertyDisplay'

/**
 * Rating pill + "N Reviews" beside it.
 */
export default function PropertyRatingBox({ item, size = 'md', className = '' }) {
  const score = formatRatingScore(item)
  const count = propertyReviewCount(item)
  const reviewsText = `${count} Review${count === 1 ? '' : 's'}`
  const isEmpty = Number(score) === 0 && count === 0

  return (
    <div
      className={`property-rating-box property-rating-box--${size}${isEmpty ? ' property-rating-box--empty' : ''}${className ? ` ${className}` : ''}`}
      aria-label={`Rating ${score}, ${reviewsText}`}
    >
      <span className="property-rating-box-badge">{score}</span>
      <span className="property-rating-box-reviews">{reviewsText}</span>
    </div>
  )
}
