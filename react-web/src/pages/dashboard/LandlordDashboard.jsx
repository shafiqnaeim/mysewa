import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listPropertyImageUrls } from '../../utils/propertyDisplay'
import {
  averageReviewRating,
  buildLandlordActivities,
  countActiveBookings,
  fetchLandlordDashboardData,
  mapPropertyForDashboard,
  sumCompletedEarnings,
} from '../../services/landlordDashboardApi'

function IconPlus({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function IconStar({ filled = true, className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.5} aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292Z" />
    </svg>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatRm(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return 'RM 0'
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function StarRow({ count, size = 'h-4 w-4' }) {
  const safe = Math.min(5, Math.max(0, Math.round(Number(count) || 0)))
  return (
    <span className="inline-flex gap-0.5 text-[#ED8936]">
      {Array.from({ length: 5 }, (_, i) => (
        <IconStar key={i} filled={i < safe} className={size} />
      ))}
    </span>
  )
}

function ActivityActions({ actions, onNavigateApplications }) {
  if (!actions.length) return null
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.includes('accept') ? (
        <button
          type="button"
          onClick={onNavigateApplications}
          className="rounded-full bg-[#E88D5B] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#d97a48]"
        >
          Accept
        </button>
      ) : null}
      {actions.includes('decline') ? (
        <button
          type="button"
          onClick={onNavigateApplications}
          className="rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-xs font-semibold text-[#2D3748] transition hover:bg-[#FAFAFA]"
        >
          Decline
        </button>
      ) : null}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4.5rem)] w-full bg-[#FAFAFA] font-sans text-[#2D3748]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className="h-36 animate-pulse rounded-xl bg-[#E2E8F0]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-[#E2E8F0]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl bg-[#E2E8F0]" />
          <div className="h-80 animate-pulse rounded-xl bg-[#E2E8F0]" />
        </div>
      </div>
    </div>
  )
}

export default function LandlordDashboard({ landlordName = 'Landlord', landlordId }) {
  const navigate = useNavigate()
  const greeting = useMemo(() => getGreeting(), [])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [properties, setProperties] = useState([])
  const [bookings, setBookings] = useState([])
  const [payments, setPayments] = useState([])
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    if (!landlordId) return
    const token = localStorage.getItem('mysewa_token')
    if (!token) {
      setError('Please sign in again.')
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await fetchLandlordDashboardData(landlordId, token)
        if (cancelled) return
        setProperties(data.properties)
        setBookings(data.bookings)
        setPayments(data.payments)
        setReviews(data.reviews)
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Unable to load dashboard data.')
          setProperties([])
          setBookings([])
          setPayments([])
          setReviews([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [landlordId])

  const stats = useMemo(() => {
    const totalProperties = properties.length
    const activeBookings = countActiveBookings(bookings)
    const totalEarnings = sumCompletedEarnings(payments)
    const avgRating = averageReviewRating(reviews)

    return {
      totalProperties,
      activeBookings,
      totalEarnings,
      avgRating,
    }
  }, [properties, bookings, payments, reviews])

  const activities = useMemo(
    () => buildLandlordActivities(bookings, payments, reviews),
    [bookings, payments, reviews],
  )

  const propertyCards = useMemo(
    () => properties.map((p) => mapPropertyForDashboard(p, bookings)),
    [properties, bookings],
  )

  const recentReviews = useMemo(
    () =>
      [...reviews]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 3),
    [reviews],
  )

  const statCards = [
    {
      label: 'Total Properties',
      value: String(stats.totalProperties),
      trend: stats.totalProperties ? `${stats.totalProperties} listing${stats.totalProperties === 1 ? '' : 's'}` : 'No listings yet',
      trendUp: true,
      border: 'border-l-[#E88D5B]',
    },
    {
      label: 'Active Bookings',
      value: String(stats.activeBookings),
      trend: stats.activeBookings ? 'Approved or confirmed' : 'No active bookings',
      trendUp: stats.activeBookings > 0,
      border: 'border-l-[#48BB78]',
    },
    {
      label: 'Total Earnings',
      value: formatRm(stats.totalEarnings),
      trend: stats.totalEarnings > 0 ? 'From completed payments' : 'No payments yet',
      trendUp: stats.totalEarnings > 0,
      border: 'border-l-[#ED8936]',
    },
    {
      label: 'Average Rating',
      value: stats.avgRating != null ? stats.avgRating.toFixed(1) : '—',
      trend: reviews.length ? `${reviews.length} review${reviews.length === 1 ? '' : 's'}` : 'No reviews yet',
      stars: stats.avgRating != null ? Math.round(stats.avgRating) : 0,
      border: 'border-l-[#9F7AEA]',
    },
  ]

  if (loading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] w-full bg-[#FAFAFA] px-4 py-8 font-sans">
        <div className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4.5rem)] w-full bg-[#FAFAFA] font-sans text-[#2D3748]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="rounded-xl bg-gradient-to-r from-[#2D3748] to-[#4A5568] px-8 py-6 text-white shadow-md">
          <h1 className="text-xl font-bold">
            {greeting}, {landlordName}
          </h1>
          <p className="mt-2 text-sm text-gray-300">Here&apos;s what&apos;s happening with your properties today</p>
          <p className="mt-2 text-sm text-gray-300">
            {stats.totalProperties} propert{stats.totalProperties === 1 ? 'y' : 'ies'} | {stats.activeBookings} active
            booking{stats.activeBookings === 1 ? '' : 's'} | {formatRm(stats.totalEarnings)} earnings
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard/landlord/properties/new')}
              className="inline-flex items-center gap-2 rounded-full bg-[#E88D5B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d97a48]"
            >
              <IconPlus />
              Add Property
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/landlord/properties')}
              className="rounded-full border border-[#E88D5B] bg-transparent px-4 py-2 text-sm font-semibold text-[#E88D5B] transition hover:bg-[#E88D5B]/10"
            >
              View All
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <article
              key={stat.label}
              className={`rounded-xl border border-[#E2E8F0] border-l-4 bg-white p-6 shadow-sm transition hover:shadow-md ${stat.border}`}
            >
              <p className="text-sm text-[#A0AEC0]">{stat.label}</p>
              <p className="mt-2 text-2xl font-bold text-[#2D3748]">{stat.value}</p>
              {stat.stars != null && stat.stars > 0 ? (
                <div className="mt-2">
                  <StarRow count={stat.stars} />
                </div>
              ) : (
                <p className={`mt-2 text-xs font-medium ${stat.trendUp ? 'text-[#48BB78]' : 'text-[#A0AEC0]'}`}>
                  {stat.trend}
                </p>
              )}
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#2D3748]">Recent Activity</h2>
            {activities.length === 0 ? (
              <p className="mt-4 text-sm text-[#A0AEC0]">No recent activity yet.</p>
            ) : (
              <ul className="mt-4">
                {activities.map((item) => (
                  <li key={item.id} className="border-b border-[#E2E8F0] py-4 last:border-0">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.badgeClass}`}>
                      {item.badge}
                    </span>
                    <p className="mt-2 font-semibold text-[#2D3748]">{item.message}</p>
                    <p className="mt-1 text-sm text-[#A0AEC0]">{item.time}</p>
                    <ActivityActions
                      actions={item.actions}
                      onNavigateApplications={() => navigate('/dashboard/landlord/applications')}
                    />
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => navigate('/dashboard/landlord/applications')}
              className="mt-4 text-sm font-semibold text-[#E88D5B] transition hover:text-[#d97a48]"
            >
              View All Activity →
            </button>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#2D3748]">Your Properties</h2>
            {propertyCards.length === 0 ? (
              <p className="mt-4 text-sm text-[#A0AEC0]">You haven&apos;t listed any properties yet.</p>
            ) : (
              <ul className="mt-4">
                {propertyCards.map((property) => {
                  const imageUrl = listPropertyImageUrls(property.raw)[0]
                  return (
                    <li key={property.id} className="border-b border-[#E2E8F0] py-4 last:border-0">
                      <div className="flex items-center gap-4">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt=""
                            className="h-16 w-16 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 shrink-0 rounded-lg bg-[#E2E8F0]" aria-hidden="true" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[#2D3748]">{property.name}</p>
                          <p className="text-sm text-[#A0AEC0]">{property.price}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${property.statusClass}`}>
                              {property.status}
                            </span>
                            {property.rating > 0 ? <StarRow count={property.rating} size="h-3.5 w-3.5" /> : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate('/dashboard/landlord/properties')}
                          className="shrink-0 text-sm font-semibold text-[#E88D5B] transition hover:text-[#d97a48]"
                        >
                          View
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            <button
              type="button"
              onClick={() => navigate('/dashboard/landlord/properties/new')}
              className="mt-4 text-sm font-semibold text-[#E88D5B] transition hover:text-[#d97a48]"
            >
              Add Property →
            </button>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-[#2D3748]">Recent Reviews</h2>
          {recentReviews.length === 0 ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-[#A0AEC0]">No reviews yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {recentReviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm"
                >
                  <StarRow count={review.rating} />
                  <p className="mt-4 text-sm italic leading-relaxed text-[#4A5568]">
                    &ldquo;{review.comment}&rdquo;
                  </p>
                  <p className="mt-4 font-medium text-[#2D3748]">{review.studentDisplayName || 'Student'}</p>
                  <p className="mt-1 text-sm text-[#A0AEC0]">{review.propertyName || `Property #${review.propertyId}`}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
