import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { useAdminGuard } from '../hooks/useAdminGuard'
import { useToast } from '../context/ToastContext'
import AdminReports, { formatDate, formatMoney } from './dashboard/AdminReports'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function splitDisplayName(fullName, email) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length) return parts[0]
  if (email) return String(email).split('@')[0]
  return 'User'
}

function getFilterRange(filterKey) {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  let start
  if (filterKey === 'last7') {
    start = new Date(end.getTime() - 6 * 86400000)
    start.setHours(0, 0, 0, 0)
  } else if (filterKey === 'last30') {
    start = new Date(end.getTime() - 29 * 86400000)
    start.setHours(0, 0, 0, 0)
  } else if (filterKey === 'last90') {
    start = new Date(end.getTime() - 89 * 86400000)
    start.setHours(0, 0, 0, 0)
  } else {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
  }
  return { start, end }
}

function buildMonthlyBuckets(range) {
  const buckets = []
  const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1)
  const endLimit = range.end

  while (cursor <= endLimit) {
    const bucketStart = new Date(cursor)
    const bucketEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999)
    const label =
      range.start.getFullYear() !== range.end.getFullYear()
        ? `${MONTH_LABELS[cursor.getMonth()]} '${String(cursor.getFullYear()).slice(-2)}`
        : MONTH_LABELS[cursor.getMonth()]

    buckets.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      month: label,
      start: bucketStart,
      end: bucketEnd,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  if (!buckets.length) {
    buckets.push({
      key: `${range.start.getFullYear()}-${range.start.getMonth()}`,
      month: MONTH_LABELS[range.start.getMonth()],
      start: range.start,
      end: range.end,
    })
  }

  return buckets
}

function isWithinRange(iso, range) {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return Number.isFinite(t) && t >= range.start.getTime() && t <= range.end.getTime()
}

function isInBucket(iso, bucket, range) {
  if (!iso) return false
  const t = new Date(iso).getTime()
  const start = Math.max(bucket.start.getTime(), range.start.getTime())
  const end = Math.min(bucket.end.getTime(), range.end.getTime())
  return Number.isFinite(t) && t >= start && t <= end
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

function resolveUserStatus(user) {
  const account = String(user.accountStatus || 'active').toLowerCase()
  if (account === 'suspended') return 'Suspended'
  if (!user.verified) return 'Pending'
  return 'Active'
}

function resolveBookingStatus(status) {
  const s = String(status || 'pending').toLowerCase()
  if (s === 'accepted') return 'Approved'
  if (s === 'rejected') return 'Rejected'
  return 'Pending'
}

function escapeCsv(value) {
  const s = String(value ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export default function AdminReportsPage() {
  const { loading, error, token } = useAdminGuard()
  const { pushToast } = useToast()

  const [dateFilter, setDateFilter] = useState('last30')
  const [dataLoading, setDataLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [properties, setProperties] = useState([])
  const [applications, setApplications] = useState([])
  const [payments, setPayments] = useState([])

  const loadData = useCallback(async () => {
    if (!token) return
    setDataLoading(true)
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [usersRes, propsRes, appsRes, paymentsRes] = await Promise.all([
        fetch('/api/v1/admin/users?page=0&size=200', { headers }),
        fetch('/api/v1/admin/database/properties/rows?page=0&size=200', { headers }),
        fetch('/api/v1/admin/database/applications/rows?page=0&size=200', { headers }),
        fetch('/api/v1/admin/payments', { headers }),
      ])

      const usersData = await usersRes.json().catch(() => ({}))
      const propsData = await propsRes.json().catch(() => ({}))
      const appsData = await appsRes.json().catch(() => ({}))
      const paymentsData = await paymentsRes.json().catch(() => ({}))

      if (!usersRes.ok) throw new Error(usersData.message || 'Failed to load users')

      setUsers(Array.isArray(usersData.items) ? usersData.items : [])
      setProperties(Array.isArray(propsData.items) ? propsData.items : [])
      setApplications(Array.isArray(appsData.items) ? appsData.items : [])
      setPayments(Array.isArray(paymentsData.items) ? paymentsData.items : [])
    } catch (e) {
      setUsers([])
      setProperties([])
      setApplications([])
      setPayments([])
      pushToast({ message: e.message || 'Could not load reports.', type: 'error' })
    } finally {
      setDataLoading(false)
    }
  }, [token, pushToast])

  useEffect(() => {
    if (token) void loadData()
  }, [token, loadData])

  const range = useMemo(() => getFilterRange(dateFilter), [dateFilter])
  const buckets = useMemo(() => buildMonthlyBuckets(range), [range])

  const filteredUsers = useMemo(
    () => users.filter((u) => isWithinRange(u.createdAt, range)),
    [users, range],
  )
  const filteredProperties = useMemo(
    () => properties.filter((p) => isWithinRange(p.createdAt, range)),
    [properties, range],
  )
  const filteredApplications = useMemo(
    () => applications.filter((a) => isWithinRange(a.createdAt, range)),
    [applications, range],
  )
  const filteredPayments = useMemo(
    () =>
      payments.filter((p) => {
        const paid = ['paid', 'completed'].includes(String(p.status || '').toLowerCase())
        return paid && isWithinRange(p.date, range)
      }),
    [payments, range],
  )

  const userGrowthData = useMemo(
    () =>
      buckets.map((bucket) => ({
        month: bucket.month,
        users: filteredUsers.filter((u) => isInBucket(u.createdAt, bucket, range)).length,
      })),
    [buckets, filteredUsers, range],
  )

  const propertyGrowthData = useMemo(
    () =>
      buckets.map((bucket) => ({
        month: bucket.month,
        properties: filteredProperties.filter((p) => isInBucket(p.createdAt, bucket, range)).length,
      })),
    [buckets, filteredProperties, range],
  )

  const revenueData = useMemo(
    () =>
      buckets.map((bucket) => ({
        month: bucket.month,
        revenue: filteredPayments
          .filter((p) => isInBucket(p.date, bucket, range))
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      })),
    [buckets, filteredPayments, range],
  )

  const bookingTrendsData = useMemo(
    () =>
      buckets.map((bucket) => ({
        month: bucket.month,
        bookings: filteredApplications.filter((a) => isInBucket(a.createdAt, bucket, range)).length,
      })),
    [buckets, filteredApplications, range],
  )

  const userById = useMemo(() => buildUserMaps(users), [users])
  const propertyById = useMemo(() => buildPropertyMap(properties), [properties])

  const userReportRows = useMemo(
    () =>
      filteredUsers.slice(0, 50).map((u) => ({
        id: u.id,
        name: u.fullName || splitDisplayName(u.fullName, u.email),
        email: u.email || '—',
        role: String(u.role || '—').charAt(0).toUpperCase() + String(u.role || '').slice(1),
        joined: formatDate(u.createdAt),
        status: resolveUserStatus(u),
      })),
    [filteredUsers],
  )

  const propertyReportRows = useMemo(
    () =>
      filteredProperties.slice(0, 50).map((p) => {
        const landlord = userById.get(Number(p.landlordId))
        return {
          id: p.id,
          name: p.name || `Property #${p.id}`,
          city: p.city || '—',
          landlord: splitDisplayName(landlord?.fullName, landlord?.email),
          status: String(p.status || '—'),
          listed: formatDate(p.createdAt),
        }
      }),
    [filteredProperties, userById],
  )

  const bookingReportRows = useMemo(
    () =>
      filteredApplications.slice(0, 50).map((a) => {
        const student = userById.get(Number(a.studentId))
        const property = propertyById.get(Number(a.propertyId))
        return {
          id: a.id,
          student: splitDisplayName(student?.fullName, student?.email),
          property: property?.name || `Property #${a.propertyId}`,
          status: resolveBookingStatus(a.status),
          submitted: formatDate(a.createdAt),
        }
      }),
    [filteredApplications, userById, propertyById],
  )

  function buildExportCsv() {
    const sections = []

    sections.push('User Report')
    sections.push(['Name', 'Email', 'Role', 'Joined', 'Status'].join(','))
    userReportRows.forEach((row) => {
      sections.push([row.name, row.email, row.role, row.joined, row.status].map(escapeCsv).join(','))
    })

    sections.push('')
    sections.push('Property Report')
    sections.push(['Property', 'City', 'Landlord', 'Status', 'Listed'].join(','))
    propertyReportRows.forEach((row) => {
      sections.push([row.name, row.city, row.landlord, row.status, row.listed].map(escapeCsv).join(','))
    })

    sections.push('')
    sections.push('Booking Report')
    sections.push(['ID', 'Student', 'Property', 'Status', 'Submitted'].join(','))
    bookingReportRows.forEach((row) => {
      sections.push([row.id, row.student, row.property, row.status, row.submitted].map(escapeCsv).join(','))
    })

    return sections.join('\n')
  }

  function buildPrintableHtml() {
    const filterLabel =
      dateFilter === 'last7'
        ? 'Last 7 Days'
        : dateFilter === 'last30'
          ? 'Last 30 Days'
          : dateFilter === 'last90'
            ? 'Last 90 Days'
            : 'This Year'

    const userRows = userReportRows
      .map(
        (r) =>
          `<tr><td>${r.name}</td><td>${r.email}</td><td>${r.role}</td><td>${r.joined}</td><td>${r.status}</td></tr>`,
      )
      .join('')
    const propertyRows = propertyReportRows
      .map(
        (r) =>
          `<tr><td>${r.name}</td><td>${r.city}</td><td>${r.landlord}</td><td>${r.status}</td><td>${r.listed}</td></tr>`,
      )
      .join('')
    const bookingRows = bookingReportRows
      .map(
        (r) =>
          `<tr><td>${r.id}</td><td>${r.student}</td><td>${r.property}</td><td>${r.status}</td><td>${r.submitted}</td></tr>`,
      )
      .join('')

    const totalRevenue = revenueData.reduce((sum, row) => sum + (Number(row.revenue) || 0), 0)

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>MySewa Reports</title>
<style>
body{font-family:Arial,sans-serif;padding:24px;color:#1a1a2e}
h1{font-size:20px} h2{font-size:14px;margin-top:24px}
p{color:#6b7280;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}
th{background:#fafafa}
</style></head><body>
<h1>MySewa Platform Reports</h1>
<p>Period: ${filterLabel} · Users: ${filteredUsers.length} · Properties: ${filteredProperties.length} · Bookings: ${filteredApplications.length} · Revenue: ${formatMoney(totalRevenue)}</p>
<h2>User Report</h2>
<table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th></tr></thead><tbody>${userRows}</tbody></table>
<h2>Property Report</h2>
<table><thead><tr><th>Property</th><th>City</th><th>Landlord</th><th>Status</th><th>Listed</th></tr></thead><tbody>${propertyRows}</tbody></table>
<h2>Booking Report</h2>
<table><thead><tr><th>ID</th><th>Student</th><th>Property</th><th>Status</th><th>Submitted</th></tr></thead><tbody>${bookingRows}</tbody></table>
</body></html>`
  }

  function handleExportCsv() {
    downloadBlob(buildExportCsv(), `mysewa-reports-${dateFilter}-${Date.now()}.csv`, 'text/csv;charset=utf-8')
    pushToast({ message: 'CSV export downloaded.', type: 'success' })
  }

  function handleExportPdf() {
    const html = buildPrintableHtml()
    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) {
      pushToast({ message: 'Allow pop-ups to export PDF.', type: 'error' })
      return
    }
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    pushToast({ message: 'PDF export opened in print dialog.', type: 'info' })
  }

  function handlePrint() {
    window.print()
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
      <AdminReports
        dateFilter={dateFilter}
        loading={dataLoading}
        userGrowthData={userGrowthData}
        propertyGrowthData={propertyGrowthData}
        revenueData={revenueData}
        bookingTrendsData={bookingTrendsData}
        userReportRows={userReportRows}
        propertyReportRows={propertyReportRows}
        bookingReportRows={bookingReportRows}
        onDateFilterChange={setDateFilter}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
        onPrint={handlePrint}
      />
    </AdminLayout>
  )
}
