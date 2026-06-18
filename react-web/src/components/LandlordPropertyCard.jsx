import PropertyCardAmenityIcons from './PropertyCardAmenityIcons'
import PropertyRatingBox from './PropertyRatingBox'
import {
  formatCapacityLine,
  formatPropertyLocationLine,
  listPropertyImageUrls,
} from '../utils/propertyDisplay'

function statusLabel(status) {
  const s = String(status || 'available').toLowerCase()
  if (s === 'rented' || s === 'booked') return 'Rented'
  if (s === 'maintenance') return 'Maintenance'
  return 'Available'
}

function statusClass(status) {
  const s = String(status || 'available').toLowerCase()
  if (s === 'rented' || s === 'booked') return 'landlord-property-status--rented'
  if (s === 'maintenance') return 'landlord-property-status--maintenance'
  return 'landlord-property-status--available'
}

function CardIconPin() {
  return (
    <svg className="landlord-property-card-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="10" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function CardIconPeople() {
  return (
    <svg className="landlord-property-card-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8.5" r="2.75" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="16.5" cy="9.5" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M4.5 18.5c.75-2.75 2.75-4 4.5-4s3.75 1.25 4.5 4M13.5 18.5c.5-2 1.75-3.25 3-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * Same card as myProperty; pass onEdit + onDelete for landlord workspace.
 * Pass onApply (e.g. Home) to show Apply to the right of View.
 */
export default function LandlordPropertyCard({ item, onView, onApply, onEdit, onDelete }) {
  const imageUrl = listPropertyImageUrls(item)[0] || ''
  const chip = statusLabel(item.status)
  const locationLine = formatPropertyLocationLine(item)
  const capacityLine = formatCapacityLine(item)
  const showApply = typeof onApply === 'function'
  const showEdit = typeof onEdit === 'function'
  const showDelete = typeof onDelete === 'function'

  return (
    <article className="landlord-property-card">
      <div className="landlord-property-card-media">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="landlord-property-card-img" />
        ) : (
          <div className="landlord-property-card-img-placeholder" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
              <path d="M3 16l5-4 4 3 4-5 5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>No photo yet</span>
          </div>
        )}
        <span className={`landlord-property-card-status ${statusClass(item.status)}`}>{chip}</span>
        {item.type ? <span className="landlord-property-card-type">{item.type}</span> : null}
      </div>

      <div className="landlord-property-card-body">
        <header className="landlord-property-card-head">
          <h3 className="landlord-property-card-title">{item.name || 'Untitled property'}</h3>
          <PropertyRatingBox item={item} size="sm" />
        </header>

        <ul className="landlord-property-card-details" aria-label="Property summary">
          <li>
            <span className="landlord-property-card-detail-icon" aria-hidden="true">
              <CardIconPin />
            </span>
            <span className="landlord-property-card-detail-text">{locationLine}</span>
          </li>
          <li>
            <span className="landlord-property-card-detail-icon" aria-hidden="true">
              <CardIconPeople />
            </span>
            <span className="landlord-property-card-detail-text">{capacityLine}</span>
          </li>
        </ul>

        <PropertyCardAmenityIcons amenitiesField={item.amenities} />

        <div className="landlord-property-card-price-block">
          {item.price != null ? (
            <p className="landlord-property-card-price">
              <span className="landlord-property-card-price-amount">
                RM {Number(item.price).toFixed(0)}
                <span className="landlord-property-card-price-suffix">/month</span>
              </span>
            </p>
          ) : (
            <p className="landlord-property-card-price landlord-property-card-price--unset">Price not set</p>
          )}
        </div>

        <div
          className={`landlord-property-card-actions${
            showApply && !showEdit && !showDelete ? ' landlord-property-card-actions--dual' : ''
          }`}
        >
          <button
            type="button"
            className="landlord-property-card-btn landlord-property-card-btn--view"
            onClick={() => onView(item)}
          >
            View
          </button>
          {showApply ? (
            <button
              type="button"
              className="landlord-property-card-btn landlord-property-card-btn--apply"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onApply(item)
              }}
            >
              Apply
            </button>
          ) : null}
          {showEdit ? (
            <button
              type="button"
              className="landlord-property-card-btn landlord-property-card-btn--edit"
              onClick={() => onEdit(item)}
            >
              Edit
            </button>
          ) : null}
          {showDelete ? (
            <button
              type="button"
              className="landlord-property-card-btn landlord-property-card-btn--delete"
              onClick={() => onDelete(item)}
              aria-label={`Delete ${item.name || 'property'}`}
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
