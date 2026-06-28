import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { useAdminGuard } from '../hooks/useAdminGuard'
import { useToast } from '../context/ToastContext'
import AdminBookings from './dashboard/AdminBookings'

const PAGE_SIZE = 10

function splitDisplayName(fullName, email) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length) return parts[0]
  if (email) return String(email).split('@')[0]
  return 'User'
}

function formatShortDate(value) {
  if (!value) return '—'
  try {
    const d = new Date(value.includes('T') ? value : `${value}T12:00:00`)
    if (Number.isNaN(d.getTime())) return String(value)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    return `${day}/${month}`
  } catch {
    return String(value)
  }
}

function formatDateRange(moveIn, leaseEnd) {
  const start = formatShortDate(moveIn)
  const end = formatShortDate(leaseEnd)
  if (start === '—' && end === '—') return '—'
  return `${start}-${end}`
}

function formatWhen(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

function formatPrice(price) {
  const n = Number(price)
  if (!Number.isFinite(n)) return '—'
  return `RM ${n.toLocaleString('en-MY')}`
}

function isLeaseCompleted(leaseEnd) {
  if (!leaseEnd) return false
  try {
    const d = new Date(leaseEnd.includes('T') ? leaseEnd : `${leaseEnd}T23:59:59`)
    return !Number.isNaN(d.getTime()) && d < new Date()
  } catch {
    return false
  }
}

function resolveDisplayStatus(row) {
  const raw = String(row.status || 'pending').toLowerCase()
  if (raw === 'rejected') return 'rejected'
  if (raw === 'pending') return 'pending'
  if (raw === 'accepted') {
    if (isLeaseCompleted(row.leaseEnd)) return 'completed'
    return 'approved'
  }
  return 'pending'
}

function matchesTab(booking, tab) {
  if (tab === 'all') return true
  return booking.displayStatus === tab
}

function buildUserMaps(users) {
  const byId = new Map()
  users.forEach((u) => {
    if (u?.id != null) byId.set(Number(u.id), u)
  })
  return byId
}

function buildPropertyMap(properties) {
  const byId = new Map()
  properties.forEach((p) => {
    if (p?.id != null) byId.set(Number(p.id), p)
  })
  return byId
}

function normalizeBooking(row, userById, propertyById) {
  const student = userById.get(Number(row.studentId))
  const property = propertyById.get(Number(row.propertyId))
  const landlord = property?.landlordId != null ? userById.get(Number(property.landlordId)) : null
  const displayStatus = resolveDisplayStatus(row)

  return {
    ...row,
    displayStatus,
    studentName: splitDisplayName(student?.fullName, student?.email) || `Student #${row.studentId}`,
    studentFullName: student?.fullName || '',
    studentEmail: student?.email || '',
    propertyName: property?.name || `Property #${row.propertyId}`,
    landlordName: splitDisplayName(landlord?.fullName, landlord?.email) || '—',
    landlordFullName: landlord?.fullName || '',
    landlordEmail: landlord?.email || '',
    datesDisplay: formatDateRange(row.preferredMoveIn, row.leaseEnd),
    rentDisplay: property?.price != null ? `${formatPrice(property.price)}/month` : '—',
    submittedDisplay: formatWhen(row.createdAt),
    leaseLengthDisplay: row.leaseEnd && row.preferredMoveIn ? formatDateRange(row.preferredMoveIn, row.leaseEnd) : '—',
    monthlyRent: property?.price,
  }
}

function buildPaymentHistory(booking) {
  const payments = []

  payments.push({
    id: 'deposit',
    label: 'Security deposit',
    when: booking.submittedDisplay,
    paid: booking.displayStatus === 'completed',
  })

  if (booking.monthlyRent != null) {
    payments.push({
      id: 'rent',
      label: `Monthly rent (${formatPrice(booking.monthlyRent)})`,
      when: booking.datesDisplay,
      paid: booking.displayStatus === 'completed',
    })
  }

  return payments
}

function buildActivityMessages(booking) {
  const messages = [
    {
      id: 'submitted',
      title: 'Application submitted',
      body: `${booking.studentName} applied for ${booking.propertyName}.`,
      when: booking.submittedDisplay,
    },
  ]

  const status = booking.displayStatus
  if (status === 'approved' || status === 'completed') {
    messages.push({
      id: 'approved',
      title: 'Booking approved',
      body: `Landlord ${booking.landlordName} accepted the rental application.`,
      when: booking.submittedDisplay,
    })
  }
  if (status === 'rejected') {
    messages.push({
      id: 'rejected',
      title: 'Booking rejected',
      body: 'This application was declined.',
      when: booking.submittedDisplay,
    })
  }
  if (status === 'completed') {
    messages.push({
      id: 'completed',
      title: 'Tenancy completed',
      body: `Lease period ended (${booking.datesDisplay}).`,
      when: formatWhen(booking.leaseEnd),
    })
  }

  return messages
}

export default function AdminBookingsPage() {
  const { loading, error, token } = useAdminGuard()
  const { pushToast } = useToast()

  const [allBookings, setAllBookings] = useState([])
  const [totalBookings, setTotalBookings] = useState(0)
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(0)
  const [savingId, setSavingId] = useState(null)

  const [detailBooking, setDetailBooking] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadBookings = useCallback(async () => {
    if (!token) return
    setBookingsLoading(true)
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [appsRes, usersRes, propsRes] = await Promise.all([
        fetch('/api/v1/admin/database/applications/rows?page=0&size=200', { headers }),
        fetch('/api/v1/admin/users?page=0&size=200', { headers }),
        fetch('/api/v1/admin/database/properties/rows?page=0&size=200', { headers }),
      ])
      const appsData = await appsRes.json().catch(() => ({}))
      const usersData = await usersRes.json().catch(() => ({}))
      const propsData = await propsRes.json().catch(() => ({}))
      if (!appsRes.ok) throw new Error(appsData.message || `Failed to load bookings (${appsRes.status})`)

      const userById = buildUserMaps(Array.isArray(usersData.items) ? usersData.items : [])
      const propertyById = buildPropertyMap(Array.isArray(propsData.items) ? propsData.items : [])
      const rows = Array.isArray(appsData.items) ? appsData.items : []
      const normalized = rows.map((row) => normalizeBooking(row, userById, propertyById))

      setAllBookings(normalized)
      setTotalBookings(Number(appsData.totalElements) || normalized.length)
    } catch (e) {
      setAllBookings([])
      setTotalBookings(0)
      pushToast({ message: e.message || 'Could not load bookings.', type: 'error' })
    } finally {
      setBookingsLoading(false)
    }
  }, [token, pushToast])

  useEffect(() => {
    if (token) void loadBookings()
  }, [token, loadBookings])

  const filteredBookings = useMemo(
    () => allBookings.filter((b) => matchesTab(b, activeTab)),
    [allBookings, activeTab],
  )

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE))

  const pageBookings = useMemo(() => {
    const start = page * PAGE_SIZE
    return filteredBookings.slice(start, start + PAGE_SIZE)
  }, [filteredBookings, page])

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1))
  }, [page, totalPages])

  async function patchStatus(bookingId, apiStatus) {
    const res = await fetch(`/api/v1/admin/database/applications/${bookingId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: apiStatus }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || `Update failed (${res.status})`)
    return data.item
  }

  async function applyStatus(booking, apiStatus, successMessage) {
    if (!token || !booking?.id) return
    setSavingId(booking.id)
    try {
      await patchStatus(booking.id, apiStatus)
      await loadBookings()
      if (detailBooking?.id === booking.id) {
        setDetailBooking(null)
      }
      pushToast({ message: successMessage, type: 'success' })
    } catch (e) {
      pushToast({ message: e.message || 'Could not update booking.', type: 'error' })
    } finally {
      setSavingId(null)
    }
  }

  function handleApprove(booking) {
    void applyStatus(booking, 'accepted', `Booking #${booking.id} approved.`)
  }

  function handleReject(booking) {
    void applyStatus(booking, 'rejected', `Booking #${booking.id} rejected.`)
  }

  function handleCancel(booking) {
    void applyStatus(booking, 'rejected', `Booking #${booking.id} cancelled.`)
  }

  function handleView(booking) {
    setDetailBooking({
      ...booking,
      payments: buildPaymentHistory(booking),
      messages: buildActivityMessages(booking),
    })
    setDetailLoading(false)
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

  return (
    <AdminLayout>
      <AdminBookings
        totalBookings={totalBookings}
        bookings={pageBookings}
        loading={bookingsLoading}
        activeTab={activeTab}
        page={page}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        filteredTotal={filteredBookings.length}
        detailBooking={detailBooking}
        detailLoading={detailLoading}
        savingId={savingId}
        onTabChange={(tab) => {
          setActiveTab(tab)
          setPage(0)
        }}
        onPageChange={setPage}
        onView={handleView}
        onApprove={handleApprove}
        onReject={handleReject}
        onCancel={handleCancel}
        onCloseDetail={() => setDetailBooking(null)}
      />
    </AdminLayout>
  )
}
