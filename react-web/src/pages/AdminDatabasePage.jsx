import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardShell from '../components/DashboardShell'
import { useAdminGuard } from '../hooks/useAdminGuard'
import { useToast } from '../context/ToastContext'
import { createUniversity } from '../utils/universitiesApi'

const TABS = [
  { id: 'users', label: 'Users' },
  { id: 'properties', label: 'Properties' },
  { id: 'applications', label: 'Applications' },
  { id: 'universities', label: 'Universities' },
]

const PROPERTY_STATUSES = ['available', 'rented', 'booked', 'maintenance']

async function readJson(res) {
  const raw = await res.text()
  try {
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export default function AdminDatabasePage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, error: authError, token } = useAdminGuard()
  const { pushToast } = useToast()

  const [resource, setResource] = useState('users')
  const [page, setPage] = useState(0)
  const [items, setItems] = useState([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [rowsLoading, setRowsLoading] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [creatingUni, setCreatingUni] = useState(false)
  const [uniCreate, setUniCreate] = useState({
    code: '',
    name: '',
    latitude: '',
    longitude: '',
    city: '',
    state: '',
    postcode: '',
  })

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    [token],
  )

  const loadRows = useCallback(async () => {
    if (!token) return
    setRowsLoading(true)
    try {
      const res = await fetch(`/api/v1/admin/database/${resource}/rows?page=${page}&size=25`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error(data.message || `Load failed (${res.status})`)
      setItems(Array.isArray(data.items) ? data.items : [])
      setTotalPages(Number(data.totalPages) || 0)
      setTotalElements(Number(data.totalElements) || 0)
    } catch (e) {
      setItems([])
      pushToast({ message: e.message || 'Unable to load rows.', type: 'error' })
    } finally {
      setRowsLoading(false)
    }
  }, [token, resource, page, pushToast])

  useEffect(() => {
    if (token) loadRows()
  }, [token, loadRows])

  useEffect(() => {
    setPage(0)
  }, [resource])

  function openEdit(row) {
    setEditRow(row)
    if (resource === 'applications') {
      setEditForm({ status: row.status || 'pending' })
    } else if (resource === 'properties') {
      setEditForm({ name: row.name || '', status: row.status || 'available' })
    } else if (resource === 'universities') {
      setEditForm({
        name: row.name || '',
        active: row.active !== false,
        latitude: row.latitude != null ? String(row.latitude) : '',
        longitude: row.longitude != null ? String(row.longitude) : '',
      })
    }
  }

  async function saveEdit() {
    if (!editRow || !token) return
    setSaving(true)
    try {
      let body = {}
      if (resource === 'applications') body = { status: editForm.status }
      if (resource === 'properties') body = { name: editForm.name, status: editForm.status }
      if (resource === 'universities') {
        body = { name: editForm.name, active: editForm.active }
        const lat = Number(editForm.latitude)
        const lng = Number(editForm.longitude)
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          body.latitude = lat
          body.longitude = lng
        }
      }
      const res = await fetch(`/api/v1/admin/database/${resource}/${editRow.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify(body),
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error(data.message || `Save failed (${res.status})`)
      pushToast({ message: 'Row updated.', type: 'success' })
      setEditRow(null)
      loadRows()
    } catch (e) {
      pushToast({ message: e.message || 'Save failed.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function deleteRow(row) {
    if (!token) return
    const ok = window.confirm(`Delete this ${resource.slice(0, -1)} row #${row.id}?`)
    if (!ok) return
    try {
      const res = await fetch(`/api/v1/admin/database/${resource}/${row.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error(data.message || `Delete failed (${res.status})`)
      pushToast({ message: 'Deleted.', type: 'success' })
      if (editRow?.id === row.id) setEditRow(null)
      loadRows()
    } catch (e) {
      pushToast({ message: e.message || 'Delete failed.', type: 'error' })
    }
  }

  async function submitUniversityCreate(e) {
    e.preventDefault()
    if (!token) return
    setCreatingUni(true)
    try {
      const body = {
        code: uniCreate.code.trim().toUpperCase(),
        name: uniCreate.name.trim(),
        latitude: Number(uniCreate.latitude),
        longitude: Number(uniCreate.longitude),
        city: uniCreate.city.trim() || null,
        state: uniCreate.state.trim() || null,
        postcode: uniCreate.postcode.trim() || null,
        active: true,
      }
      await createUniversity(token, body)
      pushToast({ message: 'University created.', type: 'success' })
      setUniCreate({ code: '', name: '', latitude: '', longitude: '', city: '', state: '', postcode: '' })
      loadRows()
    } catch (e) {
      pushToast({ message: e.message || 'Create failed.', type: 'error' })
    } finally {
      setCreatingUni(false)
    }
  }

  function renderTableHead() {
    if (resource === 'users') {
      return (
        <tr>
          <th>ID</th>
          <th>Email</th>
          <th>Name</th>
          <th>Role</th>
          <th>Account</th>
          <th>Actions</th>
        </tr>
      )
    }
    if (resource === 'properties') {
      return (
        <tr>
          <th>ID</th>
          <th>Landlord</th>
          <th>Name</th>
          <th>City</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      )
    }
    if (resource === 'applications') {
      return (
        <tr>
          <th>ID</th>
          <th>Property</th>
          <th>Student</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      )
    }
    return (
      <tr>
        <th>ID</th>
        <th>Code</th>
        <th>Name</th>
        <th>Active</th>
        <th>Actions</th>
      </tr>
    )
  }

  function renderCells(row) {
    if (resource === 'users') {
      return (
        <>
          <td>{row.id}</td>
          <td title={row.email}>{row.email}</td>
          <td>{row.fullName || '—'}</td>
          <td>{row.role}</td>
          <td>{row.accountStatus}</td>
          <td>
            <button type="button" className="admin-db-btn" onClick={() => navigate('/admin')}>
              Suspend on myDashboard
            </button>
          </td>
        </>
      )
    }
    if (resource === 'properties') {
      return (
        <>
          <td>{row.id}</td>
          <td>{row.landlordId}</td>
          <td>{row.name}</td>
          <td>{row.city || '—'}</td>
          <td>{row.status}</td>
          <td className="admin-db-actions">
            <button type="button" className="admin-db-btn" onClick={() => openEdit(row)}>
              Edit
            </button>
            <button type="button" className="admin-db-btn admin-db-btn--danger" onClick={() => deleteRow(row)}>
              Delete
            </button>
          </td>
        </>
      )
    }
    if (resource === 'applications') {
      return (
        <>
          <td>{row.id}</td>
          <td>{row.propertyId}</td>
          <td>{row.studentId}</td>
          <td>{row.status}</td>
          <td className="admin-db-actions">
            <button type="button" className="admin-db-btn" onClick={() => openEdit(row)}>
              Edit
            </button>
            <button type="button" className="admin-db-btn admin-db-btn--danger" onClick={() => deleteRow(row)}>
              Delete
            </button>
          </td>
        </>
      )
    }
    return (
      <>
        <td>{row.id}</td>
        <td>{row.code}</td>
        <td>{row.name}</td>
        <td>{row.active ? 'Yes' : 'No'}</td>
        <td className="admin-db-actions">
          <button type="button" className="admin-db-btn" onClick={() => openEdit(row)}>
            Edit
          </button>
          <button type="button" className="admin-db-btn admin-db-btn--danger" onClick={() => deleteRow(row)}>
            Delete
          </button>
        </td>
      </>
    )
  }

  return (
    <DashboardShell blend>
      <div className="admin-database-page student-account-page-with-footer">
        <header className="admin-database-header">
          <p className="admin-settings-eyebrow">System tools</p>
          <h1 className="admin-settings-title">myDatabase</h1>
          <p className="admin-settings-lead">
            Browse whitelisted tables with pagination. Updates use validated JSON — not raw SQL. User account status
            changes stay on myDashboard for safety.
          </p>
        </header>

        {authLoading ? <div className="auth-toast">Verifying privileges…</div> : null}
        {authError ? <div className="auth-toast auth-toast-error">{authError}</div> : null}

        {!authLoading && !authError && user && token ? (
          <>
            <div className="admin-db-tabs" role="tablist" aria-label="Database tables">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={resource === t.id}
                  className={`admin-db-tab${resource === t.id ? ' admin-db-tab--on' : ''}`}
                  onClick={() => setResource(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {resource === 'universities' ? (
              <form className="admin-db-create-card" onSubmit={submitUniversityCreate}>
                <h2 className="admin-db-create-title">Quick add university</h2>
                <p className="admin-db-create-hint">
                  Same rules as mySettings — code must be unique; latitude and longitude are required. For richer
                  editing use mySettings.
                </p>
                <div className="admin-db-create-grid">
                  <label>
                    Code
                    <input
                      value={uniCreate.code}
                      onChange={(e) => setUniCreate((p) => ({ ...p, code: e.target.value }))}
                      placeholder="UMT"
                      required
                    />
                  </label>
                  <label>
                    Name
                    <input
                      value={uniCreate.name}
                      onChange={(e) => setUniCreate((p) => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Latitude
                    <input
                      value={uniCreate.latitude}
                      onChange={(e) => setUniCreate((p) => ({ ...p, latitude: e.target.value }))}
                      inputMode="decimal"
                      required
                    />
                  </label>
                  <label>
                    Longitude
                    <input
                      value={uniCreate.longitude}
                      onChange={(e) => setUniCreate((p) => ({ ...p, longitude: e.target.value }))}
                      inputMode="decimal"
                      required
                    />
                  </label>
                  <label>
                    City
                    <input value={uniCreate.city} onChange={(e) => setUniCreate((p) => ({ ...p, city: e.target.value }))} />
                  </label>
                  <label>
                    State
                    <input value={uniCreate.state} onChange={(e) => setUniCreate((p) => ({ ...p, state: e.target.value }))} />
                  </label>
                </div>
                <button type="submit" className="signin-submit" disabled={creatingUni}>
                  {creatingUni ? 'Creating…' : 'Create university'}
                </button>
              </form>
            ) : null}

            <div className="admin-db-toolbar">
              <span className="admin-db-count">
                {rowsLoading ? 'Loading…' : `${totalElements} rows`}
                {totalPages > 1 ? ` · page ${page + 1} / ${totalPages}` : ''}
              </span>
              <div className="admin-db-pager">
                <button type="button" className="admin-db-btn" disabled={page <= 0 || rowsLoading} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </button>
                <button
                  type="button"
                  className="admin-db-btn"
                  disabled={rowsLoading || page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>

            <div className="admin-db-table-wrap">
              <table className="admin-db-table">
                <thead>{renderTableHead()}</thead>
                <tbody>
                  {items.length === 0 && !rowsLoading ? (
                    <tr>
                      <td colSpan={10} className="admin-db-empty">
                        No rows.
                      </td>
                    </tr>
                  ) : null}
                  {items.map((row) => (
                    <tr key={row.id}>{renderCells(row)}</tr>
                  ))}
                </tbody>
              </table>
            </div>

            {editRow ? (
              <div className="admin-db-modal-overlay" role="presentation" onClick={() => !saving && setEditRow(null)}>
                <div
                  className="admin-db-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="admin-db-modal-title"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 id="admin-db-modal-title">Edit row #{editRow.id}</h2>
                  {resource === 'applications' ? (
                    <label className="admin-db-field">
                      Status
                      <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
                        <option value="pending">pending</option>
                        <option value="accepted">accepted</option>
                        <option value="rejected">rejected</option>
                      </select>
                    </label>
                  ) : null}
                  {resource === 'properties' ? (
                    <>
                      <label className="admin-db-field">
                        Name
                        <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                      </label>
                      <label className="admin-db-field">
                        Status
                        <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
                          {PROPERTY_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  ) : null}
                  {resource === 'universities' ? (
                    <>
                      <label className="admin-db-field">
                        Name
                        <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                      </label>
                      <label className="admin-db-field admin-db-check">
                        <input
                          type="checkbox"
                          checked={!!editForm.active}
                          onChange={(e) => setEditForm((f) => ({ ...f, active: e.target.checked }))}
                        />
                        Active
                      </label>
                      <label className="admin-db-field">
                        Latitude
                        <input
                          value={editForm.latitude}
                          onChange={(e) => setEditForm((f) => ({ ...f, latitude: e.target.value }))}
                          inputMode="decimal"
                        />
                      </label>
                      <label className="admin-db-field">
                        Longitude
                        <input
                          value={editForm.longitude}
                          onChange={(e) => setEditForm((f) => ({ ...f, longitude: e.target.value }))}
                          inputMode="decimal"
                        />
                      </label>
                    </>
                  ) : null}
                  <div className="admin-db-modal-actions">
                    <button type="button" className="signin-submit" disabled={saving} onClick={saveEdit}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" className="admin-db-btn" disabled={saving} onClick={() => setEditRow(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </DashboardShell>
  )
}
