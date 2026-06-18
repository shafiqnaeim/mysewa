import { useCallback, useEffect, useRef, useState } from 'react'
import AmenityIcon from './AmenityIcon'
import PropertyLocationMap from './PropertyLocationMap'
import {
  AMENITY_CATALOG,
  isAmenityChecked,
  toggleAmenityValue,
} from '../utils/amenities'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { geocodeMailingAddress, getCampusList } from '../utils/propertyLocation'

export const MAX_PROPERTY_IMAGES = 7

const PROPERTY_TYPES = [
  { value: 'House', label: 'House' },
  { value: 'Room', label: 'Room' },
]

const GENDER_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

const LISTING_STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'rented', label: 'Rented' },
  { value: 'maintenance', label: 'Maintenance' },
]

const RELIGION_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'islam', label: 'Islam' },
  { value: 'buddhism', label: 'Buddhism' },
  { value: 'hinduism', label: 'Hinduism' },
  { value: 'christianity', label: 'Christianity' },
  { value: 'others', label: 'Others' },
]

const RACE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'malay', label: 'Malay' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'indian', label: 'Indian' },
  { value: 'others', label: 'Others' },
]

const RELIGION_KNOWN = new Set(['', 'islam', 'buddhism', 'hinduism', 'christianity', 'others'])
const RACE_KNOWN = new Set(['', 'malay', 'chinese', 'indian', 'others'])

export function splitPreferenceForForm(stored, knownSet) {
  const v = String(stored || '').trim()
  if (!v) return { select: '', other: '' }
  const lower = v.toLowerCase()
  if (knownSet.has(lower)) return { select: lower, other: '' }
  return { select: 'others', other: v }
}

export function resolvePreferenceForSave(selectValue, otherValue) {
  if (selectValue === 'others') {
    const custom = String(otherValue || '').trim()
    return custom || 'others'
  }
  return selectValue || ''
}

export function splitReligionForForm(stored) {
  return splitPreferenceForForm(stored, RELIGION_KNOWN)
}

export function splitRaceForForm(stored) {
  return splitPreferenceForForm(stored, RACE_KNOWN)
}

const FORM_STEPS = [
  { label: 'Property & location' },
  { label: 'Details & pricing' },
  { label: 'Photos' },
]

function parsePropertyImages(imagesField) {
  if (!imagesField) return []
  if (Array.isArray(imagesField)) return imagesField
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

function validateAllForm(form) {
  const step0Errors = []
  const step1Errors = []
  const step2Errors = []

  if (!form.name.trim()) step0Errors.push('Property name is required.')
  if (!form.type) step0Errors.push('Please select a property type.')
  if (!form.location.trim()) step0Errors.push('Mailing address is required.')
  if (!form.latitude || !form.longitude) step0Errors.push('Please drop a pin on the map for this property.')

  if (form.price === '' || form.price == null) step1Errors.push('Monthly rent (RM) is required.')
  else if (Number(form.price) < 0) step1Errors.push('Monthly rent must be zero or greater.')

  if (form.religion === 'others' && !String(form.religionOther || '').trim()) {
    step1Errors.push('Please specify religion preference.')
  }
  if (form.race === 'others' && !String(form.raceOther || '').trim()) {
    step1Errors.push('Please specify race preference.')
  }

  if (!parsePropertyImages(form.images).length) {
    step2Errors.push('Please upload at least one cover photo.')
  }

  const errors = [...step0Errors, ...step1Errors, ...step2Errors]
  const firstStep = step0Errors.length ? 0 : step1Errors.length ? 1 : step2Errors.length ? 2 : 0

  return { errors, firstStep }
}

function PropertyFormField({ id, label, required, hint, children, className = '' }) {
  return (
    <div className={`property-form-field ${className}`.trim()}>
      <label className="property-form-label" htmlFor={id}>
        {label}
        {required ? <span className="property-form-required">*</span> : null}
      </label>
      {children}
      {hint ? <p className="property-form-hint">{hint}</p> : null}
    </div>
  )
}

function PropertyAmenitiesGrid({ form, setForm }) {
  return (
    <div className="property-form-amenities-grid" role="group" aria-label="Amenities">
      {AMENITY_CATALOG.map((opt) => {
        const checked = isAmenityChecked(form.amenities, opt.id)
        return (
          <button
            key={opt.id}
            type="button"
            className={`property-form-amenity-chip${checked ? ' property-form-amenity-chip--on' : ''}`}
            aria-pressed={checked}
            onClick={() => setForm((p) => ({ ...p, amenities: toggleAmenityValue(p.amenities, opt.id) }))}
          >
            <span className="property-form-amenity-chip-icon" aria-hidden="true">
              <AmenityIcon id={opt.id} />
            </span>
            <span className="property-form-amenity-chip-label">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function PropertyFormAlert({ errors, alertRef }) {
  if (!errors.length) return null

  return (
    <div className="property-form-alert" role="alert" ref={alertRef}>
      <span className="property-form-alert-icon" aria-hidden="true">
        !
      </span>
      <div className="property-form-alert-content">
        <p className="property-form-alert-title">Please complete required fields before saving</p>
        <ul className="property-form-alert-list">
          {errors.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function PropertyFormStepIndicator({ step, onStepSelect }) {
  return (
    <div className="property-form-steps" role="tablist" aria-label="Form progress">
      {FORM_STEPS.map((item, i) => {
        const done = i < step
        const active = i === step
        return (
          <button
            key={item.label}
            type="button"
            className={`property-form-step-item${active ? ' property-form-step-item--active' : ''}${done ? ' property-form-step-item--done' : ''}`}
            role="tab"
            aria-selected={active}
            aria-label={`Step ${i + 1}: ${item.label}`}
            onClick={() => onStepSelect(i)}
          >
            <span className="property-form-step-circle">{i + 1}</span>
            <span className="property-form-step-caption">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function PropertyFormOptionToggle({ options, value, onChange, ariaLabel, columns = 2 }) {
  const colClass =
    columns === 3 ? ' property-form-type-toggle--triple' : columns === 1 ? ' property-form-type-toggle--single' : ''

  return (
    <div className={`property-form-type-toggle${colClass}`} role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const on = value === opt.value
        return (
          <button
            key={opt.value || '__any__'}
            type="button"
            className={`property-form-type-btn${on ? ' property-form-type-btn--on' : ''}`}
            aria-pressed={on}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function PropertyTypeToggle({ form, setForm }) {
  return (
    <PropertyFormOptionToggle
      ariaLabel="Property type"
      options={PROPERTY_TYPES}
      value={form.type}
      onChange={(type) => setForm((p) => ({ ...p, type }))}
    />
  )
}

function PropertyFormStepBasics({ form, setForm, onPinChange, onMailingAddressBlur, campuses }) {
  return (
    <>
      <section className="property-form-section property-form-section--flush" aria-labelledby="property-form-basic">
        <h4 id="property-form-basic" className="property-form-section-title">
          Basic information
        </h4>
        <div className="property-form-grid">
          <PropertyFormField id="pf-name" label="Property Name" required className="property-form-field--full">
            <input
              id="pf-name"
              className="property-form-control"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Rumah Sewa Muslimah"
            />
          </PropertyFormField>

          <PropertyFormField id="pf-type" label="Property Type" required className="property-form-field--full">
            <PropertyTypeToggle form={form} setForm={setForm} />
          </PropertyFormField>

          <PropertyFormField id="pf-status" label="Listing Status" required className="property-form-field--full">
            <PropertyFormOptionToggle
              ariaLabel="Listing status"
              options={LISTING_STATUS_OPTIONS}
              value={form.status || 'available'}
              columns={3}
              onChange={(status) => setForm((p) => ({ ...p, status }))}
            />
          </PropertyFormField>
        </div>
      </section>

      <section className="property-form-section" aria-labelledby="property-form-location">
        <h4 id="property-form-location" className="property-form-section-title">
          Location
        </h4>
        <div className="property-form-grid">
          <PropertyFormField id="pf-location" label="Mailing Address" required className="property-form-field--full">
            <input
              id="pf-location"
              className="property-form-control"
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              onBlur={onMailingAddressBlur}
              placeholder="e.g. No. 12, Jalan Sultan Zainal Abidin, Taman Seri Telipot"
            />
          </PropertyFormField>

          <PropertyFormField id="pf-map-pin" label="Map Pin Location" required className="property-form-field--full">
            <PropertyLocationMap
              latitude={form.latitude}
              longitude={form.longitude}
              onPinChange={onPinChange}
              universities={campuses}
            />
          </PropertyFormField>
        </div>
      </section>
    </>
  )
}

function FilterSelect({ id, label, value, onChange, options }) {
  return (
    <PropertyFormField id={id} label={label}>
      <div className="property-form-select-wrap">
        <select id={id} className="property-form-control property-form-select" value={value} onChange={onChange}>
          {options.map((opt) => (
            <option key={opt.value || 'any'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="property-form-chevron" aria-hidden="true">
          ▾
        </span>
      </div>
    </PropertyFormField>
  )
}

function PreferenceWithOther({ selectId, otherId, label, selectValue, otherValue, options, onSelectChange, onOtherChange }) {
  const showOther = selectValue === 'others'
  return (
    <div className="property-form-preference-block">
      <FilterSelect id={selectId} label={label} value={selectValue} onChange={onSelectChange} options={options} />
      {showOther ? (
        <PropertyFormField id={otherId} label="Please Specify">
          <input
            id={otherId}
            className="property-form-control"
            value={otherValue}
            onChange={onOtherChange}
            placeholder="Type your preference"
          />
        </PropertyFormField>
      ) : null}
    </div>
  )
}

function PropertyFormStepDetails({ form, setForm }) {
  return (
    <>
      <section className="property-form-section property-form-section--flush" aria-labelledby="property-form-search-filters">
        <h4 id="property-form-search-filters" className="property-form-section-title">
          Search & listing preferences
        </h4>
        <div className="property-form-grid property-form-grid--prefs">
          <PropertyFormField id="pf-gender" label="Gender Preference" className="property-form-field--full">
            <PropertyFormOptionToggle
              ariaLabel="Gender preference"
              options={GENDER_OPTIONS}
              value={form.gender}
              columns={3}
              onChange={(gender) => setForm((p) => ({ ...p, gender }))}
            />
          </PropertyFormField>
          <PreferenceWithOther
            selectId="pf-religion"
            otherId="pf-religion-other"
            label="Religion Preference"
            selectValue={form.religion}
            otherValue={form.religionOther}
            options={RELIGION_OPTIONS}
            onSelectChange={(e) =>
              setForm((p) => ({
                ...p,
                religion: e.target.value,
                religionOther: e.target.value === 'others' ? p.religionOther : '',
              }))
            }
            onOtherChange={(e) => setForm((p) => ({ ...p, religionOther: e.target.value }))}
          />
          <PreferenceWithOther
            selectId="pf-race"
            otherId="pf-race-other"
            label="Race Preference"
            selectValue={form.race}
            otherValue={form.raceOther}
            options={RACE_OPTIONS}
            onSelectChange={(e) =>
              setForm((p) => ({
                ...p,
                race: e.target.value,
                raceOther: e.target.value === 'others' ? p.raceOther : '',
              }))
            }
            onOtherChange={(e) => setForm((p) => ({ ...p, raceOther: e.target.value }))}
          />
        </div>
      </section>

      <section className="property-form-section" aria-labelledby="property-form-pricing">
        <h4 id="property-form-pricing" className="property-form-section-title">
          Pricing & capacity
        </h4>
        <div className="property-form-grid">
          <PropertyFormField id="pf-price" label="Monthly rent (RM)" required>
            <input
              id="pf-price"
              type="number"
              min="0"
              step="1"
              className="property-form-control"
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              placeholder="e.g. 650"
            />
          </PropertyFormField>

          <PropertyFormField id="pf-capacity" label="Capacity (persons)">
            <input
              id="pf-capacity"
              type="number"
              min="1"
              className="property-form-control"
              value={form.capacity}
              onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
              placeholder="e.g. 4"
            />
          </PropertyFormField>
        </div>
      </section>

      <section className="property-form-section" aria-labelledby="property-form-details">
        <h4 id="property-form-details" className="property-form-section-title">
          Details
        </h4>
        <PropertyFormField id="pf-description" label="Description" className="property-form-field--full">
          <textarea
            id="pf-description"
            className="property-form-control property-form-textarea"
            rows={4}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Describe the unit, house rules, and what makes it suitable for students…"
          />
        </PropertyFormField>

        <PropertyFormField id="pf-amenities" label="Amenities" className="property-form-field--full">
          <p className="property-form-hint property-form-hint--above">Tap to select what your property offers.</p>
          <PropertyAmenitiesGrid form={form} setForm={setForm} />
        </PropertyFormField>
      </section>
    </>
  )
}

const THUMB_SLOT_COUNT = MAX_PROPERTY_IMAGES - 1

function PropertyFormStepPhotos({ form, setForm, imagePreviews, uploading, onUpload }) {
  const fileInputRef = useRef(null)
  const atMax = imagePreviews.length >= MAX_PROPERTY_IMAGES
  const coverSrc = imagePreviews[0] || null
  const thumbs = imagePreviews.slice(1)
  const thumbSlots = Array.from({ length: THUMB_SLOT_COUNT }, (_, i) => thumbs[i] || null)

  function updateImages(nextList) {
    setForm((p) => ({ ...p, images: nextList.length ? JSON.stringify(nextList) : '' }))
  }

  function removeAt(index) {
    const next = imagePreviews.filter((_, i) => i !== index)
    updateImages(next)
  }

  function openFilePicker() {
    if (!atMax && !uploading) fileInputRef.current?.click()
  }

  return (
    <section className="property-form-section property-form-section--flush" aria-labelledby="property-form-photos">
      <h4 id="property-form-photos" className="property-form-section-title">
        Photos <span className="property-form-required">*</span>
      </h4>
      <p className="property-form-section-lead">
        Up to {MAX_PROPERTY_IMAGES} images — large cover on top, thumbnails below (first image is the cover).
      </p>

      <input
        ref={fileInputRef}
        type="file"
        className="visually-hidden"
        multiple
        accept="image/*"
        onChange={onUpload}
        disabled={uploading || atMax}
        tabIndex={-1}
        aria-hidden="true"
      />

      <div className="property-form-photo-gallery" aria-label="Property photos">
        {coverSrc ? (
          <div className="property-form-photo-cover property-form-photo-cover--filled">
            <img src={resolveMediaUrl(coverSrc)} alt="" />
            <span className="property-form-image-cover-badge">Cover</span>
            <div className="property-form-image-actions property-form-image-actions--cover">
              <button type="button" className="property-form-image-action property-form-image-action--danger" onClick={() => removeAt(0)}>
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="property-form-photo-cover property-form-photo-slot--empty" onClick={openFilePicker} disabled={uploading || atMax}>
            <span className="property-form-photo-slot-plus" aria-hidden="true">
              +
            </span>
            <span className="property-form-photo-slot-label">(Cover Photo)</span>
          </button>
        )}

        <div className="property-form-photo-thumb-grid">
          {thumbSlots.map((src, gridIndex) => {
            const listIndex = gridIndex + 1
            if (src) {
              return (
                <div key={`${src}-${listIndex}`} className="property-form-photo-thumb property-form-photo-thumb--filled">
                  <img src={resolveMediaUrl(src)} alt="" />
                  <div className="property-form-image-actions">
                    <button
                      type="button"
                      className="property-form-image-action property-form-image-action--danger"
                      onClick={() => removeAt(listIndex)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            }
            return (
              <button
                key={`empty-${gridIndex}`}
                type="button"
                className="property-form-photo-thumb property-form-photo-slot--empty"
                onClick={openFilePicker}
                disabled={uploading || atMax}
                aria-label="Add photo"
              >
                <span className="property-form-photo-slot-plus" aria-hidden="true">
                  +
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {atMax ? (
        <p className="property-form-photo-max-hint">Maximum {MAX_PROPERTY_IMAGES} photos. Remove one to add another.</p>
      ) : null}
      {uploading ? <p className="property-form-photo-uploading">Uploading…</p> : null}
    </section>
  )
}

export default function PropertyFormModal({
  editingId,
  form,
  setForm,
  saving,
  uploading,
  onClose,
  onSubmit,
  onUpload,
}) {
  const [step, setStep] = useState(0)
  const [formErrors, setFormErrors] = useState([])
  const [campuses, setCampuses] = useState([])
  const alertRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function loadCampuses() {
      try {
        const list = await getCampusList()
        if (!cancelled) setCampuses(list)
      } catch {
        if (!cancelled) setCampuses([])
      }
    }
    loadCampuses()
    function onUniversitiesUpdated() {
      loadCampuses()
    }
    window.addEventListener('mysewa-universities-updated', onUniversitiesUpdated)
    return () => {
      cancelled = true
      window.removeEventListener('mysewa-universities-updated', onUniversitiesUpdated)
    }
  }, [])
  const imagePreviews = parsePropertyImages(form.images)
  const isEdit = Boolean(editingId)
  const isLastStep = step === FORM_STEPS.length - 1

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    if (formErrors.length && alertRef.current) {
      alertRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [formErrors, step])

  function goNext() {
    setStep((s) => Math.min(s + 1, FORM_STEPS.length - 1))
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  function selectStep(index) {
    setStep(index)
  }

  const handlePinChange = useCallback(
    (lat, lng) => {
      setForm((p) => ({ ...p, latitude: String(lat), longitude: String(lng) }))
    },
    [setForm],
  )

  const handleMailingAddressBlur = useCallback(async () => {
    const address = form.location?.trim()
    if (!address) return
    try {
      const geo = await geocodeMailingAddress(address)
      setForm((p) => ({
        ...p,
        city: geo.city || p.city,
        state: geo.state || p.state,
        postcode: geo.postcode || p.postcode,
      }))
    } catch {
      /* keep existing values */
    }
  }, [form.location, setForm])

  function handleFormSubmit(event) {
    event.preventDefault()
    if (!isLastStep) {
      goNext()
      return
    }
    const { errors, firstStep } = validateAllForm(form)
    if (errors.length) {
      setFormErrors(errors)
      setStep(firstStep)
      return
    }
    setFormErrors([])
    onSubmit(event)
  }

  return (
    <div className="my-property-modal-backdrop my-property-modal-backdrop--form" role="presentation">
      <div
        className="my-property-modal my-property-modal--form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="property-form-title"
      >
        <div className="my-property-form-head">
          <div>
            <h3 id="property-form-title">{isEdit ? 'Edit property' : 'Add new property'}</h3>
            <p className="my-property-form-subtitle">
              {isEdit
                ? 'Update listing details students will see on MySewa.'
                : 'Fill in the details for your new rental listing.'}
            </p>
          </div>
          <button type="button" className="my-property-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <PropertyFormStepIndicator step={step} onStepSelect={selectStep} />

        <form className="property-form property-form--wizard" onSubmit={handleFormSubmit} noValidate>
          <div className="property-form-body">
            <PropertyFormAlert errors={formErrors} alertRef={alertRef} />

            {step === 0 ? (
              <PropertyFormStepBasics
                form={form}
                setForm={setForm}
                onPinChange={handlePinChange}
                onMailingAddressBlur={handleMailingAddressBlur}
                campuses={campuses}
              />
            ) : null}
            {step === 1 ? <PropertyFormStepDetails form={form} setForm={setForm} /> : null}
            {step === 2 ? (
              <PropertyFormStepPhotos
                form={form}
                setForm={setForm}
                imagePreviews={imagePreviews}
                uploading={uploading}
                onUpload={onUpload}
              />
            ) : null}
          </div>

          <footer className="property-form-footer">
            <div className="property-form-footer-main property-form-footer-main--end">
              {step > 0 ? (
                <button type="button" className="property-form-btn property-form-btn--ghost" onClick={goBack}>
                  Back
                </button>
              ) : null}
              <button
                type="submit"
                className="property-form-btn property-form-btn--primary"
                disabled={saving && isLastStep}
              >
                {saving && isLastStep ? 'Saving…' : isLastStep ? (isEdit ? 'Save changes' : 'Create property') : 'Next'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  )
}
