import CampusMap from '../../components/admin/CampusMap'

const TABS = [
  { key: 'general', label: 'General' },
  { key: 'universities', label: 'Universities' },
  { key: 'campus-map', label: 'Campus Map' },
]

const inputClass =
  'mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#1A1A2E] outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20'

function formatCoord(value) {
  if (value === '' || value == null) return '—'
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(5) : '—'
}

function GeneralTab({ settings, saving, onChange, onSave }) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-[#1A1A2E]">Site settings</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-[#4B5563]">
            Site name
            <input
              className={inputClass}
              value={settings.siteName}
              onChange={(e) => onChange('siteName', e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-[#4B5563]">
            Default currency
            <select
              className={inputClass}
              value={settings.currency}
              onChange={(e) => onChange('currency', e.target.value)}
            >
              <option value="RM">RM</option>
              <option value="USD">USD</option>
              <option value="SGD">SGD</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-[#4B5563]">
            Max file upload
            <input
              className={inputClass}
              value={settings.maxFileUpload}
              onChange={(e) => onChange('maxFileUpload', e.target.value)}
              placeholder="8MB"
            />
          </label>
          <label className="block text-sm font-medium text-[#4B5563]">
            Max property images
            <input
              className={inputClass}
              type="number"
              min={1}
              max={50}
              value={settings.maxPropertyImages}
              onChange={(e) => onChange('maxPropertyImages', e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-[#1A1A2E]">System settings</h2>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[#1A1A2E]">Maintenance mode</p>
              <p className="text-xs text-[#6B7280]">When on, shows a platform maintenance banner (prototype).</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.maintenanceMode}
              onClick={() => onChange('maintenanceMode', !settings.maintenanceMode)}
              className={`relative h-7 w-12 rounded-full transition ${
                settings.maintenanceMode ? 'bg-[#DC2626]' : 'bg-[#D1D5DB]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                  settings.maintenanceMode ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
          <label className="block max-w-xs text-sm font-medium text-[#4B5563]">
            Default contract duration
            <select
              className={inputClass}
              value={settings.contractDurationMonths}
              onChange={(e) => onChange('contractDurationMonths', e.target.value)}
            >
              <option value="6">6 months</option>
              <option value="12">12 months</option>
              <option value="24">24 months</option>
            </select>
          </label>
        </div>
      </section>

      <button
        type="button"
        disabled={saving}
        onClick={onSave}
        className="rounded-lg bg-[#DC2626] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  )
}

function UniversityModal({
  mode,
  form,
  draftLat,
  draftLng,
  saving,
  onChange,
  onPinChange,
  onClose,
  onSave,
  mapUniversities,
  selectedId,
}) {
  if (!mode) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-[#E2E8F0] bg-white px-6 py-4">
          <h2 className="text-lg font-bold text-[#1A1A2E]">
            {mode === 'create' ? 'Add university' : `Edit ${form.name || 'university'}`}
          </h2>
          <button type="button" onClick={onClose} className="text-sm text-[#6B7280] hover:text-[#1A1A2E]">
            Close
          </button>
        </div>
        <form
          className="space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault()
            onSave()
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-[#4B5563]">
              Code
              <input
                className={inputClass}
                value={form.code}
                onChange={(e) => onChange('code', e.target.value.toUpperCase())}
                disabled={mode === 'edit'}
                required
              />
            </label>
            <label className="block text-sm font-medium text-[#4B5563]">
              Sort order
              <input
                className={inputClass}
                type="number"
                value={form.sortOrder}
                onChange={(e) => onChange('sortOrder', e.target.value)}
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-[#4B5563]">
            Name
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => onChange('name', e.target.value)}
              required
            />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block text-sm font-medium text-[#4B5563]">
              City
              <input className={inputClass} value={form.city} onChange={(e) => onChange('city', e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-[#4B5563]">
              State
              <input className={inputClass} value={form.state} onChange={(e) => onChange('state', e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-[#4B5563]">
              Postcode
              <input className={inputClass} value={form.postcode} onChange={(e) => onChange('postcode', e.target.value)} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-[#4B5563]">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => onChange('active', e.target.checked)}
            />
            Active campus
          </label>
          <div>
            <p className="text-sm font-medium text-[#4B5563]">
              Coordinates: {formatCoord(draftLat)}, {formatCoord(draftLng)}
            </p>
            <p className="mt-1 text-xs text-[#6B7280]">Click the map to place or move the pin.</p>
            <div className="mt-2 overflow-hidden rounded-lg border border-[#E2E8F0]">
              <CampusMap
                mode="single"
                universities={mapUniversities}
                selectedId={selectedId}
                latitude={draftLat}
                longitude={draftLng}
                onPinChange={onPinChange}
                height={280}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#DC2626] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-50"
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Create university' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminSettings({
  activeTab,
  onTabChange,
  settings,
  settingsSaving,
  onSettingsChange,
  onSaveSettings,
  universities,
  universitiesLoading,
  uniModalMode,
  uniForm,
  uniDraftLat,
  uniDraftLng,
  uniSelectedId = null,
  uniSaving,
  onUniFormChange,
  onUniPinChange,
  onUniModalClose,
  onUniSave,
  onUniAdd,
  onUniEdit,
  onUniDelete,
  onUniEditOnMap,
  mapSelectedId,
  mapSearchQuery = '',
  onMapSearchChange,
  onMapSelect,
  onMapSaveChanges,
  onMapDeleteSelected,
  onMapBlankClick,
  mapDraftName = '',
  onMapDraftNameChange,
  mapDraftLat,
  mapDraftLng,
  onMapPinChange,
  onMapDraftLatChange,
  onMapDraftLngChange,
  mapSaving,
}) {
  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
            <span aria-hidden="true">⚙️ </span>
            Settings
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">
            Configure system settings and manage university coordinates
          </p>
        </header>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Settings sections">
          {TABS.map((tab) => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(tab.key)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-[#DC2626] text-white'
                    : 'border border-[#E2E8F0] bg-white text-[#4B5563] hover:bg-[#FEF2F2]'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'general' ? (
          <GeneralTab
            settings={settings}
            saving={settingsSaving}
            onChange={onSettingsChange}
            onSave={onSaveSettings}
          />
        ) : null}

        {activeTab === 'universities' ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#6B7280]">
                {universitiesLoading
                  ? 'Loading universities…'
                  : `${universities.length} universities in directory`}
              </p>
              <button
                type="button"
                onClick={onUniAdd}
                className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C]"
              >
                Add University
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-[#E2E8F0] bg-[#FAFAFA] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Coordinates</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {universities.length === 0 && !universitiesLoading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-[#6B7280]">
                          No universities yet. Add one to pin it on the campus map.
                        </td>
                      </tr>
                    ) : null}
                    {universities.map((u) => (
                      <tr key={u.id} className="hover:bg-[#FAFAFA]">
                        <td className="px-4 py-3 font-semibold text-[#DC2626]">{u.code}</td>
                        <td className="px-4 py-3 text-[#1A1A2E]">{u.name}</td>
                        <td className="px-4 py-3 text-[#4B5563]">
                          {u.pinned ? `${formatCoord(u.latitude)}, ${formatCoord(u.longitude)}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => onUniEdit(u)}
                              className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-semibold text-[#4B5563] hover:bg-[#FAFAFA]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onUniEditOnMap(u)}
                              className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-semibold text-[#4B5563] hover:bg-[#FAFAFA]"
                            >
                              Map
                            </button>
                            <button
                              type="button"
                              onClick={() => onUniDelete(u)}
                              className="rounded-lg bg-[#DC2626] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#B91C1C]"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'campus-map' ? (
          <section className="space-y-6">
            <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
              <div className="border-b border-[#E2E8F0] px-5 py-4">
                <h2 className="text-lg font-bold text-[#1A1A2E]">
                  <span aria-hidden="true">📍 </span>
                  Campus Map
                </h2>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Click a pin to edit coordinates, or click the map to set a new pin.
                </p>
              </div>
              <CampusMap
                mode="overview"
                universities={universities}
                selectedId={mapSelectedId}
                latitude={mapDraftLat}
                longitude={mapDraftLng}
                searchQuery={mapSearchQuery}
                showSearch
                onSearchQueryChange={onMapSearchChange}
                onCampusSelect={onMapSelect}
                onPinChange={onMapPinChange}
                onBlankMapClick={onMapBlankClick}
                height={420}
              />
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-[#1A1A2E]">
                <span aria-hidden="true">📌 </span>
                Pin Editor
              </h3>
              <div className="mt-4 space-y-4 border-t border-[#E2E8F0] pt-4">
                {mapSelectedId ? (
                  <>
                    <label className="block text-sm font-medium text-[#4B5563]">
                      Campus
                      <select
                        className={inputClass}
                        value={mapSelectedId}
                        onChange={(e) => {
                          const campus = universities.find((u) => Number(u.id) === Number(e.target.value))
                          if (campus) onMapSelect?.(campus)
                        }}
                      >
                        {universities.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.code})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm font-medium text-[#4B5563]">
                      Campus name
                      <input
                        className={inputClass}
                        value={mapDraftName}
                        onChange={(e) => onMapDraftNameChange?.(e.target.value)}
                      />
                    </label>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-[#4B5563]">
                        Latitude
                        <input
                          className={inputClass}
                          type="text"
                          inputMode="decimal"
                          value={mapDraftLat}
                          onChange={(e) => onMapDraftLatChange?.(e.target.value)}
                        />
                      </label>
                      <label className="block text-sm font-medium text-[#4B5563]">
                        Longitude
                        <input
                          className={inputClass}
                          type="text"
                          inputMode="decimal"
                          value={mapDraftLng}
                          onChange={(e) => onMapDraftLngChange?.(e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={mapSaving || !mapDraftLat || !mapDraftLng}
                        onClick={onMapSaveChanges}
                        className="rounded-lg bg-[#DC2626] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-50"
                      >
                        {mapSaving ? 'Saving…' : 'Save changes'}
                      </button>
                      <button
                        type="button"
                        disabled={mapSaving}
                        onClick={onMapDeleteSelected}
                        className="rounded-lg border border-[#DC2626] bg-white px-5 py-2.5 text-sm font-semibold text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[#6B7280]">
                    Select a campus pin on the map, or choose one from the list below to edit its location.
                  </p>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] px-5 py-4">
                <h3 className="text-base font-bold text-[#1A1A2E]">
                  <span aria-hidden="true">📋 </span>
                  Universities
                </h3>
                <button
                  type="button"
                  onClick={onUniAdd}
                  className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C]"
                >
                  <span aria-hidden="true">➕ </span>
                  Add University
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-[#E2E8F0] bg-[#FAFAFA] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                    <tr>
                      <th className="px-5 py-3">Campus</th>
                      <th className="px-5 py-3">Coordinates</th>
                      <th className="px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {universities.length === 0 && !universitiesLoading ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-8 text-center text-[#6B7280]">
                          No universities yet. Add one to place it on the map.
                        </td>
                      </tr>
                    ) : null}
                    {universities.map((u) => (
                      <tr
                        key={u.id}
                        className={`hover:bg-[#FAFAFA] ${mapSelectedId === u.id ? 'bg-[#FEF2F2]' : ''}`}
                      >
                        <td className="px-5 py-3">
                          <p className="font-semibold text-[#DC2626]">{u.code}</p>
                          <p className="text-[#1A1A2E]">{u.name}</p>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-[#4B5563]">
                          {u.pinned || (u.latitude != null && u.longitude != null)
                            ? `${formatCoord(u.latitude)}, ${formatCoord(u.longitude)}`
                            : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => onMapSelect(u)}
                              className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-semibold text-[#4B5563] hover:bg-[#FAFAFA]"
                              title="Edit on map"
                            >
                              <span aria-hidden="true">✏️ </span>
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onUniDelete(u)}
                              className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1 text-xs font-semibold text-[#DC2626] hover:bg-[#FEE2E2]"
                              title="Delete"
                            >
                              <span aria-hidden="true">🗑️ </span>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <UniversityModal
        mode={uniModalMode}
        form={uniForm}
        draftLat={uniDraftLat}
        draftLng={uniDraftLng}
        saving={uniSaving}
        onChange={onUniFormChange}
        onPinChange={onUniPinChange}
        onClose={onUniModalClose}
        onSave={onUniSave}
        mapUniversities={universities.filter((u) => uniModalMode !== 'edit' || u.id !== uniSelectedId)}
        selectedId={uniSelectedId}
      />
    </div>
  )
}
