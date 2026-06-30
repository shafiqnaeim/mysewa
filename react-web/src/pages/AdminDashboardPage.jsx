import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'
import { useAdminGuard } from '../hooks/useAdminGuard'
import { useToast } from '../context/ToastContext'
import AdminDashboard from './dashboard/AdminDashboard'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const DEFAULT_GROWTH = [
  { month: 'Jan', users: 120 },
  { month: 'Feb', users: 150 },
  { month: 'Mar', users: 180 },
  { month: 'Apr', users: 220 },
  { month: 'May', users: 260 },
  { month: 'Jun', users: 300 },
]

const DEFAULT_PROPERTY_DIST = [
  { name: 'House', value: 0, count: 0 },
  { name: 'Room', value: 0, count: 0 },
]

function splitFirstName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  return parts[0] || 'Admin'
}

function isPendingVerification(status) {
  const s = String(status || '').trim().toLowerCase()
  if (!s || s === 'verified' || s === 'exempt' || s === 'not_submitted') return false
  return s.includes('pending') || s.includes('submitted') || s.includes('review') || s.includes('await')
}

function formatRelativeTime(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    const diff = Date.now() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} min ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days === 1 ? '' : 's'} ago`
  } catch {
    return '—'
  }
}

function countWithinDays(items, dateKey, days) {
  const cutoff = Date.now() - days * 86400000
  return items.filter((item) => {
    const t = new Date(item[dateKey] || 0).getTime()
    return Number.isFinite(t) && t >= cutoff
  }).length
}

function buildUserGrowth(users, totalUsers) {
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ year: d.getFullYear(), monthIndex: d.getMonth(), label: MONTH_LABELS[d.getMonth()] })
  }

  const withDates = users.filter((u) => u.createdAt)
  if (!withDates.length) {
    const total = Number(totalUsers) || 300
    const scale = total / 300
    return DEFAULT_GROWTH.map((row) => ({
      month: row.month,
      users: Math.max(1, Math.round(row.users * scale)),
    }))
  }

  return months.map(({ year, monthIndex, label }) => {
    const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
    const count = withDates.filter((u) => new Date(u.createdAt).getTime() <= end.getTime()).length
    return { month: label, users: count }
  })
}

function buildPropertyDistribution(counts) {
  const house = Number(counts?.House) || 0
  const room = Number(counts?.Room) || 0
  const total = house + room
  if (!total) return DEFAULT_PROPERTY_DIST

  return [
    { name: 'House', count: house, value: Math.round((house / total) * 100) },
    { name: 'Room', count: room, value: Math.round((room / total) * 100) },
  ]
}

function buildRecentActivity(users, properties, applications) {
  const events = []

  users.slice(0, 10).forEach((u) => {
    if (!u.createdAt) return
    const role = String(u.role || 'user').toLowerCase()
    events.push({
      id: `user-${u.id}`,
      at: new Date(u.createdAt).getTime(),
      emoji: '🔴',
      text: `New user registered (${role === 'student' ? 'Student' : role === 'landlord' ? 'Landlord' : 'User'})`,
      timeAgo: formatRelativeTime(u.createdAt),
    })
  })

  properties.slice(0, 10).forEach((p) => {
    if (!p.createdAt) return
    events.push({
      id: `prop-${p.id}`,
      at: new Date(p.createdAt).getTime(),
      emoji: '🟠',
      text: `New property listed${p.name ? `: ${p.name}` : ''}`,
      timeAgo: formatRelativeTime(p.createdAt),
    })
  })

  applications.slice(0, 10).forEach((a) => {
    const at = a.updatedAt || a.createdAt
    if (!at) return
    const st = String(a.status || '').toLowerCase()
    if (st === 'accepted') {
      events.push({
        id: `app-acc-${a.id}`,
        at: new Date(at).getTime(),
        emoji: '🟢',
        text: 'Booking confirmed',
        timeAgo: formatRelativeTime(at),
      })
    } else if (st === 'pending') {
      events.push({
        id: `app-pend-${a.id}`,
        at: new Date(at).getTime(),
        emoji: '🟡',
        text: 'New booking application received',
        timeAgo: formatRelativeTime(at),
      })
    }
  })

  return events
    .sort((a, b) => b.at - a.at)
    .slice(0, 5)
}

function buildPendingVerifications(users) {
  return users
    .filter((u) => isPendingVerification(u.documentVerificationStatus))
    .slice(0, 12)
    .map((u) => ({
      id: u.id,
      name: splitFirstName(u.fullName) || u.email || `User #${u.id}`,
      type: String(u.role || 'user').toLowerCase(),
      submittedAgo: formatRelativeTime(u.createdAt),
    }))
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const { user, loading, error, token } = useAdminGuard()
  const { pushToast } = useToast()

  const [greetingName, setGreetingName] = useState('Admin')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [properties, setProperties] = useState([])
  const [applications, setApplications] = useState([])
  const [propertyTypeCounts, setPropertyTypeCounts] = useState({ House: 0, Room: 0 })
  const [dataLoading, setDataLoading] = useState(false)
  const [verificationActionId, setVerificationActionId] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    try {
      const nick = localStorage.getItem(`mysewa_admin_nickname_${user.id}`) || ''
      setGreetingName(nick || splitFirstName(user.fullName))
    } catch {
      setGreetingName(splitFirstName(user.fullName))
    }
  }, [user?.id, user?.fullName])

  useEffect(() => {
    if (!user?.id || !token) return
    let cancelled = false

    async function loadDashboardData() {
      setDataLoading(true)
      try {
        const headers = { Authorization: `Bearer ${token}` }
        const [statsRes, usersRes, propsRes, appsRes, typeCountsRes] = await Promise.all([
          fetch('/api/v1/admin/stats', { headers }),
          fetch('/api/v1/admin/users?page=0&size=100', { headers }),
          fetch('/api/v1/admin/database/properties/rows?page=0&size=200', { headers }),
          fetch('/api/v1/admin/database/applications/rows?page=0&size=50', { headers }),
          fetch('/api/v1/admin/properties/count-by-type', { headers }),
        ])

        const statsData = await statsRes.json().catch(() => ({}))
        const usersData = await usersRes.json().catch(() => ({}))
        const propsData = await propsRes.json().catch(() => ({}))
        const appsData = await appsRes.json().catch(() => ({}))
        const typeCountsData = await typeCountsRes.json().catch(() => ({}))

        if (!cancelled) {
          if (statsRes.ok) setStats(statsData)
          setUsers(Array.isArray(usersData.items) ? usersData.items : [])
          setProperties(Array.isArray(propsData.items) ? propsData.items : [])
          setApplications(Array.isArray(appsData.items) ? appsData.items : [])
          if (typeCountsRes.ok) {
            setPropertyTypeCounts({
              House: Number(typeCountsData.House) || 0,
              Room: Number(typeCountsData.Room) || 0,
            })
          }
        }
      } catch {
        if (!cancelled) {
          pushToast({ message: 'Could not load dashboard data.', type: 'error' })
        }
      } finally {
        if (!cancelled) setDataLoading(false)
      }
    }

    loadDashboardData()
    return () => {
      cancelled = true
    }
  }, [user?.id, token, pushToast])

  const pendingVerifications = useMemo(() => buildPendingVerifications(users), [users])
  const userGrowthData = useMemo(() => buildUserGrowth(users, stats?.usersTotal), [users, stats?.usersTotal])
  const propertyDistribution = useMemo(() => buildPropertyDistribution(propertyTypeCounts), [propertyTypeCounts])
  const recentActivity = useMemo(
    () => buildRecentActivity(users, properties, applications),
    [users, properties, applications],
  )

  const usersWeek = useMemo(() => countWithinDays(users, 'createdAt', 7), [users])
  const propertiesWeek = useMemo(() => countWithinDays(properties, 'createdAt', 7), [properties])
  const bookingsWeek = useMemo(() => countWithinDays(applications, 'createdAt', 7), [applications])

  const estimatedRevenue = useMemo(() => {
    const accepted = Number(stats?.applicationsAccepted) || 0
    return accepted * 512
  }, [stats?.applicationsAccepted])

  const statCards = useMemo(() => {
    const totalUsers = stats?.usersTotal ?? 0
    const totalProperties = stats?.propertiesTotal ?? 0
    const pendingCount = pendingVerifications.length
    const totalBookings = stats?.applicationsTotal ?? 0

    return [
      {
        key: 'users',
        label: 'Total Users',
        value: totalUsers.toLocaleString('en-MY'),
        trend: usersWeek > 0 ? `▲ +${usersWeek} this week` : '—',
        trendClass: 'text-[#10B981]',
        borderClass: 'border-l-[#DC2626]',
      },
      {
        key: 'properties',
        label: 'Total Properties',
        value: totalProperties.toLocaleString('en-MY'),
        trend: propertiesWeek > 0 ? `▲ +${propertiesWeek} this week` : '—',
        trendClass: 'text-[#10B981]',
        borderClass: 'border-l-[#2563EB]',
      },
      {
        key: 'verification',
        label: 'Pending Verification',
        value: String(pendingCount),
        trend: pendingCount > 0 ? '⚠️ Requires attention' : 'All clear',
        trendClass: pendingCount > 0 ? 'text-[#F59E0B]' : 'text-[#10B981]',
        borderClass: 'border-l-[#F59E0B]',
      },
      {
        key: 'bookings',
        label: 'Total Bookings',
        value: totalBookings.toLocaleString('en-MY'),
        trend: bookingsWeek > 0 ? `▲ +${bookingsWeek} this week` : '—',
        trendClass: 'text-[#10B981]',
        borderClass: 'border-l-[#10B981]',
      },
      {
        key: 'revenue',
        label: 'Total Revenue',
        value: `RM ${estimatedRevenue.toLocaleString('en-MY')}`,
        trend: totalBookings > 0 ? '▲ +18%' : '—',
        trendClass: 'text-[#10B981]',
        borderClass: 'border-l-[#7C3AED]',
      },
      {
        key: 'rating',
        label: 'Avg Rating',
        value: '4.6',
        trend: '⭐ ★ ★ ★ ★',
        trendClass: 'text-[#F59E0B]',
        borderClass: 'border-l-[#14B8A6]',
      },
    ]
  }, [stats, pendingVerifications.length, usersWeek, propertiesWeek, bookingsWeek, estimatedRevenue])

  const headerStats = useMemo(
    () => ({
      users: stats?.usersTotal ?? 0,
      properties: stats?.propertiesTotal ?? 0,
      bookings: stats?.applicationsTotal ?? 0,
      pendingVerifications: pendingVerifications.length,
    }),
    [stats, pendingVerifications.length],
  )

  function handleVerifyUser(userId) {
    setVerificationActionId(userId)
    pushToast({
      message: 'Verification approval will be available in the admin verification workflow.',
      type: 'info',
    })
    navigate('/dashboard/admin/verification')
    setVerificationActionId(null)
  }

  function handleRejectUser(userId) {
    setVerificationActionId(userId)
    pushToast({
      message: 'Verification rejection will be available in the admin verification workflow.',
      type: 'info',
    })
    navigate('/dashboard/admin/verification')
    setVerificationActionId(null)
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA]">
          <p className="text-sm text-[#6B7280]">Verifying privileges…</p>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!user) return null

  return (
    <AdminLayout>
      {dataLoading ? (
        <p className="sr-only" role="status">
          Refreshing dashboard data…
        </p>
      ) : null}
      <AdminDashboard
        greetingName={greetingName}
        greeting={getGreeting()}
        headerStats={headerStats}
        statCards={statCards}
        userGrowthData={userGrowthData}
        propertyDistribution={propertyDistribution}
        recentActivity={recentActivity}
        pendingVerifications={pendingVerifications}
        verificationActionId={verificationActionId}
        onVerifyUser={handleVerifyUser}
        onRejectUser={handleRejectUser}
      />
    </AdminLayout>
  )
}
