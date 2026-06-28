import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import StudentLayout from '../components/StudentLayout'
import { useStudentGuard } from '../hooks/useStudentGuard'
import { useToast } from '../context/ToastContext'
import { getUniversityDisplayName } from '../utils/universityDisplayName'
import { countSavedProperties } from '../utils/savedProperties'
import { resolveApplicationDeposit } from '../utils/propertyDeposit'
import { canPayDeposit } from '../utils/applicationDisplayStatus'
import StudentDashboard from './dashboard/StudentDashboard'

function getVerificationState(raw) {
  const s = String(raw || '').trim()
  if (!s) return 'pending'
  const u = s.toUpperCase()
  if (u.includes('VERIF') && !u.includes('UNVER')) return 'verified'
  if (u.includes('REJECT') || u.includes('FAIL') || u.includes('INVALID')) return 'rejected'
  return 'pending'
}

function formatRelativeTime(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const diff = Date.now() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days === 1 ? '' : 's'} ago`
  } catch {
    return ''
  }
}

function depositAmount(app) {
  const n = resolveApplicationDeposit(app)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function buildActivities(applications, reviewByProperty) {
  const items = []

  for (const app of applications) {
    const status = String(app.status || '').toLowerCase()
    const name = app.propertyName || `Property #${app.propertyId}`
    const updated = app.updatedAt || app.createdAt

    if (status === 'accepted') {
      if (!app.depositPaid) {
        items.push({
          id: `pay-deposit-${app.id}`,
          icon: '💳',
          message: `Your application for "${name}" has been approved! Pay the deposit to confirm.`,
          time: formatRelativeTime(updated),
          sortAt: new Date(updated || 0).getTime() + 1,
        })
      } else {
        items.push({
          id: `accepted-${app.id}`,
          icon: '✅',
          message: `Booking confirmed for "${name}"`,
          time: formatRelativeTime(updated),
          sortAt: new Date(updated || 0).getTime(),
        })
      }
    }

    if (status === 'accepted' && app.depositPaid) {
      items.push({
        id: `deposit-${app.id}`,
        icon: '💰',
        message: 'Deposit payment recorded',
        time: formatRelativeTime(updated),
        sortAt: new Date(updated || 0).getTime() - 1,
      })
    }

    if (status === 'pending') {
      items.push({
        id: `pending-${app.id}`,
        icon: '📋',
        message: `Application submitted for "${name}"`,
        time: formatRelativeTime(app.createdAt),
        sortAt: new Date(app.createdAt || 0).getTime(),
      })
    }

    const review = reviewByProperty[app.propertyId]
    if (review) {
      items.push({
        id: `review-${app.propertyId}`,
        icon: '📝',
        message: `You left a review for "${name}"`,
        time: formatRelativeTime(review.createdAt || review.updatedAt),
        sortAt: new Date(review.createdAt || review.updatedAt || 0).getTime(),
      })
    }
  }

  return items
    .sort((a, b) => (b.sortAt || 0) - (a.sortAt || 0))
    .slice(0, 5)
    .map(({ id, icon, message, time }) => ({ id, icon, message, time }))
}

export default function StudentMyDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, loading, error } = useStudentGuard()
  const { pushToast } = useToast()

  const [applications, setApplications] = useState([])
  const [reviewCount, setReviewCount] = useState(0)
  const [reviewByProperty, setReviewByProperty] = useState({})
  const [savedCount, setSavedCount] = useState(0)
  const [notifications, setNotifications] = useState([])

  const universityLabel = user ? getUniversityDisplayName(user.university) : ''

  const firstName = useMemo(() => {
    const parts = String(user?.fullName || '').trim().split(/\s+/).filter(Boolean)
    return parts[0] || 'there'
  }, [user?.fullName])

  const reloadApplications = useCallback(async () => {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !user?.id) return []
    try {
      const res = await fetch('/api/v1/applications/for-student', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Failed to load applications (HTTP ${res.status})`)
      const items = Array.isArray(data.items) ? data.items : []
      setApplications(items)
      return items
    } catch (e) {
      setApplications([])
      pushToast({ message: e.message || 'Unable to load your applications.', type: 'error' })
      return []
    }
  }, [user?.id, pushToast])

  useEffect(() => {
    if (!user?.id) return
    reloadApplications()
    setSavedCount(countSavedProperties(user.id))

    const token = localStorage.getItem('mysewa_token')
    if (!token) return

    async function loadNotifications() {
      try {
        const res = await fetch('/api/v1/notifications/user', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return
        setNotifications(Array.isArray(data.items) ? data.items : [])
      } catch {
        setNotifications([])
      }
    }

    loadNotifications()
  }, [user?.id, reloadApplications])

  useEffect(() => {
    if (!user?.id) return
    function refreshSaved() {
      setSavedCount(countSavedProperties(user.id))
    }
    window.addEventListener('mysewa-saved-properties-changed', refreshSaved)
    return () => window.removeEventListener('mysewa-saved-properties-changed', refreshSaved)
  }, [user?.id])

  useEffect(() => {
    if (!user?.id || applications.length === 0) {
      setReviewCount(0)
      setReviewByProperty({})
      return
    }

    const token = localStorage.getItem('mysewa_token')
    if (!token) return

    const propertyIds = [...new Set(applications.map((a) => a.propertyId).filter(Boolean))]
    let cancelled = false

    async function loadReviews() {
      const byProperty = {}
      let count = 0

      await Promise.all(
        propertyIds.map(async (propertyId) => {
          try {
            const res = await fetch(`/api/v1/reviews/for-property/${encodeURIComponent(propertyId)}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) return
            if (data.myReview) {
              byProperty[propertyId] = data.myReview
              count += 1
            }
          } catch {
            /* ignore */
          }
        }),
      )

      if (!cancelled) {
        setReviewByProperty(byProperty)
        setReviewCount(count)
      }
    }

    loadReviews()
    return () => {
      cancelled = true
    }
  }, [user?.id, applications])

  useEffect(() => {
    if (searchParams.get('deposit') !== 'return') return
    pushToast({
      message: 'Returned from ToyyibPay. If payment succeeded, your deposit status should update shortly — refresh if needed.',
      type: 'success',
    })
    setSearchParams({}, { replace: true })
    reloadApplications()
  }, [searchParams, setSearchParams, pushToast, reloadApplications])

  const stats = useMemo(() => {
    const accepted = applications.filter((a) => String(a.status || '').toLowerCase() === 'accepted')
    const unpaid = accepted.filter((a) => canPayDeposit(a))
    const pendingAmount = unpaid.reduce((sum, a) => sum + depositAmount(a), 0)

    return {
      activeBookings: accepted.length,
      savedCount,
      pendingPaymentsCount: unpaid.length,
      pendingPaymentsAmount: pendingAmount,
      totalReviews: reviewCount,
    }
  }, [applications, savedCount, reviewCount])

  const activities = useMemo(
    () => buildActivities(applications, reviewByProperty),
    [applications, reviewByProperty],
  )

  const verificationState = useMemo(
    () => getVerificationState(user?.documentVerificationStatus),
    [user?.documentVerificationStatus],
  )

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA]">
          <p className="text-sm font-medium text-[#6B7280]">Loading your dashboard…</p>
        </div>
      </StudentLayout>
    )
  }

  if (error) {
    return (
      <StudentLayout>
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Error: {error}
          </div>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <StudentDashboard
        firstName={firstName}
        fullName={user?.fullName || ''}
        email={user?.email || ''}
        universityLabel={universityLabel}
        emailVerified={Boolean(user?.isVerified ?? user?.verified)}
        verificationState={verificationState}
        stats={stats}
        activities={activities}
        notifications={notifications}
      />
    </StudentLayout>
  )
}
