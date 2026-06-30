import { useCallback, useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { useAdminGuard } from '../hooks/useAdminGuard'
import { useToast } from '../context/ToastContext'
import {
  readAdminSystemSettings,
  writeAdminSystemSettings,
} from '../utils/adminSystemSettings'
import {
  createUniversity,
  deleteUniversity,
  fetchAdminUniversities,
  updateUniversity,
} from '../utils/universitiesApi'
import AdminSettings from './dashboard/AdminSettings'

const EMPTY_UNI_FORM = {
  code: '',
  name: '',
  city: '',
  state: '',
  postcode: '',
  active: true,
  sortOrder: '',
}

export default function AdminMySettingsPage() {
  const { loading, error, token } = useAdminGuard()
  const { pushToast } = useToast()

  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState(() => readAdminSystemSettings())
  const [settingsSaving, setSettingsSaving] = useState(false)

  const [universities, setUniversities] = useState([])
  const [universitiesLoading, setUniversitiesLoading] = useState(false)
  const [uniModalMode, setUniModalMode] = useState(null)
  const [uniForm, setUniForm] = useState(EMPTY_UNI_FORM)
  const [uniDraftLat, setUniDraftLat] = useState('')
  const [uniDraftLng, setUniDraftLng] = useState('')
  const [uniSelectedId, setUniSelectedId] = useState(null)
  const [uniSaving, setUniSaving] = useState(false)

  const [mapSelectedId, setMapSelectedId] = useState(null)
  const [mapDraftLat, setMapDraftLat] = useState('')
  const [mapDraftLng, setMapDraftLng] = useState('')
  const [mapDraftName, setMapDraftName] = useState('')
  const [mapSearchQuery, setMapSearchQuery] = useState('')
  const [mapSaving, setMapSaving] = useState(false)

  const loadUniversities = useCallback(async () => {
    if (!token) return
    setUniversitiesLoading(true)
    try {
      const list = await fetchAdminUniversities(token)
      setUniversities(list)
    } catch (e) {
      setUniversities([])
      pushToast({ message: e.message || 'Unable to load universities.', type: 'error' })
    } finally {
      setUniversitiesLoading(false)
    }
  }, [token, pushToast])

  useEffect(() => {
    if (token) void loadUniversities()
  }, [token, loadUniversities])

  function handleSettingsChange(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSaveSettings() {
    setSettingsSaving(true)
    try {
      writeAdminSystemSettings(settings)
      pushToast({ message: 'Settings saved.', type: 'success' })
    } catch (e) {
      pushToast({ message: e.message || 'Could not save settings.', type: 'error' })
    } finally {
      setSettingsSaving(false)
    }
  }

  function openUniCreate() {
    setUniModalMode('create')
    setUniSelectedId(null)
    setUniForm(EMPTY_UNI_FORM)
    setUniDraftLat('')
    setUniDraftLng('')
  }

  function openUniEdit(u) {
    setUniModalMode('edit')
    setUniSelectedId(u.id)
    setUniForm({
      code: u.code || '',
      name: u.name || '',
      city: u.city || '',
      state: u.state || '',
      postcode: u.postcode || '',
      active: u.active !== false,
      sortOrder: u.sortOrder != null ? String(u.sortOrder) : '',
    })
    setUniDraftLat(u.latitude != null ? String(u.latitude) : '')
    setUniDraftLng(u.longitude != null ? String(u.longitude) : '')
  }

  function closeUniModal() {
    if (uniSaving) return
    setUniModalMode(null)
    setUniSelectedId(null)
    setUniForm(EMPTY_UNI_FORM)
    setUniDraftLat('')
    setUniDraftLng('')
  }

  function buildUniPayload() {
    const body = {
      code: uniForm.code.trim().toUpperCase(),
      name: uniForm.name.trim(),
      city: uniForm.city.trim() || null,
      state: uniForm.state.trim() || null,
      postcode: uniForm.postcode.trim() || null,
      active: uniForm.active,
      latitude: Number(uniDraftLat),
      longitude: Number(uniDraftLng),
    }
    if (uniForm.sortOrder !== '') {
      body.sortOrder = Number(uniForm.sortOrder)
    }
    return body
  }

  async function handleUniSave() {
    if (!token) return
    if (!uniForm.code.trim() || !uniForm.name.trim()) {
      pushToast({ message: 'Code and name are required.', type: 'error' })
      return
    }
    if (!uniDraftLat || !uniDraftLng) {
      pushToast({ message: 'Place a pin on the map before saving.', type: 'error' })
      return
    }
    setUniSaving(true)
    try {
      const body = buildUniPayload()
      if (uniModalMode === 'create') {
        await createUniversity(token, body)
        pushToast({ message: 'University created.', type: 'success' })
      } else if (uniSelectedId) {
        await updateUniversity(token, uniSelectedId, body)
        pushToast({ message: 'University updated.', type: 'success' })
      }
      closeUniModal()
      await loadUniversities()
    } catch (e) {
      pushToast({ message: e.message || 'Save failed.', type: 'error' })
    } finally {
      setUniSaving(false)
    }
  }

  async function handleUniDelete(u) {
    if (!token) return
    if (!window.confirm(`Delete "${u.name}" (${u.code})?`)) return
    try {
      await deleteUniversity(token, u.id)
      if (mapSelectedId === u.id) {
        setMapSelectedId(null)
        setMapDraftLat('')
        setMapDraftLng('')
        setMapDraftName('')
      }
      pushToast({ message: 'University deleted.', type: 'success' })
      await loadUniversities()
    } catch (e) {
      pushToast({ message: e.message || 'Delete failed.', type: 'error' })
    }
  }

  function handleUniEditOnMap(u) {
    setActiveTab('campus-map')
    handleMapSelect(u)
  }

  function handleMapSelect(u) {
    setMapSelectedId(u.id)
    setMapDraftLat(u.latitude != null ? String(u.latitude) : '')
    setMapDraftLng(u.longitude != null ? String(u.longitude) : '')
    setMapDraftName(u.name || '')
  }

  function handleMapBlankClick(lat, lng) {
    openUniCreate()
    setUniDraftLat(String(lat))
    setUniDraftLng(String(lng))
    pushToast({ message: 'New university form opened — complete details and save.', type: 'info' })
  }

  async function handleMapSaveChanges() {
    if (!token || !mapSelectedId) return
    const campus = universities.find((u) => u.id === mapSelectedId)
    if (!campus) return
    if (!mapDraftName.trim()) {
      pushToast({ message: 'Campus name is required.', type: 'error' })
      return
    }
    if (!mapDraftLat || !mapDraftLng) {
      pushToast({ message: 'Set coordinates on the map first.', type: 'error' })
      return
    }
    setMapSaving(true)
    try {
      await updateUniversity(token, mapSelectedId, {
        code: campus.code,
        name: mapDraftName.trim(),
        city: campus.city || null,
        state: campus.state || null,
        postcode: campus.postcode || null,
        active: campus.active !== false,
        sortOrder: campus.sortOrder,
        latitude: Number(mapDraftLat),
        longitude: Number(mapDraftLng),
      })
      pushToast({ message: 'Campus saved.', type: 'success' })
      await loadUniversities()
    } catch (e) {
      pushToast({ message: e.message || 'Could not save campus.', type: 'error' })
    } finally {
      setMapSaving(false)
    }
  }

  function handleMapDeleteSelected() {
    const campus = universities.find((u) => u.id === mapSelectedId)
    if (campus) void handleUniDelete(campus)
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
      <AdminSettings
        activeTab={activeTab}
        onTabChange={setActiveTab}
        settings={settings}
        settingsSaving={settingsSaving}
        onSettingsChange={handleSettingsChange}
        onSaveSettings={handleSaveSettings}
        universities={universities}
        universitiesLoading={universitiesLoading}
        uniModalMode={uniModalMode}
        uniForm={uniForm}
        uniDraftLat={uniDraftLat}
        uniDraftLng={uniDraftLng}
        uniSelectedId={uniSelectedId}
        uniSaving={uniSaving}
        onUniFormChange={(key, value) => setUniForm((prev) => ({ ...prev, [key]: value }))}
        onUniPinChange={(lat, lng) => {
          setUniDraftLat(String(lat))
          setUniDraftLng(String(lng))
        }}
        onUniModalClose={closeUniModal}
        onUniSave={handleUniSave}
        onUniAdd={openUniCreate}
        onUniEdit={openUniEdit}
        onUniDelete={handleUniDelete}
        onUniEditOnMap={handleUniEditOnMap}
        mapSelectedId={mapSelectedId}
        mapSearchQuery={mapSearchQuery}
        onMapSearchChange={setMapSearchQuery}
        onMapSelect={handleMapSelect}
        onMapSaveChanges={handleMapSaveChanges}
        onMapDeleteSelected={handleMapDeleteSelected}
        onMapBlankClick={handleMapBlankClick}
        mapDraftName={mapDraftName}
        onMapDraftNameChange={setMapDraftName}
        mapDraftLat={mapDraftLat}
        mapDraftLng={mapDraftLng}
        onMapPinChange={(lat, lng) => {
          setMapDraftLat(String(lat))
          setMapDraftLng(String(lng))
        }}
        onMapDraftLatChange={setMapDraftLat}
        onMapDraftLngChange={setMapDraftLng}
        mapSaving={mapSaving}
      />
    </AdminLayout>
  )
}
