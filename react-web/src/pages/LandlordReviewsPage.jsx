import { useEffect, useState } from 'react'
import LandlordLayout from '../components/LandlordLayout'
import { useLandlordGuard } from '../hooks/useLandlordGuard'
import { useToast } from '../context/ToastContext'
import Reviews from './dashboard/Reviews'

function formatStudentLine(review, applicationsByProperty) {
  const name = review.studentDisplayName || 'Student'
  const apps = applicationsByProperty.get(review.propertyId) || []
  const match = apps.find((a) => {
    const full = a.student?.fullName?.trim() || ''
    return full.toLowerCase().startsWith(name.toLowerCase())
  })
  const university = match?.student?.university?.trim()
  if (university) return `${name} - ${university}`
  return name
}

export default function LandlordReviewsPage() {
  const { user, loading: authLoading, error: authError } = useLandlordGuard()
  const { pushToast } = useToast()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authError) pushToast({ message: authError, type: 'error', duration: 7000 })
  }, [authError, pushToast])

  useEffect(() => {
    if (!user?.id) return
    const token = localStorage.getItem('mysewa_token')
    if (!token) return

    let cancelled = false

    async function loadReviews() {
      setLoading(true)
      try {
        const [propRes, appRes] = await Promise.all([
          fetch('/api/v1/properties'),
          fetch('/api/v1/applications/for-landlord', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        const propData = await propRes.json().catch(() => ({}))
        if (!propRes.ok) throw new Error(propData.message || `Failed to load properties (HTTP ${propRes.status})`)

        const allProperties = Array.isArray(propData.items) ? propData.items : []
        const mine = allProperties.filter((p) => Number(p.landlordId) === Number(user.id))
        const propertyNames = new Map(mine.map((p) => [p.id, p.name || `Property #${p.id}`]))

        const appData = await appRes.json().catch(() => ({}))
        const applications = appRes.ok && Array.isArray(appData.items) ? appData.items : []
        const applicationsByProperty = new Map()
        for (const app of applications) {
          const pid = app.propertyId
          if (!applicationsByProperty.has(pid)) applicationsByProperty.set(pid, [])
          applicationsByProperty.get(pid).push(app)
        }

        const rows = []
        await Promise.all(
          mine.map(async (property) => {
            try {
              const res = await fetch(`/api/v1/reviews/for-property/${encodeURIComponent(property.id)}`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              const data = await res.json().catch(() => ({}))
              if (!res.ok) return
              const items = Array.isArray(data.items) ? data.items : []
              for (const item of items) {
                rows.push({
                  id: `${property.id}-${item.id}`,
                  propertyId: property.id,
                  rating: item.ratingOverall ?? item.rating,
                  ratingOverall: item.ratingOverall ?? item.rating,
                  ratingCleanliness: item.ratingCleanliness,
                  ratingCondition: item.ratingCondition,
                  ratingAmenities: item.ratingAmenities,
                  ratingLandlord: item.ratingLandlord,
                  ratingLocation: item.ratingLocation,
                  ratingValue: item.ratingValue,
                  comment: item.publicComment ?? item.comment,
                  publicComment: item.publicComment ?? item.comment,
                  anonymous: item.anonymous,
                  photos: item.photos,
                  categoryComments: item.categoryComments,
                  createdAt: item.createdAt,
                  studentDisplayName: item.studentDisplayName,
                  property: propertyNames.get(property.id) || `Property #${property.id}`,
                  student: formatStudentLine(
                    { ...item, propertyId: property.id },
                    applicationsByProperty,
                  ),
                })
              }
            } catch {
              /* skip property */
            }
          }),
        )

        if (!cancelled) setReviews(rows)
      } catch (e) {
        if (!cancelled) {
          setReviews([])
          pushToast({ message: e.message || 'Unable to load reviews.', type: 'error' })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadReviews()
    return () => {
      cancelled = true
    }
  }, [user?.id, pushToast])

  if (authLoading) {
    return (
      <LandlordLayout>
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-[#A0AEC0]">Loading reviews…</p>
        </div>
      </LandlordLayout>
    )
  }

  if (authError) {
    return (
      <LandlordLayout>
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Error: {authError}
          </div>
        </div>
      </LandlordLayout>
    )
  }

  return (
    <LandlordLayout>
      <Reviews reviews={reviews} loading={loading} />
    </LandlordLayout>
  )
}
