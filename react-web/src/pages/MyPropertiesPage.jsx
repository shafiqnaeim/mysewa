import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardShell from '../components/DashboardShell'
import { useToast } from '../context/ToastContext'
import PropertyFormModal, {
  MAX_PROPERTY_IMAGES,
  resolvePreferenceForSave,
  splitRaceForForm,
  splitReligionForForm,
} from '../components/PropertyFormModal'
import { useLandlordGuard } from '../hooks/useLandlordGuard'
import DeletePropertyConfirmModal from '../components/DeletePropertyConfirmModal'
import LandlordPropertyCard from '../components/LandlordPropertyCard'
import PropertyViewModal from '../components/PropertyViewModal'
import LandlordMyPropertiesFooter from '../components/LandlordMyPropertiesFooter'
import LandlordMyReportsSection from '../components/LandlordMyReportsSection'
import { resolvePropertyLocationByRoad } from '../utils/propertyLocation'
import { fetchNearbyFacilities } from '../utils/nearbyFacilities'

function formatApplicationWhen(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return String(iso)
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(iso)
  }
}

function applicationStatusClassName(status) {
  const s = String(status || 'pending').toLowerCase()
  const base = 'landlord-application-status'
  if (s === 'accepted') return `${base} landlord-application-status--accepted`
  if (s === 'rejected') return `${base} landlord-application-status--rejected`
  return `${base} landlord-application-status--pending`
}

const LANDLORD_DEPOSIT_MIN = 100
const LANDLORD_DEPOSIT_MAX = 5000

function formatDefaultDeposit(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return ''
  return Number(amount).toFixed(2)
}

function parseDepositMyr(str) {
  const n = Number(String(str ?? '').replace(/,/g, '').trim())
  if (!Number.isFinite(n)) return Number.NaN
  return Math.round(n * 100) / 100
}

const initialForm = {
  name: '',
  type: '',
  location: '',
  latitude: '',
  longitude: '',
  campus: '',
  distance: '',
  city: '',
  state: '',
  postcode: '',
  campusDistances: '',
  capacity: '',
  price: '',
  status: 'available',
  gender: '',
  religion: '',
  religionOther: '',
  race: '',
  raceOther: '',
  description: '',
  amenities: '',
  images: '',
}

export default function MyPropertiesPage() {
  const { user, loading: authLoading, error: authError } = useLandlordGuard()
  const { pushToast } = useToast()
  const openViewSeqRef = useRef(0)
  const [viewOpen, setViewOpen] = useState(null)
  const [viewOpening, setViewOpening] = useState(false)
  const [myReportsRefresh, setMyReportsRefresh] = useState(0)

  function discardViewSession() {
    openViewSeqRef.current += 1
    setViewOpen(null)
    setViewOpening(false)
    setMyReportsRefresh((n) => n + 1)
  }

  useEffect(() => {
    function onVis() {
      if (document.visibilityState !== 'visible') return
      setMyReportsRefresh((n) => n + 1)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const openPropertyView = useCallback(async (item) => {
    const seq = ++openViewSeqRef.current
    const lat = Number(item.latitude)
    const lng = Number(item.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setViewOpening(false)
      setViewOpen({ item })
      return
    }
    setViewOpening(true)
    try {
      const rows = await fetchNearbyFacilities(lat, lng)
      if (openViewSeqRef.current !== seq) return
      setViewOpen({ item, prefetchedNearbyPlaces: rows })
    } catch {
      if (openViewSeqRef.current !== seq) return
      setViewOpen({ item, prefetchedNearbyPlaces: [] })
    } finally {
      if (openViewSeqRef.current === seq) setViewOpening(false)
    }
  }, [])

  const [token, setToken] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [applications, setApplications] = useState([])
  const [applicationsLoading, setApplicationsLoading] = useState(false)
  const [applicationStatusSavingId, setApplicationStatusSavingId] = useState(null)
  const [applicantProfileApp, setApplicantProfileApp] = useState(null)
  const [landlordDecision, setLandlordDecision] = useState(null)
  const [markDepositSavingId, setMarkDepositSavingId] = useState(null)

  useEffect(() => {
    if (!applicantProfileApp) return
    function onKey(e) {
      if (e.key === 'Escape') setApplicantProfileApp(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [applicantProfileApp])

  useEffect(() => {
    if (!landlordDecision) return
    function onKey(e) {
      if (e.key === 'Escape' && applicationStatusSavingId == null) setLandlordDecision(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [landlordDecision, applicationStatusSavingId])

  useEffect(() => {
    if (!user?.id || !token) return
    let cancelled = false
    async function loadApplications() {
      setApplicationsLoading(true)
      try {
        const res = await fetch('/api/v1/applications/for-landlord', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.message || `Failed to load applications (HTTP ${res.status})`)
        if (!cancelled) setApplications(Array.isArray(data.items) ? data.items : [])
      } catch (e) {
        if (!cancelled) {
          setApplications([])
          pushToast({ message: e.message || 'Unable to load applications.', type: 'error' })
        }
      } finally {
        if (!cancelled) setApplicationsLoading(false)
      }
    }
    loadApplications()
    return () => {
      cancelled = true
    }
  }, [user?.id, token, pushToast])

  async function updateApplicationStatus(applicationId, status, depositAmount) {
    if (!token) return false
    setApplicationStatusSavingId(applicationId)
    try {
      const body =
        status === 'accepted' && depositAmount != null && Number.isFinite(Number(depositAmount))
          ? { status, depositAmount: Number(depositAmount) }
          : { status }
      const res = await fetch(`/api/v1/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      const raw = await res.text()
      let data = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {
        data = {}
      }
      if (!res.ok) {
        throw new Error(
          data.message || (raw && raw.length < 400 ? raw : null) || `Update failed (HTTP ${res.status})`
        )
      }
      const item = data.item
      if (item && item.id != null) {
        setApplications((prev) => prev.map((x) => (Number(x.id) === Number(item.id) ? { ...x, ...item } : x)))
      }
      pushToast({
        message:
          status === 'accepted'
            ? 'Application accepted. The student pays the deposit amount you set.'
            : 'Application rejected.',
        type: 'success',
      })
      return true
    } catch (e) {
      pushToast({ message: e.message || 'Could not update application status.', type: 'error' })
      return false
    } finally {
      setApplicationStatusSavingId(null)
    }
  }

  async function landlordMarkDepositPaid(applicationId) {
    if (!token) return
    setMarkDepositSavingId(applicationId)
    try {
      const res = await fetch(`/api/v1/applications/${applicationId}/deposit/landlord-mark-paid`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not update deposit (${res.status})`)
      const item = data.item
      if (item && item.id != null) {
        setApplications((prev) => prev.map((x) => (Number(x.id) === Number(item.id) ? { ...x, ...item } : x)))
      }
      pushToast({ message: 'Deposit marked as paid. The student will see this on their side.', type: 'success' })
    } catch (e) {
      pushToast({ message: e.message || 'Could not mark deposit paid.', type: 'error' })
    } finally {
      setMarkDepositSavingId(null)
    }
  }

  function proceedAcceptToConfirm() {
    if (!landlordDecision || landlordDecision.kind !== 'accept') return
    const amt = parseDepositMyr(landlordDecision.depositStr)
    if (Number.isNaN(amt) || amt < LANDLORD_DEPOSIT_MIN || amt > LANDLORD_DEPOSIT_MAX) {
      pushToast({
        message: `Enter a deposit between RM ${LANDLORD_DEPOSIT_MIN.toFixed(0)} and RM ${LANDLORD_DEPOSIT_MAX.toFixed(0)}.`,
        type: 'error',
      })
      return
    }
    setLandlordDecision((d) => (d && d.kind === 'accept' ? { ...d, step: 2, ack2: false } : d))
  }

  async function submitAcceptFinal() {
    if (!landlordDecision || landlordDecision.kind !== 'accept' || landlordDecision.step !== 2) return
    if (!landlordDecision.ack2) {
      pushToast({ message: 'Please confirm that you understand this decision is final.', type: 'info' })
      return
    }
    const amt = parseDepositMyr(landlordDecision.depositStr)
    if (Number.isNaN(amt) || amt < LANDLORD_DEPOSIT_MIN || amt > LANDLORD_DEPOSIT_MAX) return
    const ok = await updateApplicationStatus(landlordDecision.app.id, 'accepted', amt)
    if (ok) setLandlordDecision(null)
  }

  function proceedRejectToConfirm() {
    if (!landlordDecision || landlordDecision.kind !== 'reject') return
    if (!landlordDecision.ack1) {
      pushToast({ message: 'Please confirm you want to reject this applicant to continue.', type: 'info' })
      return
    }
    setLandlordDecision((d) => (d && d.kind === 'reject' ? { ...d, step: 2, ack2: false } : d))
  }

  async function submitRejectFinal() {
    if (!landlordDecision || landlordDecision.kind !== 'reject' || landlordDecision.step !== 2) return
    if (!landlordDecision.ack2) {
      pushToast({ message: 'Please tick the final confirmation to reject.', type: 'info' })
      return
    }
    const ok = await updateApplicationStatus(landlordDecision.app.id, 'rejected')
    if (ok) setLandlordDecision(null)
  }

  async function loadProperties(userId) {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch('/api/v1/properties')
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || `Failed to load properties (HTTP ${res.status})`)
      const all = Array.isArray(data.items) ? data.items : []
      const mine = all.filter((item) => Number(item.landlordId) === Number(userId))
      setItems(mine)
    } catch (e) {
      pushToast({ message: e.message || 'Unable to load properties.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const localToken = localStorage.getItem('mysewa_token')
    if (localToken) setToken(localToken)
  }, [])

  useEffect(() => {
    if (user?.id) loadProperties(user.id)
  }, [user?.id])

  function openAddForm() {
    setEditingId(null)
    setForm(initialForm)
    discardViewSession()
    setFormOpen(true)
  }

  function openEditForm(item) {
    setEditingId(item.id)
    setForm({
      name: item.name || '',
      type: item.type || '',
      location: item.location || '',
      latitude: item.latitude != null ? String(item.latitude) : '',
      longitude: item.longitude != null ? String(item.longitude) : '',
      campus: item.campus || '',
      distance: item.distance || '',
      city: item.city || '',
      state: item.state || '',
      postcode: item.postcode || '',
      campusDistances: item.campusDistances || '',
      capacity: item.capacity != null ? String(item.capacity) : '',
      price: item.price != null ? String(item.price) : '',
      status: item.status || 'available',
      gender: item.gender === 'mixed' ? '' : item.gender || '',
      religion: item.religion || '',
      race: item.race || '',
      description: item.description || '',
      amenities: item.amenities || '',
      images: item.images || '',
    })
    discardViewSession()
    setFormOpen(true)
  }

  function closeFormModal() {
    setFormOpen(false)
    setEditingId(null)
    setForm(initialForm)
  }

  async function saveProperty(event) {
    event.preventDefault()
    setSaving(true)
    try {
      if (!user) throw new Error('Please wait for your profile to load.')
      if (!form.name.trim() || !form.type.trim() || !form.location.trim()) {
        throw new Error('Name, type and mailing address are required.')
      }
      if (!form.latitude || !form.longitude) {
        throw new Error('Please drop a pin on the map for this property.')
      }
      if (!form.price || Number(form.price) <= 0) {
        throw new Error('Price must be greater than 0.')
      }
      if (form.capacity && Number(form.capacity) <= 0) {
        throw new Error('Capacity must be greater than 0.')
      }
      const photoList = parseFormImagesField(form.images)
      if (!photoList.length) {
        throw new Error('Please upload at least one cover photo.')
      }

      const resolved = await resolvePropertyLocationByRoad(form.latitude, form.longitude)
      const payload = {
        ...form,
        campus: resolved.campus,
        distance: resolved.distance,
        campusDistances: JSON.stringify(resolved.campusDistances),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        capacity: form.capacity ? Number(form.capacity) : null,
        price: form.price ? Number(form.price) : null,
        gender: form.gender || null,
        religion: resolvePreferenceForSave(form.religion, form.religionOther) || null,
        race: resolvePreferenceForSave(form.race, form.raceOther) || null,
      }
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId ? `/api/v1/properties/${editingId}` : '/api/v1/properties'
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const raw = await res.text()
      let data = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {
        data = {}
      }
      if (!res.ok) throw new Error(data.message || `Save failed (HTTP ${res.status})`)
      pushToast({
        message: `Property ${editingId ? 'updated' : 'created'} successfully.`,
        type: 'success',
      })
      closeFormModal()
      await loadProperties(user.id)
    } catch (e) {
      pushToast({ message: e.message || 'Unable to save property.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  function requestDelete(property) {
    setDeleteTarget({
      id: property.id,
      name: property.name || 'Untitled property',
    })
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (!user) throw new Error('Please wait for your profile to load.')
      const res = await fetch(`/api/v1/properties/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Delete failed (HTTP ${res.status})`)
      pushToast({ message: 'Property deleted.', type: 'success' })
      setDeleteTarget(null)
      discardViewSession()
      closeFormModal()
      await loadProperties(user.id)
    } catch (e) {
      pushToast({ message: e.message || 'Unable to delete property.', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const MAX_IMAGE_BYTES = 10 * 1024 * 1024

  function parseFormImagesField(imagesField) {
    if (!imagesField) return []
    const raw = String(imagesField).trim()
    if (!raw) return []
    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return [raw]
  }

  async function uploadImages(event) {
    const files = event.target.files
    if (!files || files.length === 0) return
    const existing = parseFormImagesField(form.images)
    const slotsLeft = MAX_PROPERTY_IMAGES - existing.length
    if (slotsLeft <= 0) {
      pushToast({
        message: `Maximum ${MAX_PROPERTY_IMAGES} photos allowed. Remove one to add another.`,
        type: 'error',
      })
      event.target.value = ''
      return
    }
    const toUpload = Array.from(files).slice(0, slotsLeft)
    setUploading(true)
    const uploaded = []
    try {
      if (!user) throw new Error('Please wait for your profile to load.')
      if (!token) throw new Error('Please sign in again to upload photos.')

      for (const file of toUpload) {
        if (!file.type.startsWith('image/')) {
          throw new Error(`"${file.name}" is not an image file.`)
        }
        if (file.size > MAX_IMAGE_BYTES) {
          throw new Error(`"${file.name}" is too large. Maximum size is 10 MB per image.`)
        }

        const formData = new FormData()
        formData.append('images', file)

        let res
        try {
          res = await fetch('/api/v1/properties/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          })
        } catch {
          throw new Error(
            'Could not reach the server. Ensure Spring API is running on port 8090, then try again.',
          )
        }

        const raw = await res.text()
        let data = {}
        try {
          data = raw ? JSON.parse(raw) : {}
        } catch {
          data = {}
        }
        if (!res.ok) {
          throw new Error(data.message || `Upload failed for "${file.name}" (HTTP ${res.status})`)
        }
        if (Array.isArray(data.files) && data.files.length) {
          uploaded.push(...data.files)
        }
      }

      const next = [...existing, ...uploaded].slice(0, MAX_PROPERTY_IMAGES)
      setForm((prev) => ({ ...prev, images: JSON.stringify(next) }))
      pushToast({
        message: uploaded.length === 1 ? 'Image uploaded.' : `${uploaded.length} images uploaded.`,
        type: 'success',
      })
    } catch (e) {
      if (uploaded.length) {
        const partial = [...existing, ...uploaded].slice(0, MAX_PROPERTY_IMAGES)
        setForm((prev) => ({ ...prev, images: JSON.stringify(partial) }))
      }
      pushToast({ message: e.message || 'Unable to upload images.', type: 'error' })
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  useEffect(() => {
    if (authError) pushToast({ message: authError, type: 'error', duration: 7000 })
  }, [authError, pushToast])

  const pageReady = !authLoading && user

  return (
    <DashboardShell properties blend>
      {viewOpening ? (
        <div className="pv-preopen-backdrop" role="status" aria-busy="true" aria-live="polite">
          <div className="pv-preopen-panel">
            <span className="pv-preopen-spinner" aria-hidden="true" />
            <span className="pv-preopen-text">Loading listing…</span>
          </div>
        </div>
      ) : null}

      <div className="my-properties-page-with-footer">
      <article className="my-properties-page">
        <header className="my-property-page-header" aria-labelledby="my-property-title">
          <div className="my-property-page-header-main">
            <h1 id="my-property-title" className="my-property-page-title">
              myProperty
            </h1>
            <p className="my-property-page-lead">Create and manage your rental listings.</p>
          </div>
          <div className="my-property-page-header-actions">
            <button type="button" className="my-property-page-cta" onClick={openAddForm}>
              Add New Property
            </button>
          </div>
        </header>

        <section className="my-property-list-section" aria-labelledby="my-property-list-heading">
          <div className="my-property-list-head">
            <h2 id="my-property-list-heading" className="my-property-list-title">
              Own Properties
            </h2>
            {pageReady && !loading ? (
              <span className="my-property-list-count">
                {items.length} propert{items.length === 1 ? 'y' : 'ies'}
              </span>
            ) : null}
          </div>

          {authLoading || loading ? <p className="my-property-loading">Loading your properties…</p> : null}

          {pageReady && !loading && !items.length ? (
            <div className="student-dash-card student-rental-empty my-property-empty-state">
              <p>You have not added any properties yet.</p>
              <p className="student-dash-muted">Use Add New Property to create your first listing.</p>
            </div>
          ) : null}

          {pageReady && !loading && items.length ? (
            <div className="landlord-property-grid">
              {items.map((item) => (
                <LandlordPropertyCard
                  key={item.id}
                  item={item}
                  onEdit={openEditForm}
                  onView={openPropertyView}
                  onDelete={requestDelete}
                />
              ))}
            </div>
          ) : null}
        </section>

        {pageReady ? (
          <>
            <section className="my-property-list-section landlord-applications-section" aria-labelledby="landlord-apps-heading">
            <div className="landlord-applications-head">
              <h2 id="landlord-apps-heading" className="landlord-applications-title">
                Rental applications
              </h2>
            </div>
            <p className="landlord-applications-lead">
              Applications students submit from the public Home page for your listings.
            </p>
            {applicationsLoading ? <p className="my-property-loading">Loading applications…</p> : null}
            {!applicationsLoading && applications.length === 0 ? (
              <div className="student-dash-card student-rental-empty my-property-empty-state">
                <p>No rental applications yet.</p>
                <p className="student-dash-muted">When students apply from Home, they will appear here.</p>
              </div>
            ) : null}
            {!applicationsLoading && applications.length > 0 ? (
              <div className="landlord-application-list">
                {applications.map((a) => (
                  <article key={a.id} className="landlord-application-card">
                    <div className="landlord-application-card-top">
                      <div>
                        <p className="landlord-application-prop">{a.propertyName || `Property #${a.propertyId}`}</p>
                        <p className="landlord-application-meta">{formatApplicationWhen(a.createdAt)}</p>
                      </div>
                      <span className={applicationStatusClassName(a.status)}>{a.status || 'pending'}</span>
                    </div>
                    <dl className="landlord-application-grid">
                      <div className="landlord-application-applicant-block">
                        <dt>Applicant</dt>
                        <dd className="landlord-application-applicant-dd">
                          <span className="landlord-application-applicant-name">
                            {a.student?.fullName?.trim() || 'Student'}
                          </span>
                          <button
                            type="button"
                            className="landlord-application-profile-btn"
                            onClick={() => setApplicantProfileApp(a)}
                          >
                            View profile
                          </button>
                        </dd>
                      </div>
                      <div className="landlord-application-dates-row" role="group" aria-label="Move dates and duration">
                        <div className="landlord-application-dates-item">
                          <span className="landlord-application-dates-label">Move In</span>
                          <span className="landlord-application-dates-value">{a.preferredMoveIn || '—'}</span>
                        </div>
                        <div className="landlord-application-dates-item">
                          <span className="landlord-application-dates-label">Move Out</span>
                          <span className="landlord-application-dates-value">
                            {a.leaseEnd || a.leaseEndDate || a.lease_end || '—'}
                          </span>
                        </div>
                        <div className="landlord-application-dates-item">
                          <span className="landlord-application-dates-label">Duration</span>
                          <span className="landlord-application-dates-value">
                            {a.leaseDays != null && a.leaseMonths != null
                              ? `${a.leaseDays} day${a.leaseDays === 1 ? '' : 's'} / ${a.leaseMonths} month${
                                  a.leaseMonths === 1 ? '' : 's'
                                }`
                              : a.leaseMonths != null
                                ? `${a.leaseMonths} months`
                                : '—'}
                          </span>
                        </div>
                      </div>
                      {String(a.status || '').toLowerCase() === 'accepted' && a.depositAmountSuggested != null ? (
                        <div>
                          <dt>Required deposit</dt>
                          <dd>
                            RM{' '}
                            {Number.isFinite(Number(a.depositAmountSuggested))
                              ? Number(a.depositAmountSuggested).toFixed(2)
                              : String(a.depositAmountSuggested)}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                    {String(a.status || '').toLowerCase() === 'pending' ? (
                      <div className="landlord-application-actions">
                        <button
                          type="button"
                          className="landlord-application-status-btn landlord-application-status-btn--accept"
                          disabled={applicationStatusSavingId === a.id}
                          onClick={() =>
                            setLandlordDecision({
                              kind: 'accept',
                              app: a,
                              step: 1,
                              depositStr: formatDefaultDeposit(a.depositAmountSuggested),
                              ack1: false,
                              ack2: false,
                            })
                          }
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="landlord-application-status-btn landlord-application-status-btn--ghost"
                          disabled={applicationStatusSavingId === a.id}
                          onClick={() =>
                            setLandlordDecision({
                              kind: 'reject',
                              app: a,
                              step: 1,
                              depositStr: '',
                              ack1: false,
                              ack2: false,
                            })
                          }
                        >
                          Reject
                        </button>
                      </div>
                    ) : null}
                    {String(a.status || '').toLowerCase() === 'accepted' ? (
                      <div className="landlord-application-actions landlord-application-postaccept">
                        <div className="landlord-application-postaccept-main">
                          <span
                            className={
                              a.depositPaid
                                ? 'landlord-application-deposit-status landlord-application-deposit-status--paid'
                                : 'landlord-application-deposit-status landlord-application-deposit-status--pending'
                            }
                          >
                            Deposit Status: {a.depositPaid ? 'Paid' : 'Pending'}
                          </span>
                          {!a.depositPaid ? (
                            <button
                              type="button"
                              className="landlord-application-status-btn landlord-application-status-btn--accept"
                              disabled={markDepositSavingId === a.id}
                              onClick={() => landlordMarkDepositPaid(a.id)}
                            >
                              {markDepositSavingId === a.id ? 'Saving…' : 'Mark as Paid'}
                            </button>
                          ) : null}
                        </div>
                        <Link className="landlord-application-rent-calendar-link" to={`/my-properties/rent/${a.id}`}>
                          Monthly Rent Tracker
                        </Link>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : null}
            </section>

            <section className="my-property-list-section landlord-myreports-section" aria-labelledby="landlord-myreports-heading">
              <div className="landlord-applications-head">
                <h2 id="landlord-myreports-heading" className="landlord-applications-title">
                  myReports
                </h2>
              </div>
              <p className="landlord-applications-lead">
                Maintenance and tenancy notes from accepted tenants (from their <strong>myProperty</strong> hub), with
                optional photos.
              </p>
              <LandlordMyReportsSection token={token} properties={items} refreshKey={myReportsRefresh} />
            </section>
          </>
        ) : null}

        {formOpen ? (
          <PropertyFormModal
            editingId={editingId}
            form={form}
            setForm={setForm}
            saving={saving}
            uploading={uploading}
            onClose={closeFormModal}
            onSubmit={saveProperty}
            onUpload={uploadImages}
          />
        ) : null}

        {viewOpen ? (
          <PropertyViewModal
            key={viewOpen.item.id}
            item={viewOpen.item}
            prefetchedNearbyPlaces={viewOpen.prefetchedNearbyPlaces}
            onClose={discardViewSession}
            onEdit={openEditForm}
          />
        ) : null}

        {deleteTarget ? (
          <DeletePropertyConfirmModal
            propertyName={deleteTarget.name}
            deleting={deleting}
            onCancel={() => !deleting && setDeleteTarget(null)}
            onConfirm={confirmDelete}
          />
        ) : null}

        {landlordDecision ? (
          <div className="landlord-decision-backdrop" role="presentation">
            <div
              className="landlord-decision-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="landlord-decision-title"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="landlord-decision-close"
                aria-label="Close"
                disabled={applicationStatusSavingId != null}
                onClick={() => setLandlordDecision(null)}
              >
                ×
              </button>
              {landlordDecision.kind === 'accept' ? (
                landlordDecision.step === 1 ? (
                  <>
                    <h2 id="landlord-decision-title" className="landlord-decision-title">
                      Accept application
                    </h2>
                    <p className="landlord-decision-lead">
                      {landlordDecision.app.student?.fullName?.trim() || 'Applicant'} ·{' '}
                      {landlordDecision.app.propertyName || `Property #${landlordDecision.app.propertyId}`}
                    </p>
                    <label className="landlord-decision-label" htmlFor="landlord-deposit-amt">
                      Deposit amount (MYR)
                    </label>
                    <input
                      id="landlord-deposit-amt"
                      className="landlord-decision-input"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={landlordDecision.depositStr}
                      onChange={(e) =>
                        setLandlordDecision((d) => (d ? { ...d, depositStr: e.target.value } : d))
                      }
                      placeholder="e.g. 250.00"
                      disabled={applicationStatusSavingId === landlordDecision.app.id}
                    />
                    <p className="landlord-decision-hint">
                      Enter RM {LANDLORD_DEPOSIT_MIN}–{LANDLORD_DEPOSIT_MAX}. The student pays this amount when they
                      complete deposit in MySewa.
                    </p>
                    <div className="landlord-decision-actions">
                      <button
                        type="button"
                        className="landlord-application-status-btn landlord-application-status-btn--ghost"
                        disabled={applicationStatusSavingId === landlordDecision.app.id}
                        onClick={() => setLandlordDecision(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="landlord-application-status-btn landlord-application-status-btn--accept"
                        disabled={applicationStatusSavingId === landlordDecision.app.id}
                        onClick={proceedAcceptToConfirm}
                      >
                        Continue
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="landlord-decision-title">Confirm acceptance</h2>
                    <p className="landlord-decision-lead">Review once more before you confirm.</p>
                    <ul className="landlord-decision-summary">
                      <li>
                        <strong>Applicant:</strong> {landlordDecision.app.student?.fullName || '—'}
                      </li>
                      <li>
                        <strong>Listing:</strong>{' '}
                        {landlordDecision.app.propertyName || `Property #${landlordDecision.app.propertyId}`}
                      </li>
                      <li>
                        <strong>Deposit (MYR):</strong>{' '}
                        {(() => {
                          const v = parseDepositMyr(landlordDecision.depositStr)
                          return Number.isFinite(v) ? v.toFixed(2) : '—'
                        })()}
                      </li>
                    </ul>
                    <label className="landlord-decision-check">
                      <input
                        type="checkbox"
                        checked={landlordDecision.ack2}
                        onChange={(e) =>
                          setLandlordDecision((d) => (d ? { ...d, ack2: e.target.checked } : d))
                        }
                        disabled={applicationStatusSavingId === landlordDecision.app.id}
                      />
                      <span>I understand this decision is final and cannot be undone.</span>
                    </label>
                    <div className="landlord-decision-actions">
                      <button
                        type="button"
                        className="landlord-application-status-btn landlord-application-status-btn--ghost"
                        disabled={applicationStatusSavingId === landlordDecision.app.id}
                        onClick={() => setLandlordDecision((d) => (d && d.kind === 'accept' ? { ...d, step: 1 } : d))}
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        className="landlord-application-status-btn landlord-application-status-btn--accept"
                        disabled={applicationStatusSavingId === landlordDecision.app.id}
                        onClick={submitAcceptFinal}
                      >
                        {applicationStatusSavingId === landlordDecision.app.id ? 'Saving…' : 'Confirm acceptance'}
                      </button>
                    </div>
                  </>
                )
              ) : landlordDecision.step === 1 ? (
                <>
                  <h2 className="landlord-decision-title">Reject application?</h2>
                  <p className="landlord-decision-lead">
                    You are about to reject{' '}
                    <strong>{landlordDecision.app.student?.fullName?.trim() || 'this applicant'}</strong> for{' '}
                    <strong>
                      {landlordDecision.app.propertyName || `Property #${landlordDecision.app.propertyId}`}
                    </strong>
                    . Continue only if you are sure.
                  </p>
                  <label className="landlord-decision-check">
                    <input
                      type="checkbox"
                      checked={landlordDecision.ack1}
                      onChange={(e) =>
                        setLandlordDecision((d) => (d ? { ...d, ack1: e.target.checked } : d))
                      }
                      disabled={applicationStatusSavingId === landlordDecision.app.id}
                    />
                    <span>I want to reject this application.</span>
                  </label>
                  <div className="landlord-decision-actions">
                    <button
                      type="button"
                      className="landlord-application-status-btn landlord-application-status-btn--ghost"
                      disabled={applicationStatusSavingId === landlordDecision.app.id}
                      onClick={() => setLandlordDecision(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="landlord-application-status-btn"
                      disabled={applicationStatusSavingId === landlordDecision.app.id}
                      onClick={proceedRejectToConfirm}
                    >
                      Continue
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="landlord-decision-title">Final confirmation</h2>
                  <p className="landlord-decision-lead">
                    Reject <strong>{landlordDecision.app.student?.fullName?.trim() || 'this applicant'}</strong> for{' '}
                    <strong>
                      {landlordDecision.app.propertyName || `Property #${landlordDecision.app.propertyId}`}
                    </strong>
                    ?
                  </p>
                  <label className="landlord-decision-check">
                    <input
                      type="checkbox"
                      checked={landlordDecision.ack2}
                      onChange={(e) =>
                        setLandlordDecision((d) => (d ? { ...d, ack2: e.target.checked } : d))
                      }
                      disabled={applicationStatusSavingId === landlordDecision.app.id}
                    />
                    <span>I understand this cannot be undone.</span>
                  </label>
                  <div className="landlord-decision-actions">
                    <button
                      type="button"
                      className="landlord-application-status-btn landlord-application-status-btn--ghost"
                      disabled={applicationStatusSavingId === landlordDecision.app.id}
                      onClick={() => setLandlordDecision((d) => (d && d.kind === 'reject' ? { ...d, step: 1 } : d))}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="landlord-application-status-btn"
                      disabled={applicationStatusSavingId === landlordDecision.app.id}
                      onClick={submitRejectFinal}
                    >
                      {applicationStatusSavingId === landlordDecision.app.id ? 'Saving…' : 'Confirm reject'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}

        {applicantProfileApp ? (
          <div
            className="landlord-applicant-profile-backdrop"
            role="presentation"
            onClick={() => setApplicantProfileApp(null)}
          >
            <div
              className="landlord-applicant-profile-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="landlord-applicant-profile-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="landlord-applicant-profile-dialog-head">
                <h2 id="landlord-applicant-profile-title" className="landlord-applicant-profile-title">
                  {applicantProfileApp.student?.fullName?.trim() || 'Applicant'}
                </h2>
                <button
                  type="button"
                  className="landlord-applicant-profile-close"
                  aria-label="Close profile"
                  onClick={() => setApplicantProfileApp(null)}
                >
                  ×
                </button>
              </div>
              <p className="landlord-applicant-profile-lead">
                {applicantProfileApp.propertyName || `Property #${applicantProfileApp.propertyId}`}
                <span className="landlord-applicant-profile-lead-sep" aria-hidden="true">
                  {' '}
                  ·{' '}
                </span>
                Applied {formatApplicationWhen(applicantProfileApp.createdAt)}
              </p>
              <dl className="landlord-applicant-profile-dl">
                <div>
                  <dt>Email</dt>
                  <dd>{applicantProfileApp.student?.email || '—'}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{applicantProfileApp.student?.phoneNumber || '—'}</dd>
                </div>
                <div>
                  <dt>IC</dt>
                  <dd>{applicantProfileApp.student?.icNumber || '—'}</dd>
                </div>
                <div>
                  <dt>University</dt>
                  <dd>{applicantProfileApp.student?.university || '—'}</dd>
                </div>
                <div>
                  <dt>Race / religion</dt>
                  <dd>
                    {[applicantProfileApp.student?.race, applicantProfileApp.student?.religion]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </dd>
                </div>
              </dl>
              <div className="landlord-applicant-profile-actions">
                <button
                  type="button"
                  className="landlord-application-status-btn"
                  onClick={() => setApplicantProfileApp(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </article>

        <LandlordMyPropertiesFooter />
      </div>
    </DashboardShell>
  )
}
