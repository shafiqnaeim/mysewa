import { useCallback, useEffect, useMemo, useState } from 'react'
import PropertyAvailabilityCalendar from './PropertyAvailabilityCalendar'
import PropertyRatingBox from './PropertyRatingBox'
import PropertyReviewsSection from './PropertyReviewsSection'
import PropertySurroundingsMap from './PropertySurroundingsMap'
import { AMENITY_LABELS, listAmenityIds } from '../utils/amenities'
import AmenityIcon from './AmenityIcon'
import {
  fetchRoadRouteDriving,
  getCampusDisplayName,
  getCampusList,
  resolveCampusCoordsForStudentUniversity,
} from '../utils/propertyLocation'
import { getUniversityDisplayName } from '../utils/universityDisplayName'
import {
  formatCapacityLine,
  formatPreferenceLabel,
  formatPropertyLocationLine,
  listPropertyImageUrls,
  propertyStatusLabel,
} from '../utils/propertyDisplay'

function statusClass(status) {
  const s = String(status || 'available').toLowerCase()
  if (s === 'rented' || s === 'booked') return 'pv-status--rented'
  if (s === 'maintenance') return 'pv-status--maintenance'
  return 'pv-status--available'
}

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
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

function IconPeople() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
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

export default function PropertyViewModal({
  item,
  onClose,
  onEdit,
  readOnly = false,
  prefetchedNearbyPlaces,
}) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const [displayItem, setDisplayItem] = useState(item)
  const [campuses, setCampuses] = useState([])
  const [viewerUser, setViewerUser] = useState(null)
  const [viewerLoaded, setViewerLoaded] = useState(false)
  const [studentRoute, setStudentRoute] = useState(null)
  const [studentRouteStatus, setStudentRouteStatus] = useState('idle')

  useEffect(() => {
    setDisplayItem(item)
    setPhotoIndex(0)
  }, [item?.id])

  const refreshProperty = useCallback(async () => {
    const id = item?.id
    if (!id) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('mysewa_token') : null
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    try {
      const res = await fetch(`/api/v1/properties/${id}`, { headers })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.item) setDisplayItem(data.item)
    } catch {
      /* ignore — rating box keeps last known values */
    }
  }, [item?.id])

  const images = listPropertyImageUrls(displayItem)
  const activeImage = images[photoIndex] || null

  const locationShort = formatPropertyLocationLine(displayItem)
  const capacityLine = formatCapacityLine(displayItem)
  const amenityIds = listAmenityIds(displayItem.amenities)
  const lat = Number(displayItem.latitude)
  const lng = Number(displayItem.longitude)
  const hasMapPin = Number.isFinite(lat) && Number.isFinite(lng)
  const chip = propertyStatusLabel(displayItem.status)

  const isStudentViewer = viewerUser && String(viewerUser.role || '').toLowerCase() === 'student'

  const studentCampus =
    isStudentViewer && campuses.length
      ? resolveCampusCoordsForStudentUniversity(
          viewerUser.university,
          viewerUser.universityId,
          campuses,
        )
      : null

  const preferences = [
    ['Gender', formatPreferenceLabel(displayItem.gender) || 'Any'],
    ['Religion', formatPreferenceLabel(displayItem.religion) || 'Any'],
    ['Race', formatPreferenceLabel(displayItem.race) || 'Any'],
  ]

  function showPrevPhoto() {
    if (images.length < 2) return
    setPhotoIndex((i) => (i - 1 + images.length) % images.length)
  }

  function showNextPhoto() {
    if (images.length < 2) return
    setPhotoIndex((i) => (i + 1) % images.length)
  }

  useEffect(() => {
    let cancelled = false
    getCampusList().then((list) => {
      if (!cancelled) setCampuses(list)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const token = typeof window !== 'undefined' ? localStorage.getItem('mysewa_token') : null
    if (!token) {
      queueMicrotask(() => {
        if (!cancelled) {
          setViewerUser(null)
          setViewerLoaded(true)
        }
      })
      return () => {
        cancelled = true
      }
    }
    fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json().catch(() => ({})))
      .then((data) => {
        if (!cancelled && data.user) setViewerUser(data.user)
        else if (!cancelled) setViewerUser(null)
      })
      .catch(() => {
        if (!cancelled) setViewerUser(null)
      })
      .finally(() => {
        if (!cancelled) setViewerLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const isStudent = viewerUser && String(viewerUser.role || '').toLowerCase() === 'student'
    const campus =
      isStudent && campuses.length
        ? resolveCampusCoordsForStudentUniversity(
            viewerUser.university,
            viewerUser.universityId,
            campuses,
          )
        : null

    if (!isStudent || !campus || !hasMapPin) {
      queueMicrotask(() => {
        if (!cancelled) {
          setStudentRoute(null)
          setStudentRouteStatus('idle')
        }
      })
      return () => {
        cancelled = true
      }
    }

    queueMicrotask(() => {
      if (!cancelled) {
        setStudentRoute(null)
        setStudentRouteStatus('loading')
      }
    })

    fetchRoadRouteDriving(lng, lat, campus.lng, campus.lat)
      .then((r) => {
        if (!cancelled) {
          setStudentRoute({
            distanceKm: r.distanceKm,
            geometry: r.geometry,
          })
          setStudentRouteStatus('ok')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStudentRoute(null)
          setStudentRouteStatus('error')
        }
      })

    return () => {
      cancelled = true
    }
  }, [viewerUser, campuses, hasMapPin, lat, lng, displayItem?.id])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const hasAboutContent = Boolean(displayItem.description?.trim()) || Boolean(displayItem.location?.trim())

  const campusRouteLabel =
    isStudentViewer && studentCampus
      ? getUniversityDisplayName(viewerUser?.university) || studentCampus.name || studentCampus.code
      : ''

  const showCampusRouteOnSurroundingsMap =
    Boolean(
      isStudentViewer &&
        studentCampus &&
        studentRouteStatus === 'ok' &&
        studentRoute?.geometry?.type === 'LineString',
    )

  const campusDrivingDistanceKm =
    showCampusRouteOnSurroundingsMap && studentRoute?.distanceKm != null
      ? Number(studentRoute.distanceKm)
      : null

  const studentDistanceFactLine = useMemo(() => {
    if (!isStudentViewer || !viewerLoaded || !campuses.length) return null
    if (
      !studentCampus &&
      viewerUser?.university?.trim() &&
      !/^none$/i.test(String(viewerUser.university))
    ) {
      return 'We couldn’t match your university to a pinned campus. Update it in myAccount or pick a listed campus.'
    }
    if (!studentCampus) return 'Set your university in myAccount to see road distance from this listing.'
    if (!hasMapPin) return 'This listing has no map pin — road distance from your university is unavailable.'
    if (studentRouteStatus === 'loading') return null
    if (studentRouteStatus === 'ok' && studentRoute?.distanceKm != null) return null
    if (studentRouteStatus === 'error') return 'Road distance unavailable (routing service).'
    return null
  }, [
    isStudentViewer,
    viewerLoaded,
    campuses.length,
    studentCampus,
    viewerUser,
    hasMapPin,
    studentRouteStatus,
    studentRoute?.distanceKm,
  ])

  return (
    <div className="pv-backdrop" role="presentation">
      <article className="pv-dialog" role="dialog" aria-modal="true" aria-labelledby="pv-title">
        <header className="pv-header pv-header--close-only">
          <button type="button" className="pv-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="pv-scroll">
          <div className="pv-layout">
            <div className="pv-media">
              <div className="pv-gallery">
                {activeImage ? (
                  <img src={activeImage} alt="" className="pv-gallery-img" />
                ) : (
                  <div className="pv-gallery-empty">
                    <svg viewBox="0 0 24 24" width="40" height="40" fill="none" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
                      <path d="M3 16l5-4 4 3 4-5 5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span>No photo yet</span>
                  </div>
                )}

                <div className="pv-gallery-badges">
                  <span className={`pv-status ${statusClass(displayItem.status)}`}>{chip}</span>
                  {displayItem.type ? <span className="pv-type">{displayItem.type}</span> : null}
                </div>

                {images.length > 1 ? (
                  <>
                    <button
                      type="button"
                      className="pv-gallery-nav pv-gallery-nav--prev"
                      onClick={showPrevPhoto}
                      aria-label="Previous photo"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="pv-gallery-nav pv-gallery-nav--next"
                      onClick={showNextPhoto}
                      aria-label="Next photo"
                    >
                      ›
                    </button>
                    <div className="pv-gallery-dots" aria-hidden="true">
                      {images.map((_, i) => (
                        <span key={i} className={`pv-gallery-dot${i === photoIndex ? ' pv-gallery-dot--on' : ''}`} />
                      ))}
                    </div>
                  </>
                ) : null}
              </div>

              {images.length > 1 ? (
                <div className="pv-thumbs" aria-label="Photo gallery">
                  {images.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      className={`pv-thumb${i === photoIndex ? ' pv-thumb--on' : ''}`}
                      onClick={() => setPhotoIndex(i)}
                      aria-label={`Photo ${i + 1}`}
                      aria-current={i === photoIndex}
                    >
                      <img src={src} alt="" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="pv-body">
              {!readOnly && typeof onEdit === 'function' ? (
                <div className="pv-edit-bar">
                  <button type="button" className="pv-edit-bar-btn" onClick={() => onEdit(displayItem)}>
                    Edit listing
                  </button>
                </div>
              ) : null}
              <div className="pv-intro">
                <div className="pv-intro-main">
                  <h2 id="pv-title" className="pv-property-title">
                    {displayItem.name || 'Untitled property'}
                  </h2>
                  <PropertyRatingBox item={displayItem} size="lg" />
                </div>
              </div>

              <ul className="pv-facts">
                <li>
                  <span className="pv-fact-icon">
                    <IconPin />
                  </span>
                  <span>{locationShort}</span>
                </li>
                <li>
                  <span className="pv-fact-icon">
                    <IconPeople />
                  </span>
                  <span>{capacityLine}</span>
                </li>
                {viewerLoaded && !(isStudentViewer && !campuses.length) ? (
                  <>
                    {isStudentViewer && studentDistanceFactLine != null ? (
                      <li className="pv-facts__distance">
                        <span className="pv-facts__distance-text">{studentDistanceFactLine}</span>
                      </li>
                    ) : !isStudentViewer && displayItem.campus ? (
                      <li className="pv-facts__distance">
                        <span className="pv-facts__distance-text">
                          Near {getCampusDisplayName(displayItem.campus, campuses)}
                        </span>
                      </li>
                    ) : null}
                  </>
                ) : null}
              </ul>

              <div className="pv-monthly-rent-callout" aria-label="Monthly rent">
                {displayItem.price != null && !Number.isNaN(Number(displayItem.price)) ? (
                  <>
                    <span className="pv-monthly-rent-amount">RM {Number(displayItem.price).toFixed(0)}</span>
                    <span className="pv-monthly-rent-suffix">/month</span>
                  </>
                ) : (
                  <span className="pv-monthly-rent-unset">Price not set</span>
                )}
              </div>

              <section className="pv-section">
                <h3 className="pv-section-title">Tenant preferences</h3>
                <div className="pv-pref-row">
                  {preferences.map(([label, value]) => (
                    <div key={label} className="pv-pref-card">
                      <span className="pv-pref-label">{label}</span>
                      <span className="pv-pref-value">{value}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="pv-section pv-section--availability">
                <h3 className="pv-section-title">Availability</h3>
                <PropertyAvailabilityCalendar status={displayItem.status} />
              </section>

              {displayItem.id != null ? (
                <PropertyReviewsSection propertyId={displayItem.id} onPropertyRefresh={refreshProperty} />
              ) : null}

              {hasAboutContent ? (
                <section className="pv-section">
                  <h3 className="pv-section-title">About</h3>
                  {displayItem.description?.trim() ? <p className="pv-section-text">{displayItem.description}</p> : null}
                  {displayItem.location?.trim() ? (
                    <p className="pv-section-text pv-address-under-about">
                      <strong>Address:</strong> {displayItem.location}
                    </p>
                  ) : null}
                </section>
              ) : null}

              {amenityIds.length ? (
                <section className="pv-section">
                  <h3 className="pv-section-title">Amenities</h3>
                  <ul className="pv-amenity-grid">
                    {amenityIds.map((id) => (
                      <li key={id}>
                        <span className="pv-amenity-icon" aria-hidden="true">
                          <AmenityIcon id={id} />
                        </span>
                        <span>{AMENITY_LABELS[id] || id}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {hasMapPin ? (
                <section className="pv-section">
                  <h3 className="pv-section-title">Location</h3>
                  <PropertySurroundingsMap
                    latitude={displayItem.latitude}
                    longitude={displayItem.longitude}
                    campusRouteGeometry={showCampusRouteOnSurroundingsMap ? studentRoute.geometry : null}
                    campusRouteEndLat={showCampusRouteOnSurroundingsMap ? studentCampus.lat : null}
                    campusRouteEndLng={showCampusRouteOnSurroundingsMap ? studentCampus.lng : null}
                    campusRouteLabel={showCampusRouteOnSurroundingsMap ? campusRouteLabel : null}
                    campusDrivingDistanceKm={campusDrivingDistanceKm}
                    prefetchedNearbyPlaces={prefetchedNearbyPlaces}
                  />
                </section>
              ) : null}
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
