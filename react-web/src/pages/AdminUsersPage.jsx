import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'
import { useAdminGuard } from '../hooks/useAdminGuard'
import { useToast } from '../context/ToastContext'
import AdminUsers from './dashboard/AdminUsers'

const PAGE_SIZE = 10

function splitDisplayName(fullName, email) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length) return parts[0]
  if (email) return String(email).split('@')[0]
  return 'User'
}

function formatJoined(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = String(d.getFullYear()).slice(-2)
    return `${day}/${month}/${year}`
  } catch {
    return '—'
  }
}

function isPendingVerification(status) {
  const s = String(status || '').trim().toLowerCase()
  if (!s || s === 'verified' || s === 'exempt' || s === 'not_submitted') return false
  return s.includes('pending') || s.includes('submitted') || s.includes('review') || s.includes('await')
}

function resolveDisplayStatus(user) {
  const account = String(user.accountStatus || 'active').toLowerCase()
  if (account === 'suspended') return 'suspended'
  return 'active'
}

function normalizeUser(row) {
  const displayStatus = resolveDisplayStatus(row)
  const needsVerification = isPendingVerification(row.documentVerificationStatus) || !row.verified
  return {
    ...row,
    displayName: splitDisplayName(row.fullName, row.email),
    displayStatus,
    needsVerification,
    joinedDisplay: formatJoined(row.createdAt),
  }
}

function matchesFilters(user, { search, role, status }) {
  const q = search.trim().toLowerCase()
  if (q) {
    const hay = `${user.fullName || ''} ${user.email || ''}`.toLowerCase()
    if (!hay.includes(q)) return false
  }
  if (role !== 'all' && String(user.role || '').toLowerCase() !== role) return false
  if (status !== 'all' && user.displayStatus !== status) return false
  return true
}

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const { user: adminUser, loading, error, token } = useAdminGuard()
  const { pushToast } = useToast()

  const [allUsers, setAllUsers] = useState([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [usersLoading, setUsersLoading] = useState(false)

  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(0)

  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [actionSavingId, setActionSavingId] = useState(null)
  const [bulkSaving, setBulkSaving] = useState(false)

  const [detailUser, setDetailUser] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailBookings, setDetailBookings] = useState([])
  const [detailProperties, setDetailProperties] = useState([])
  const [detailActivity, setDetailActivity] = useState([])
  const [detailVerification, setDetailVerification] = useState(null)

  const loadUsers = useCallback(async () => {
    if (!token) return
    setUsersLoading(true)
    try {
      const res = await fetch('/api/v1/admin/users?page=0&size=200', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Failed to load users (${res.status})`)
      const items = Array.isArray(data.items) ? data.items.map(normalizeUser) : []
      setAllUsers(items)
      setTotalUsers(Number(data.totalElements) || items.length)
    } catch (e) {
      setAllUsers([])
      pushToast({ message: e.message || 'Could not load users.', type: 'error' })
    } finally {
      setUsersLoading(false)
    }
  }, [token, pushToast])

  useEffect(() => {
    if (token) void loadUsers()
  }, [token, loadUsers])

  const filteredUsers = useMemo(
    () =>
      allUsers.filter((u) =>
        matchesFilters(u, { search: appliedSearch, role: roleFilter, status: statusFilter }),
      ),
    [allUsers, appliedSearch, roleFilter, statusFilter],
  )

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))

  const pageUsers = useMemo(() => {
    const start = page * PAGE_SIZE
    return filteredUsers.slice(start, start + PAGE_SIZE)
  }, [filteredUsers, page])

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1))
  }, [page, totalPages])

  function handleSearch() {
    setAppliedSearch(searchInput)
    setPage(0)
    setSelectedIds(new Set())
  }

  function handleReset() {
    setSearchInput('')
    setAppliedSearch('')
    setRoleFilter('all')
    setStatusFilter('all')
    setPage(0)
    setSelectedIds(new Set())
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    const idsOnPage = pageUsers.map((u) => u.id)
    const allOnPage = idsOnPage.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allOnPage) {
        idsOnPage.forEach((id) => next.delete(id))
      } else {
        idsOnPage.forEach((id) => {
          if (Number(id) !== Number(adminUser?.id)) next.add(id)
        })
      }
      return next
    })
  }

  async function updateAccountStatus(userId, accountStatus) {
    const res = await fetch(`/api/v1/admin/users/${userId}/account-status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ accountStatus }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || `Update failed (${res.status})`)
    return normalizeUser(data.item || {})
  }

  async function handleSuspendUser(row) {
    if (!token || !row?.id) return
    const nextStatus = row.displayStatus === 'suspended' ? 'active' : 'suspended'
    setActionSavingId(row.id)
    try {
      const updated = await updateAccountStatus(row.id, nextStatus)
      setAllUsers((prev) => prev.map((u) => (Number(u.id) === Number(updated.id) ? updated : u)))
      if (detailUser?.id === row.id) setDetailUser(updated)
      pushToast({
        message: nextStatus === 'suspended' ? 'User suspended.' : 'User activated.',
        type: 'success',
      })
    } catch (e) {
      pushToast({ message: e.message || 'Could not update user.', type: 'error' })
    } finally {
      setActionSavingId(null)
    }
  }

  function handleVerifyUser(row) {
    pushToast({ message: 'Opening verification workflow…', type: 'info' })
    navigate('/dashboard/admin/verification')
  }

  function handleDeleteUser(row) {
    pushToast({
      message: 'User deletion is not available yet. Suspend the account instead.',
      type: 'info',
    })
  }

  async function handleBulkSuspend() {
    if (!selectedIds.size || !token) return
    setBulkSaving(true)
    try {
      let ok = 0
      for (const id of selectedIds) {
        if (Number(id) === Number(adminUser?.id)) continue
        const row = allUsers.find((u) => Number(u.id) === Number(id))
        if (!row || row.displayStatus === 'suspended') continue
        try {
          const updated = await updateAccountStatus(id, 'suspended')
          setAllUsers((prev) => prev.map((u) => (Number(u.id) === Number(updated.id) ? updated : u)))
          ok += 1
        } catch {
          /* continue */
        }
      }
      setSelectedIds(new Set())
      pushToast({ message: `${ok} user(s) suspended.`, type: 'success' })
    } finally {
      setBulkSaving(false)
    }
  }

  function handleBulkDelete() {
    pushToast({
      message: 'Bulk delete is not available yet.',
      type: 'info',
    })
  }

  function handleOpenVerification(row) {
    navigate('/dashboard/admin/verification')
  }

  async function handleViewUser(row) {
    setDetailUser(row)
    setDetailLoading(true)
    setDetailBookings([])
    setDetailProperties([])
    setDetailVerification(null)
    setDetailActivity([
      { id: 'joined', text: `Joined platform on ${row.joinedDisplay}` },
      { id: 'status', text: `Account status: ${row.displayStatus}` },
    ])

    if (!token) {
      setDetailLoading(false)
      return
    }

    const role = String(row.role || '').toLowerCase()
    const headers = { Authorization: `Bearer ${token}` }

    try {
      if (role === 'student' || role === 'landlord') {
        const vRes = await fetch(`/api/v1/admin/verifications/${row.id}`, { headers })
        const vData = await vRes.json().catch(() => ({}))
        if (vRes.ok && vData.item) {
          setDetailVerification(vData.item)
        }
      }
      if (role === 'student') {
        const res = await fetch('/api/v1/admin/database/applications/rows?page=0&size=200', { headers })
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          const items = Array.isArray(data.items) ? data.items : []
          setDetailBookings(items.filter((a) => Number(a.studentId) === Number(row.id)).slice(0, 10))
        }
      }
      if (role === 'landlord') {
        const res = await fetch('/api/v1/admin/database/properties/rows?page=0&size=200', { headers })
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          const items = Array.isArray(data.items) ? data.items : []
          setDetailProperties(items.filter((p) => Number(p.landlordId) === Number(row.id)).slice(0, 10))
        }
      }
    } catch {
      /* ignore */
    } finally {
      setDetailLoading(false)
    }
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
      <AdminUsers
        totalUsers={totalUsers}
        users={pageUsers}
        loading={usersLoading}
        searchInput={searchInput}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        selectedIds={selectedIds}
        page={page}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        filteredTotal={filteredUsers.length}
        detailUser={detailUser}
        detailLoading={detailLoading}
        detailBookings={detailBookings}
        detailProperties={detailProperties}
        detailActivity={detailActivity}
        detailVerification={detailVerification}
        actionSavingId={actionSavingId}
        bulkSaving={bulkSaving}
        currentAdminId={adminUser?.id}
        onSearchInputChange={setSearchInput}
        onRoleFilterChange={(v) => {
          setRoleFilter(v)
          setPage(0)
        }}
        onStatusFilterChange={(v) => {
          setStatusFilter(v)
          setPage(0)
        }}
        onSearch={handleSearch}
        onReset={handleReset}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onPageChange={setPage}
        onViewUser={handleViewUser}
        onCloseDetail={() => {
          setDetailUser(null)
          setDetailVerification(null)
        }}
        onSuspendUser={handleSuspendUser}
        onVerifyUser={handleVerifyUser}
        onOpenVerification={handleOpenVerification}
        onToggleDetailStatus={() => detailUser && handleSuspendUser(detailUser)}
        onDeleteUser={handleDeleteUser}
        onBulkSuspend={handleBulkSuspend}
        onBulkDelete={handleBulkDelete}
      />
    </AdminLayout>
  )
}
