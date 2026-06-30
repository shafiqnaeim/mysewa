import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { useAdminGuard } from '../hooks/useAdminGuard'
import { useToast } from '../context/ToastContext'
import { createUniversity } from '../utils/universitiesApi'
import AdminDatabase, { DbStatusBadge } from './dashboard/AdminDatabase'

const PAGE_SIZE = 10
const FETCH_SIZE = 200

function formatDbDate(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return String(iso)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

function formatPrice(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `RM ${n.toLocaleString('en-MY')}`
}

const TABS = [
  { id: 'users', label: 'Users', apiResource: 'users' },
  { id: 'properties', label: 'Properties', apiResource: 'properties' },
  { id: 'applications', label: 'Bookings', apiResource: 'applications' },
  { id: 'payments', label: 'Payments', apiResource: 'payments' },
  { id: 'reviews', label: 'Reviews', apiResource: 'reviews' },
  { id: 'universities', label: 'Universities', apiResource: 'universities' },
]

const PROPERTY_STATUSES = ['available', 'rented', 'booked', 'maintenance', 'pending', 'rejected']
const BOOKING_STATUSES = ['pending', 'accepted', 'rejected']
const PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded']

const TABLE_META = {
  users: {
    canAdd: false,
    canEdit: false,
    canDelete: false,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      { key: 'fullName', label: 'User', sortable: true },
      { key: 'email', label: 'Email', sortable: true },
      {
        key: 'role',
        label: 'Role',
        sortable: true,
        render: (r) => <DbStatusBadge value={r.role} variant="role" />,
      },
      {
        key: 'documentVerificationStatus',
        label: 'Identity',
        sortable: true,
        render: (r) =>
          String(r.role || '').toLowerCase() === 'admin' ? (
            <span className="text-xs text-[#9CA3AF]">—</span>
          ) : (
            <DbStatusBadge value={r.documentVerificationStatus} variant="identity" />
          ),
      },
      {
        key: 'accountStatus',
        label: 'Status',
        sortable: true,
        render: (r) => <DbStatusBadge value={r.accountStatus || 'active'} variant="account" />,
      },
      {
        key: 'verified',
        label: 'Email',
        sortable: true,
        render: (r) => <DbStatusBadge value={r.verified} variant="email" />,
      },
      {
        key: 'createdAt',
        label: 'Joined',
        sortable: true,
        render: (r) => formatDbDate(r.createdAt),
      },
    ],
  },
  properties: {
    canAdd: false,
    canEdit: true,
    canDelete: true,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      { key: 'name', label: 'Name', sortable: true },
      { key: 'city', label: 'City', sortable: true },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (r) => <DbStatusBadge value={r.status} variant="property" />,
      },
      {
        key: 'price',
        label: 'Price',
        sortable: true,
        render: (r) => formatPrice(r.price),
      },
      {
        key: 'createdAt',
        label: 'Listed',
        sortable: true,
        render: (r) => formatDbDate(r.createdAt),
      },
    ],
    editFields: [
      { key: 'name', label: 'Name', required: true },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: PROPERTY_STATUSES.map((s) => ({ value: s, label: s })),
      },
    ],
  },
  applications: {
    canAdd: false,
    canEdit: true,
    canDelete: true,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      { key: 'propertyId', label: 'Property', sortable: true },
      { key: 'studentId', label: 'Student', sortable: true },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (r) => <DbStatusBadge value={r.status} variant="booking" />,
      },
      {
        key: 'preferredMoveIn',
        label: 'Move in',
        sortable: true,
        render: (r) => formatDbDate(r.preferredMoveIn),
      },
      {
        key: 'createdAt',
        label: 'Created',
        sortable: true,
        render: (r) => formatDbDate(r.createdAt),
      },
    ],
    editFields: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: BOOKING_STATUSES.map((s) => ({ value: s, label: s })),
      },
    ],
  },
  payments: {
    canAdd: false,
    canEdit: true,
    canDelete: true,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      { key: 'applicationId', label: 'Booking', sortable: true },
      {
        key: 'amount',
        label: 'Amount',
        sortable: true,
        render: (r) => formatPrice(r.amount),
      },
      { key: 'type', label: 'Type', sortable: true },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (r) => <DbStatusBadge value={r.status} variant="payment" />,
      },
      {
        key: 'createdAt',
        label: 'Date',
        sortable: true,
        render: (r) => formatDbDate(r.createdAt),
      },
    ],
    editFields: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: PAYMENT_STATUSES.map((s) => ({ value: s, label: s })),
      },
    ],
  },
  reviews: {
    canAdd: true,
    canEdit: true,
    canDelete: true,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      { key: 'propertyId', label: 'Property', sortable: true },
      { key: 'studentId', label: 'Student', sortable: true },
      { key: 'rating', label: 'Rating', sortable: true },
      {
        key: 'comment',
        label: 'Comment',
        sortable: false,
        render: (r) => (String(r.comment || '').length > 48 ? `${String(r.comment).slice(0, 48)}…` : r.comment || '—'),
      },
      {
        key: 'createdAt',
        label: 'Created',
        sortable: true,
        render: (r) => formatDbDate(r.createdAt),
      },
    ],
    editFields: [
      { key: 'rating', label: 'Rating (1-5)', type: 'number', required: true },
      { key: 'comment', label: 'Comment', type: 'textarea', required: true },
    ],
    addFields: [
      { key: 'propertyId', label: 'Property ID', type: 'number', required: true },
      { key: 'studentId', label: 'Student ID', type: 'number', required: true },
      { key: 'rating', label: 'Rating (1-5)', type: 'number', required: true },
      { key: 'comment', label: 'Comment', type: 'textarea', required: true },
    ],
  },
  universities: {
    canAdd: true,
    canEdit: true,
    canDelete: true,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      { key: 'code', label: 'Code', sortable: true },
      { key: 'name', label: 'Name', sortable: true },
      {
        key: 'active',
        label: 'Status',
        sortable: true,
        render: (r) => <DbStatusBadge value={r.active} variant="active" />,
      },
      { key: 'city', label: 'City', sortable: true },
    ],
    editFields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'active', label: 'Active', type: 'checkbox' },
      { key: 'latitude', label: 'Latitude', inputMode: 'decimal' },
      { key: 'longitude', label: 'Longitude', inputMode: 'decimal' },
    ],
    addFields: [
      { key: 'code', label: 'Code', required: true },
      { key: 'name', label: 'Name', required: true },
      { key: 'latitude', label: 'Latitude', inputMode: 'decimal', required: true },
      { key: 'longitude', label: 'Longitude', inputMode: 'decimal', required: true },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'postcode', label: 'Postcode' },
    ],
  },
}

async function readJson(res) {
  const raw = await res.text()
  try {
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
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

function compareValues(a, b) {
  const na = Number(a)
  const nb = Number(b)
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' })
}

function buildSearchHaystack(row) {
  return Object.values(row)
    .filter((v) => v != null && typeof v !== 'object')
    .join(' ')
    .toLowerCase()
}

function defaultFormForFields(fields, row) {
  const form = {}
  fields.forEach((field) => {
    if (field.type === 'checkbox') {
      form[field.key] = row ? row[field.key] !== false : true
    } else {
      form[field.key] = row?.[field.key] != null ? String(row[field.key]) : ''
    }
  })
  return form
}

function isProtectedRow(tab, row) {
  if (tab === 'users' && String(row.role || '').toLowerCase() === 'admin') return true
  return false
}

function getRecordLabel(tab, row) {
  if (!row) return 'this record'
  if (tab === 'users') return row.fullName || row.email || `User #${row.id}`
  if (tab === 'properties') return row.name || `Property #${row.id}`
  if (tab === 'applications') return `Booking #${row.id}`
  if (tab === 'payments') return `Payment #${row.id}`
  if (tab === 'reviews') return `Review #${row.id}`
  if (tab === 'universities') return row.name || row.code || `University #${row.id}`
  return `Record #${row.id}`
}

export default function AdminDatabasePage() {
  const { loading, error, token } = useAdminGuard()
  const { pushToast } = useToast()

  const [activeTab, setActiveTab] = useState('users')
  const [allRows, setAllRows] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [rowsLoading, setRowsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('id')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(0)

  const [modalMode, setModalMode] = useState(null)
  const [modalRow, setModalRow] = useState(null)
  const [modalForm, setModalForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const meta = TABLE_META[activeTab]
  const apiResource = TABS.find((t) => t.id === activeTab)?.apiResource || activeTab

  const loadRows = useCallback(async () => {
    if (!token) return
    setRowsLoading(true)
    try {
      const res = await fetch(`/api/v1/admin/database/${apiResource}/rows?page=0&size=${FETCH_SIZE}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error(data.message || `Load failed (${res.status})`)
      setAllRows(Array.isArray(data.items) ? data.items : [])
      setTotalElements(Number(data.totalElements) || 0)
    } catch (e) {
      setAllRows([])
      setTotalElements(0)
      pushToast({ message: e.message || 'Unable to load rows.', type: 'error' })
    } finally {
      setRowsLoading(false)
    }
  }, [token, apiResource, pushToast])

  useEffect(() => {
    if (token) void loadRows()
  }, [token, loadRows])

  useEffect(() => {
    setPage(0)
    setSearch('')
    setSortKey('id')
    setSortDir('desc')
    setModalMode(null)
    setModalRow(null)
    setDeleteTarget(null)
  }, [activeTab])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = allRows
    if (q) {
      rows = rows.filter((row) => buildSearchHaystack(row).includes(q))
    }
    const sorted = [...rows].sort((a, b) => {
      const cmp = compareValues(a[sortKey], b[sortKey])
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted.map((row) => ({
      ...row,
      _canEdit: meta.canEdit,
      _canDelete: meta.canDelete && !isProtectedRow(activeTab, row),
    }))
  }, [allRows, search, sortKey, sortDir, meta.canEdit, meta.canDelete, activeTab])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))

  const pageRows = useMemo(() => {
    const start = page * PAGE_SIZE
    return filteredRows.slice(start, start + PAGE_SIZE)
  }, [filteredRows, page])

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1))
  }, [page, totalPages])

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function openAdd() {
    const fields = meta.addFields || []
    setModalMode('add')
    setModalRow(null)
    setModalForm(defaultFormForFields(fields))
  }

  function openEdit(row) {
    const fields = meta.editFields || []
    setModalMode('edit')
    setModalRow(row)
    setModalForm(defaultFormForFields(fields, row))
  }

  function closeModal() {
    if (saving) return
    setModalMode(null)
    setModalRow(null)
    setModalForm({})
  }

  function handleModalChange(key, value) {
    setModalForm((prev) => ({ ...prev, [key]: value }))
  }

  async function saveEdit() {
    if (!modalRow || !token) return
    setSaving(true)
    try {
      let body = {}
      if (activeTab === 'applications') body = { status: modalForm.status }
      if (activeTab === 'properties') body = { name: modalForm.name, status: modalForm.status }
      if (activeTab === 'payments') body = { status: modalForm.status }
      if (activeTab === 'reviews') body = { rating: Number(modalForm.rating), comment: modalForm.comment }
      if (activeTab === 'universities') {
        body = { name: modalForm.name, active: Boolean(modalForm.active) }
        const lat = Number(modalForm.latitude)
        const lng = Number(modalForm.longitude)
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          body.latitude = lat
          body.longitude = lng
        }
      }

      const res = await fetch(`/api/v1/admin/database/${apiResource}/${modalRow.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error(data.message || `Save failed (${res.status})`)
      pushToast({ message: 'Row updated.', type: 'success' })
      closeModal()
      loadRows()
    } catch (e) {
      pushToast({ message: e.message || 'Save failed.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function saveAdd() {
    if (!token) return
    setSaving(true)
    try {
      if (activeTab === 'universities') {
        await createUniversity(token, {
          code: String(modalForm.code || '').trim().toUpperCase(),
          name: String(modalForm.name || '').trim(),
          latitude: Number(modalForm.latitude),
          longitude: Number(modalForm.longitude),
          city: String(modalForm.city || '').trim() || null,
          state: String(modalForm.state || '').trim() || null,
          postcode: String(modalForm.postcode || '').trim() || null,
          active: true,
        })
      } else if (activeTab === 'reviews') {
        const res = await fetch(`/api/v1/admin/database/${apiResource}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            propertyId: Number(modalForm.propertyId),
            studentId: Number(modalForm.studentId),
            rating: Number(modalForm.rating),
            comment: String(modalForm.comment || '').trim(),
          }),
        })
        const data = await readJson(res)
        if (!res.ok) throw new Error(data.message || `Create failed (${res.status})`)
      } else {
        throw new Error('Add is not supported for this table.')
      }
      pushToast({ message: 'Record created.', type: 'success' })
      closeModal()
      loadRows()
    } catch (e) {
      pushToast({ message: e.message || 'Create failed.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!token || !deleteTarget) return
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/admin/database/${apiResource}/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error(data.message || `Delete failed (${res.status})`)
      pushToast({ message: 'Deleted.', type: 'success' })
      if (modalRow?.id === deleteTarget.id) closeModal()
      setDeleteTarget(null)
      loadRows()
    } catch (e) {
      pushToast({ message: e.message || 'Delete failed.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  function openDelete(row) {
    if (isProtectedRow(activeTab, row)) {
      pushToast({ message: 'Admin accounts cannot be deleted from here.', type: 'error' })
      return
    }
    setDeleteTarget(row)
  }

  function cancelDelete() {
    if (saving) return
    setDeleteTarget(null)
  }

  function exportRows() {
    return filteredRows.map(({ _canEdit, _canDelete, ...row }) => row)
  }

  function handleExportCsv() {
    const rows = exportRows()
    const keys = meta.columns.map((c) => c.key)
    const header = meta.columns.map((c) => c.label)
    const lines = [header.join(',')]
    rows.forEach((row) => {
      lines.push(keys.map((k) => escapeCsv(row[k])).join(','))
    })
    downloadBlob(lines.join('\n'), `mysewa-${activeTab}-${Date.now()}.csv`, 'text/csv;charset=utf-8')
    pushToast({ message: 'CSV export downloaded.', type: 'success' })
  }

  function handleExportJson() {
    const rows = exportRows()
    downloadBlob(JSON.stringify(rows, null, 2), `mysewa-${activeTab}-${Date.now()}.json`, 'application/json')
    pushToast({ message: 'JSON export downloaded.', type: 'success' })
  }

  const cappedNote =
    totalElements > FETCH_SIZE ? `Showing up to ${FETCH_SIZE} most recent rows. Use search to narrow results.` : null

  const modalTitle =
    modalMode === 'add'
      ? `Add ${TABS.find((t) => t.id === activeTab)?.label || 'record'}`
      : `Edit row #${modalRow?.id}`

  const modalFields = modalMode === 'add' ? meta.addFields || [] : meta.editFields || []

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
      <AdminDatabase
        tabs={TABS}
        activeTab={activeTab}
        columns={meta.columns}
        rows={pageRows}
        loading={rowsLoading}
        search={search}
        sortKey={sortKey}
        sortDir={sortDir}
        page={page}
        totalPages={totalPages}
        filteredTotal={filteredRows.length}
        pageSize={PAGE_SIZE}
        totalElements={totalElements}
        cappedNote={cappedNote}
        canAdd={meta.canAdd}
        modalMode={modalMode}
        modalTitle={modalTitle}
        modalFields={modalFields}
        modalForm={modalForm}
        editingId={modalMode === 'edit' ? modalRow?.id : null}
        saving={saving}
        deleteTarget={deleteTarget}
        deleteRecordLabel={getRecordLabel(activeTab, deleteTarget)}
        onTabChange={setActiveTab}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(0)
        }}
        onSort={handleSort}
        onPageChange={setPage}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={openDelete}
        onDeleteConfirm={confirmDelete}
        onDeleteCancel={cancelDelete}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        onModalChange={handleModalChange}
        onModalSubmit={modalMode === 'add' ? saveAdd : saveEdit}
        onModalClose={closeModal}
      />
    </AdminLayout>
  )
}
