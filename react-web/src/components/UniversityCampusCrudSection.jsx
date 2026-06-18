import { useCallback, useEffect, useMemo, useState } from 'react'
import UniversityAdminMap from './UniversityAdminMap'
import {
  createUniversity,
  deleteUniversity,
  fetchAdminUniversities,
  updateUniversity,
} from '../utils/universitiesApi'

const EMPTY_FORM = {
  code: '',
  name: '',
  city: '',
  state: '',
  postcode: '',
  active: true,
  sortOrder: '',
}

function formatCoord(value) {
  if (value === '' || value == null) return '—'
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(5) : '—'
}

export default function UniversityCampusCrudSection({ token }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [panelMode, setPanelMode] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [draftLat, setDraftLat] = useState('')
  const [draftLng, setDraftLng] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const selected = items.find((u) => u.id === selectedId) || null
  const isEditing = panelMode === 'edit' && selected
  const isCreating = panelMode === 'create'

  const pinnedCount = useMemo(() => items.filter((u) => u.pinned).length, [items])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const list = await fetchAdminUniversities(token)
      setItems(list)
    } catch (e) {
      setError(e.message || 'Unable to load universities.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) load()
  }, [token, load])

  function patchForm(patch) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  function startCreate() {
    setPanelMode('create')
    setSelectedId(null)
    setForm(EMPTY_FORM)
    setDraftLat('')
    setDraftLng('')
    setMessage('')
    setError('')
  }

  function startEdit(u) {
    setPanelMode('edit')
    setSelectedId(u.id)
    setForm({
      code: u.code || '',
      name: u.name || '',
      city: u.city || '',
      state: u.state || '',
      postcode: u.postcode || '',
      active: u.active !== false,
      sortOrder: u.sortOrder != null ? String(u.sortOrder) : '',
    })
    setDraftLat(u.latitude != null ? String(u.latitude) : '')
    setDraftLng(u.longitude != null ? String(u.longitude) : '')
    setMessage('')
    setError('')
  }

  function cancelPanel() {
    setPanelMode(null)
    setSelectedId(null)
    setForm(EMPTY_FORM)
    setDraftLat('')
    setDraftLng('')
  }

  function handlePinChange(lat, lng) {
    setDraftLat(String(lat))
    setDraftLng(String(lng))
  }

  function buildPayload() {
    const body = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      postcode: form.postcode.trim() || null,
      active: form.active,
      latitude: Number(draftLat),
      longitude: Number(draftLng),
    }
    if (form.sortOrder !== '') {
      body.sortOrder = Number(form.sortOrder)
    }
    return body
  }

  function validateForm() {
    if (!form.code.trim()) return 'University code is required (e.g. UMT).'
    if (!form.name.trim()) return 'University name is required.'
    if (!draftLat || !draftLng) return 'Click the map to place a pin before saving.'
    return ''
  }

  async function handleSave() {
    const validation = validateForm()
    if (validation) {
      setError(validation)
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const body = buildPayload()
      if (isCreating) {
        const created = await createUniversity(token, body)
        setItems((prev) => [...prev, created].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.code.localeCompare(b.code)))
        setMessage(`${created.name} created and pinned.`)
        startEdit(created)
      } else if (isEditing) {
        const updated = await updateUniversity(token, selected.id, body)
        setItems((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
        setMessage(`${updated.name} saved.`)
        startEdit(updated)
      }
    } catch (e) {
      setError(e.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selected || !token) return
    const ok = window.confirm(`Delete "${selected.name}" (${selected.code})? This cannot be undone.`)
    if (!ok) return
    setDeleting(true)
    setError('')
    setMessage('')
    try {
      await deleteUniversity(token, selected.id)
      setItems((prev) => prev.filter((u) => u.id !== selected.id))
      setMessage(`${selected.name} deleted.`)
      cancelPanel()
    } catch (e) {
      setError(e.message || 'Delete failed.')
    } finally {
      setDeleting(false)
    }
  }

  const showPanel = isCreating || isEditing

  return (
    <section className="admin-settings-crud" aria-labelledby="admin-uni-crud-heading">
      <div className="admin-settings-crud-head">
        <div className="admin-settings-crud-head-text">
          <h3 id="admin-uni-crud-heading">Directory &amp; editor</h3>
          <p>Create, update, and delete campuses. Use the map above to explore pins; use the map in the editor to place coordinates.</p>
        </div>
        <div className="admin-settings-crud-head-actions">
          {!loading ? (
            <span className="admin-settings-crud-pill">
              {pinnedCount}/{items.length} pinned
            </span>
          ) : null}
          <button type="button" className="admin-settings-crud-add-btn" onClick={startCreate} disabled={isCreating}>
            + Add university
          </button>
        </div>
      </div>

      {error ? (
        <div className="auth-toast auth-toast-error" role="alert">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="auth-toast auth-toast-success" role="status">
          {message}
        </div>
      ) : null}

      {loading ? <div className="auth-toast">Loading universities…</div> : null}

      {!loading ? (
        <div className="admin-uni-overview-block">
          <h3 className="admin-uni-overview-title">Campus map</h3>
          <p className="admin-uni-overview-lead">
            Every pinned university appears on this map. Pins are interactive — click one to open that row in the editor
            below.
          </p>
          <UniversityAdminMap
            mode="overview"
            universities={items}
            selectedId={panelMode === 'edit' ? selectedId : null}
            onCampusSelect={(u) => startEdit(u)}
          />
        </div>
      ) : null}

      {!loading ? (
        <div className={`admin-settings-crud-body${showPanel ? ' admin-settings-crud-body--panel-open' : ''}`}>
          <div className="admin-settings-crud-table-wrap">
            <table className="admin-settings-crud-table">
              <thead>
                <tr>
                  <th scope="col">Code</th>
                  <th scope="col">Name</th>
                  <th scope="col">Pin</th>
                  <th scope="col">Coordinates</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="admin-settings-crud-empty">
                      No universities yet. Click &quot;Add university&quot; to create one and pin it on the map.
                    </td>
                  </tr>
                ) : (
                  items.map((u) => (
                    <tr key={u.id} className={selectedId === u.id && isEditing ? 'admin-settings-crud-row--on' : ''}>
                      <td>
                        <span className="admin-settings-crud-code">{u.code}</span>
                      </td>
                      <td>{u.name}</td>
                      <td>
                        <span className={`admin-settings-crud-status${u.pinned ? ' admin-settings-crud-status--ok' : ''}`}>
                          {u.pinned ? 'Pinned' : 'Not pinned'}
                        </span>
                      </td>
                      <td className="admin-settings-crud-coords">
                        {u.pinned ? (
                          <>
                            {formatCoord(u.latitude)}, {formatCoord(u.longitude)}
                          </>
                        ) : (
                          <span className="admin-settings-crud-coords-muted">—</span>
                        )}
                      </td>
                      <td className="admin-settings-crud-actions-cell">
                        <button type="button" className="admin-settings-crud-action" onClick={() => startEdit(u)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="admin-settings-crud-action admin-settings-crud-action--danger"
                          onClick={async () => {
                            const ok = window.confirm(`Delete "${u.name}" (${u.code})?`)
                            if (!ok || !token) return
                            setError('')
                            try {
                              await deleteUniversity(token, u.id)
                              setItems((prev) => prev.filter((x) => x.id !== u.id))
                              if (selectedId === u.id) cancelPanel()
                              setMessage(`${u.name} deleted.`)
                            } catch (e) {
                              setError(e.message || 'Delete failed.')
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {showPanel ? (
            <aside className="admin-settings-crud-panel" aria-label={isCreating ? 'Add university' : 'Edit university'}>
              <div className="admin-settings-crud-panel-head">
                <h3>{isCreating ? 'Add university' : `Edit — ${selected?.name || form.name}`}</h3>
                <button type="button" className="admin-settings-crud-panel-close" onClick={cancelPanel} aria-label="Close">
                  ×
                </button>
              </div>

              <div className="admin-settings-crud-form">
                <div className="admin-settings-crud-form-row admin-settings-crud-form-row--2">
                  <label className="admin-settings-crud-field">
                    <span>Code</span>
                    <input
                      type="text"
                      value={form.code}
                      onChange={(e) => patchForm({ code: e.target.value.toUpperCase() })}
                      placeholder="UMT"
                      maxLength={32}
                      disabled={isEditing}
                      aria-readonly={isEditing}
                    />
                  </label>
                  <label className="admin-settings-crud-field">
                    <span>Sort order</span>
                    <input
                      type="number"
                      value={form.sortOrder}
                      onChange={(e) => patchForm({ sortOrder: e.target.value })}
                      placeholder="0"
                      min={0}
                    />
                  </label>
                </div>

                <label className="admin-settings-crud-field">
                  <span>University name</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => patchForm({ name: e.target.value })}
                    placeholder="Universiti Malaysia Terengganu"
                  />
                </label>

                <div className="admin-settings-crud-form-row admin-settings-crud-form-row--3">
                  <label className="admin-settings-crud-field">
                    <span>City</span>
                    <input type="text" value={form.city} onChange={(e) => patchForm({ city: e.target.value })} />
                  </label>
                  <label className="admin-settings-crud-field">
                    <span>State</span>
                    <input type="text" value={form.state} onChange={(e) => patchForm({ state: e.target.value })} />
                  </label>
                  <label className="admin-settings-crud-field">
                    <span>Postcode</span>
                    <input type="text" value={form.postcode} onChange={(e) => patchForm({ postcode: e.target.value })} />
                  </label>
                </div>

                <label className="admin-settings-crud-check">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => patchForm({ active: e.target.checked })}
                  />
                  Active (visible for distance calculations when pinned)
                </label>

                <div className="admin-settings-crud-map-block">
                  <div className="admin-settings-crud-map-label">
                    <strong>Map pin</strong>
                    <span>
                      {formatCoord(draftLat)}, {formatCoord(draftLng)}
                    </span>
                  </div>
                  <UniversityAdminMap
                    mode="edit"
                    universities={items.filter((u) => !isCreating || u.id !== selectedId)}
                    selectedId={isEditing ? selectedId : null}
                    latitude={draftLat}
                    longitude={draftLng}
                    onPinChange={handlePinChange}
                  />
                </div>

                <div className="admin-settings-crud-panel-actions">
                  <button type="button" className="signin-submit" disabled={saving} onClick={handleSave}>
                    {saving ? 'Saving…' : isCreating ? 'Create & pin' : 'Save changes'}
                  </button>
                  <button type="button" className="admin-settings-crud-cancel" onClick={cancelPanel} disabled={saving}>
                    Cancel
                  </button>
                  {isEditing ? (
                    <button
                      type="button"
                      className="admin-settings-crud-delete"
                      disabled={saving || deleting}
                      onClick={handleDelete}
                    >
                      {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                  ) : null}
                </div>
              </div>
            </aside>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
