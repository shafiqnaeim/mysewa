import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { useAdminGuard } from '../hooks/useAdminGuard'
import { useToast } from '../context/ToastContext'
import { formatPropertyLocationLine, listPropertyImageUrls } from '../utils/propertyDisplay'
import AdminProperties from './dashboard/AdminProperties'

const PAGE_SIZE = 10

function formatListed(iso) {
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

function formatPrice(price) {
  const n = Number(price)
  if (!Number.isFinite(n)) return '—'
  return `RM ${n.toLocaleString('en-MY')}`
}

function resolveListingStatus(rawStatus) {
  const s = String(rawStatus || 'pending').toLowerCase()
  if (s === 'rejected') return 'rejected'
  if (s === 'pending' || s === 'maintenance') return 'pending'
  if (['available', 'rented', 'booked'].includes(s)) return 'verified'
  return 'pending'
}

function statusToApi(listingStatus) {
  if (listingStatus === 'verified') return 'available'
  if (listingStatus === 'rejected') return 'rejected'
  return 'pending'
}

function normalizeProperty(row, landlordMap) {
  const listingStatus = resolveListingStatus(row.status)
  const landlordName =
    landlordMap.get(Number(row.landlordId)) || (row.landlordId ? `Landlord #${row.landlordId}` : '—')
  return {
    ...row,
    rawStatus: row.status,
    listingStatus,
    landlordName,
    priceDisplay: formatPrice(row.price),
    listedDisplay: formatListed(row.createdAt),
    addressLine: [row.name, row.city].filter(Boolean).join(', ') || '—',
  }
}

function matchesFilters(property, { search, status, minPrice, maxPrice }) {
  const q = search.trim().toLowerCase()
  if (q) {
    const hay = `${property.name || ''} ${property.city || ''} ${property.addressLine || ''}`.toLowerCase()
    if (!hay.includes(q)) return false
  }
  if (status !== 'all' && property.listingStatus !== status) return false
  const price = Number(property.price)
  if (minPrice !== '' && Number.isFinite(Number(minPrice)) && (!Number.isFinite(price) || price < Number(minPrice))) {
    return false
  }
  if (maxPrice !== '' && Number.isFinite(Number(maxPrice)) && (!Number.isFinite(price) || price > Number(maxPrice))) {
    return false
  }
  return true
}

function buildLandlordMap(users) {
  const map = new Map()
  users.forEach((u) => {
    if (!u?.id) return
    const name = String(u.fullName || '').trim().split(/\s+/)[0] || u.email || `User #${u.id}`
    map.set(Number(u.id), name)
  })
  return map
}

export default function AdminPropertiesPage() {
  const { loading, error, token } = useAdminGuard()
  const { pushToast } = useToast()

  const [allProperties, setAllProperties] = useState([])
  const [totalProperties, setTotalProperties] = useState(0)
  const [propertiesLoading, setPropertiesLoading] = useState(false)

  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [page, setPage] = useState(0)

  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [actionSavingId, setActionSavingId] = useState(null)
  const [bulkSaving, setBulkSaving] = useState(false)

  const [detailProperty, setDetailProperty] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailImageUrls, setDetailImageUrls] = useState([])
  const [detailBookings, setDetailBookings] = useState([])
  const [detailReviews, setDetailReviews] = useState([])

  const loadProperties = useCallback(async () => {
    if (!token) return
    setPropertiesLoading(true)
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [propsRes, usersRes] = await Promise.all([
        fetch('/api/v1/admin/database/properties/rows?page=0&size=200', { headers }),
        fetch('/api/v1/admin/users?page=0&size=200', { headers }),
      ])
      const propsData = await propsRes.json().catch(() => ({}))
      const usersData = await usersRes.json().catch(() => ({}))
      if (!propsRes.ok) throw new Error(propsData.message || `Failed to load properties (${propsRes.status})`)

      const landlordMap = buildLandlordMap(Array.isArray(usersData.items) ? usersData.items : [])
      const items = Array.isArray(propsData.items)
        ? propsData.items.map((row) => normalizeProperty(row, landlordMap))
        : []
      setAllProperties(items)
      setTotalProperties(Number(propsData.totalElements) || items.length)
    } catch (e) {
      setAllProperties([])
      pushToast({ message: e.message || 'Could not load properties.', type: 'error' })
    } finally {
      setPropertiesLoading(false)
    }
  }, [token, pushToast])

  useEffect(() => {
    if (token) void loadProperties()
  }, [token, loadProperties])

  const filteredProperties = useMemo(
    () =>
      allProperties.filter((p) =>
        matchesFilters(p, {
          search: appliedSearch,
          status: statusFilter,
          minPrice,
          maxPrice,
        }),
      ),
    [allProperties, appliedSearch, statusFilter, minPrice, maxPrice],
  )

  const totalPages = Math.max(1, Math.ceil(filteredProperties.length / PAGE_SIZE))

  const pageProperties = useMemo(() => {
    const start = page * PAGE_SIZE
    return filteredProperties.slice(start, start + PAGE_SIZE)
  }, [filteredProperties, page])

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1))
  }, [page, totalPages])

  async function patchPropertyStatus(propertyId, listingStatus) {
    const res = await fetch(`/api/v1/admin/database/properties/${propertyId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: statusToApi(listingStatus) }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || `Update failed (${res.status})`)
    return data.item
  }

  async function handleVerifyProperty(row) {
    if (!token || !row?.id) return
    setActionSavingId(row.id)
    try {
      await patchPropertyStatus(row.id, 'verified')
      await loadProperties()
      if (detailProperty?.id === row.id) {
        setDetailProperty((prev) => (prev ? { ...prev, listingStatus: 'verified', rawStatus: 'available' } : null))
      }
      pushToast({ message: 'Property verified and published.', type: 'success' })
    } catch (e) {
      pushToast({ message: e.message || 'Could not verify property.', type: 'error' })
    } finally {
      setActionSavingId(null)
    }
  }

  async function handleUnverifyProperty(row) {
    if (!token || !row?.id) return
    setActionSavingId(row.id)
    try {
      await patchPropertyStatus(row.id, 'pending')
      await loadProperties()
      pushToast({ message: 'Property moved to pending.', type: 'success' })
    } catch (e) {
      pushToast({ message: e.message || 'Could not unverify property.', type: 'error' })
    } finally {
      setActionSavingId(null)
    }
  }

  async function handleRejectProperty(row) {
    if (!token || !row?.id) return
    setActionSavingId(row.id)
    try {
      await patchPropertyStatus(row.id, 'rejected')
      await loadProperties()
      pushToast({ message: 'Property rejected.', type: 'success' })
    } catch (e) {
      pushToast({ message: e.message || 'Could not reject property.', type: 'error' })
    } finally {
      setActionSavingId(null)
    }
  }

  async function handleDeleteProperty(row) {
    if (!token || !row?.id) return
    if (!window.confirm(`Delete property "${row.name}"? This cannot be undone.`)) return
    setActionSavingId(row.id)
    try {
      const res = await fetch(`/api/v1/admin/database/properties/${row.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Delete failed (${res.status})`)
      setAllProperties((prev) => prev.filter((p) => Number(p.id) !== Number(row.id)))
      setTotalProperties((n) => Math.max(0, n - 1))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(row.id)
        return next
      })
      if (detailProperty?.id === row.id) setDetailProperty(null)
      pushToast({ message: 'Property deleted.', type: 'success' })
    } catch (e) {
      pushToast({ message: e.message || 'Could not delete property.', type: 'error' })
    } finally {
      setActionSavingId(null)
    }
  }

  async function handleBulkVerify() {
    if (!selectedIds.size || !token) return
    setBulkSaving(true)
    try {
      let ok = 0
      for (const id of selectedIds) {
        const row = allProperties.find((p) => Number(p.id) === Number(id))
        if (!row || row.listingStatus === 'verified') continue
        try {
          await patchPropertyStatus(id, 'verified')
          ok += 1
        } catch {
          /* continue */
        }
      }
      await loadProperties()
      setSelectedIds(new Set())
      pushToast({ message: `${ok} propert${ok === 1 ? 'y' : 'ies'} verified.`, type: 'success' })
    } finally {
      setBulkSaving(false)
    }
  }

  async function handleBulkDelete() {
    if (!selectedIds.size || !token) return
    if (!window.confirm(`Delete ${selectedIds.size} selected properties?`)) return
    setBulkSaving(true)
    try {
      let ok = 0
      for (const id of selectedIds) {
        try {
          const res = await fetch(`/api/v1/admin/database/properties/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) ok += 1
        } catch {
          /* continue */
        }
      }
      await loadProperties()
      setSelectedIds(new Set())
      pushToast({ message: `${ok} propert${ok === 1 ? 'y' : 'ies'} deleted.`, type: 'success' })
    } finally {
      setBulkSaving(false)
    }
  }

  async function handleViewProperty(row) {
    setDetailProperty(row)
    setDetailLoading(true)
    setDetailImageUrls([])
    setDetailBookings([])
    setDetailReviews([])

    if (!token) {
      setDetailLoading(false)
      return
    }

    const headers = { Authorization: `Bearer ${token}` }

    try {
      const [detailRes, appsRes, reviewsRes] = await Promise.all([
        fetch(`/api/v1/properties/${row.id}`, { headers }),
        fetch('/api/v1/admin/database/applications/rows?page=0&size=200', { headers }),
        fetch(`/api/v1/reviews/for-property/${row.id}`, { headers }),
      ])

      const detailData = await detailRes.json().catch(() => ({}))
      if (detailRes.ok && detailData.item) {
        const item = detailData.item
        setDetailProperty((prev) => ({
          ...prev,
          ...item,
          addressLine: formatPropertyLocationLine(item) || prev?.addressLine,
          description: item.description,
          type: item.type,
          campus: item.campus,
        }))
        setDetailImageUrls(listPropertyImageUrls(item))
      }

      const appsData = await appsRes.json().catch(() => ({}))
      if (appsRes.ok) {
        const items = Array.isArray(appsData.items) ? appsData.items : []
        setDetailBookings(items.filter((a) => Number(a.propertyId) === Number(row.id)).slice(0, 10))
      }

      const reviewsData = await reviewsRes.json().catch(() => ({}))
      if (reviewsRes.ok) {
        setDetailReviews(Array.isArray(reviewsData.items) ? reviewsData.items.slice(0, 10) : [])
      }
    } catch {
      /* ignore */
    } finally {
      setDetailLoading(false)
    }
  }

  function handleSearch() {
    setAppliedSearch(searchInput)
    setPage(0)
    setSelectedIds(new Set())
  }

  function handleReset() {
    setSearchInput('')
    setAppliedSearch('')
    setStatusFilter('all')
    setMinPrice('')
    setMaxPrice('')
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
    const idsOnPage = pageProperties.map((p) => p.id)
    const allOnPage = idsOnPage.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allOnPage) idsOnPage.forEach((id) => next.delete(id))
      else idsOnPage.forEach((id) => next.add(id))
      return next
    })
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
      <AdminProperties
        totalProperties={totalProperties}
        properties={pageProperties}
        loading={propertiesLoading}
        searchInput={searchInput}
        statusFilter={statusFilter}
        minPrice={minPrice}
        maxPrice={maxPrice}
        selectedIds={selectedIds}
        page={page}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        filteredTotal={filteredProperties.length}
        detailProperty={detailProperty}
        detailLoading={detailLoading}
        detailImageUrls={detailImageUrls}
        detailBookings={detailBookings}
        detailReviews={detailReviews}
        actionSavingId={actionSavingId}
        bulkSaving={bulkSaving}
        onSearchInputChange={setSearchInput}
        onStatusFilterChange={(v) => {
          setStatusFilter(v)
          setPage(0)
        }}
        onMinPriceChange={setMinPrice}
        onMaxPriceChange={setMaxPrice}
        onSearch={handleSearch}
        onReset={handleReset}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onPageChange={setPage}
        onViewProperty={handleViewProperty}
        onCloseDetail={() => setDetailProperty(null)}
        onVerifyProperty={handleVerifyProperty}
        onUnverifyProperty={handleUnverifyProperty}
        onRejectProperty={handleRejectProperty}
        onDeleteProperty={handleDeleteProperty}
        onBulkVerify={handleBulkVerify}
        onBulkDelete={handleBulkDelete}
      />
    </AdminLayout>
  )
}
