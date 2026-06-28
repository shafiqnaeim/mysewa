import { useCallback, useEffect, useRef, useState } from 'react'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import PropertyLocationPicker from '../../components/PropertyLocationPicker'

export const MAX_PROPERTY_IMAGES = 7

const PROPERTY_TYPES = [
  { value: 'House', emoji: '🏠', label: 'House' },
  { value: 'Room', emoji: '🚪', label: 'Room' },
]

const DEFAULT_STATE = 'Terengganu'

const MINIMUM_STAY_OPTIONS = [
  { value: '1', label: '1 month' },
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months' },
  { value: '12', label: '12 months' },
]

const AMENITY_OPTIONS = [
  { key: 'furnished', id: 'furnished', emoji: '🛏️', label: 'Furnished' },
  { key: 'wifi', id: 'wifi', emoji: '📶', label: 'WiFi Available' },
  { key: 'aircond', id: 'aircond', emoji: '❄️', label: 'Air Conditioning' },
  { key: 'petFriendly', id: 'pet_friendly', emoji: '🐾', label: 'Pet Friendly' },
  { key: 'parking', id: 'parking', emoji: '🅿️', label: 'Parking Available' },
  { key: 'utilities', id: 'utilities', emoji: '💡', label: 'Utilities Included' },
  { key: 'waterHeater', id: 'water_heater', emoji: '🛁', label: 'Water Heater' },
  { key: 'pool', id: 'pool', emoji: '🏊', label: 'Pool Access' },
  { key: 'gym', id: 'gym', emoji: '💪', label: 'Gym Access' },
  { key: 'security', id: 'security', emoji: '🔐', label: 'Security Guard' },
  { key: 'tv', id: 'tv', emoji: '📺', label: 'TV / Smart TV' },
  { key: 'powerBackup', id: 'power_backup', emoji: '🔌', label: 'Power Backup' },
  { key: 'washing', id: 'washing', emoji: '🧺', label: 'Washing Machine' },
  { key: 'kitchen', id: 'kitchen', emoji: '🍽️', label: 'Kitchen Equipped' },
  { key: 'privateBathroom', id: 'private_bathroom', emoji: '🚪', label: 'Private Bathroom' },
  { key: 'garden', id: 'garden', emoji: '🌿', label: 'Garden Access' },
]

function createEmptyAmenities() {
  return Object.fromEntries(AMENITY_OPTIONS.map((opt) => [opt.key, false]))
}

export const PAYMENT_METHOD_OPTIONS = [
  { key: 'online_banking', label: 'Online Banking' },
  { key: 'duitnow_qr', label: 'DuitNow / QR' },
  { key: 'cash', label: 'Cash' },
  { key: 'toyyibpay', label: 'ToyyibPay' },
]

export const FIXED_PAYMENT_DUE_DATE = '1st of every month'

export const GENDER_PREFERENCE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

export const RELIGION_PREFERENCE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'islam', label: 'Islam' },
  { value: 'others', label: 'Other' },
]

export const RACE_PREFERENCE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'malay', label: 'Malay' },
  { value: 'others', label: 'Other' },
]

export const EMPTY_PROPERTY_FORM = {
  title: '',
  description: '',
  type: '',
  address: '',
  city: '',
  state: DEFAULT_STATE,
  postcode: '',
  latitude: '',
  longitude: '',
  contactPhone: '',
  contactEmail: '',
  price: '',
  deposit: '',
  paymentMethods: {
    online_banking: false,
    duitnow_qr: false,
    cash: false,
    toyyibpay: false,
  },
  bankName: '',
  accountNumber: '',
  accountHolder: '',
  qrCodeUrl: '',
  paymentDueDate: FIXED_PAYMENT_DUE_DATE,
  bedrooms: '',
  bathrooms: '',
  maxPersons: '',
  amenities: createEmptyAmenities(),
  images: [],
  primaryImageIndex: 0,
  availableFrom: '',
  minimumStay: '1',
  gender: '',
  religion: '',
  race: '',
  acceptsMarriedStudents: false,
}

function FieldLabel({ htmlFor, required, children }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-[#2D3748]">
      {children}
      {required ? <span className="text-[#E53E3E]"> *</span> : null}
    </label>
  )
}

function FieldError({ message }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-[#E53E3E]">{message}</p>
}

function SectionCard({ title, children }) {
  return (
    <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-semibold text-[#2D3748]">{title}</h2>
      {children}
    </section>
  )
}

function AmenityChipScroller({ amenities, onToggle }) {
  const scrollRef = useRef(null)

  const scrollBy = useCallback((delta) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' })
  }, [])

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => scrollBy(-220)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-sm text-[#2D3748] shadow-md transition hover:bg-gray-50"
        aria-label="Scroll amenities left"
      >
        ◀
      </button>
      <div
        ref={scrollRef}
        className="flex min-w-0 flex-1 gap-2 overflow-x-auto scroll-smooth py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {AMENITY_OPTIONS.map((opt) => {
          const selected = Boolean(amenities?.[opt.key])
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onToggle(opt.key, !selected)}
              className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
                selected
                  ? 'bg-[#E88D5B] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {opt.emoji} {opt.label}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => scrollBy(220)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-sm text-[#2D3748] shadow-md transition hover:bg-gray-50"
        aria-label="Scroll amenities right"
      >
        ▶
      </button>
    </div>
  )
}

function inputClass(hasError) {
  return `w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-[#2D3748] outline-none transition focus:border-[#E88D5B] focus:ring-2 focus:ring-[#E88D5B]/20 ${
    hasError ? 'border-[#FC8181]' : 'border-[#E2E8F0]'
  }`
}

export function validatePropertyForm(form) {
  const errors = {}

  if (!String(form.title || '').trim()) errors.title = 'Property title is required.'
  if (!String(form.type || '').trim()) errors.type = 'Property type is required.'
  if (!String(form.address || '').trim()) errors.address = 'Address is required.'

  const price = Number(form.price)
  if (form.price === '' || form.price == null) errors.price = 'Price per month is required.'
  else if (!Number.isFinite(price) || price <= 0) errors.price = 'Price must be greater than 0.'

  if (form.deposit === '' || form.deposit == null) {
    errors.deposit = 'Deposit amount is required.'
  } else {
    const deposit = Number(form.deposit)
    if (!Number.isFinite(deposit) || deposit < 0) errors.deposit = 'Deposit must be zero or greater.'
  }

  for (const key of ['bedrooms', 'bathrooms', 'maxPersons']) {
    const raw = form[key]
    if (raw !== '' && raw != null) {
      const n = Number(raw)
      if (!Number.isInteger(n) || n <= 0) {
        errors[key] = 'Enter a valid whole number greater than 0.'
      }
    }
  }

  if (!Array.isArray(form.images) || form.images.length === 0) {
    errors.images = 'Upload at least one property image.'
  }

  if (form.postcode && !/^\d{5}$/.test(String(form.postcode).trim())) {
    errors.postcode = 'Postal code must be 5 digits.'
  }

  const lat = form.latitude === '' || form.latitude == null ? NaN : Number(form.latitude)
  const lng = form.longitude === '' || form.longitude == null ? NaN : Number(form.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    errors.locationPin = 'Please pin the property location on the map.'
  }

  if (!String(form.contactPhone || '').trim()) {
    errors.contactPhone = 'Phone number is required.'
  }

  const email = String(form.contactEmail || '').trim()
  if (!email) {
    errors.contactEmail = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.contactEmail = 'Enter a valid email address.'
  }

  const hasPaymentMethod = PAYMENT_METHOD_OPTIONS.some((opt) => form.paymentMethods?.[opt.key])
  if (!hasPaymentMethod) {
    errors.paymentMethods = 'Select at least one payment method.'
  }

  if (form.paymentMethods?.online_banking) {
    if (!String(form.bankName || '').trim()) errors.bankName = 'Bank name is required.'
    if (!String(form.accountNumber || '').trim()) errors.accountNumber = 'Account number is required.'
    if (!String(form.accountHolder || '').trim()) errors.accountHolder = 'Account holder name is required.'
  }

  if (form.paymentMethods?.duitnow_qr) {
    if (!String(form.qrCodeUrl || '').trim()) errors.qrCodeUrl = 'QR code image is required.'
  }

  return errors
}

export function amenitiesToApi(formAmenities) {
  const ids = AMENITY_OPTIONS.filter((opt) => formAmenities[opt.key]).map((opt) => opt.id)
  return ids.length ? JSON.stringify(ids) : ''
}

export function amenitiesFromApi(amenitiesField) {
  const next = createEmptyAmenities()
  if (!amenitiesField) return next
  let ids = []
  try {
    const parsed = JSON.parse(amenitiesField)
    if (Array.isArray(parsed)) ids = parsed.map((x) => String(x).toLowerCase())
  } catch {
    ids = String(amenitiesField)
      .split(',')
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
  }
  AMENITY_OPTIONS.forEach((opt) => {
    next[opt.key] = ids.includes(opt.id)
  })
  return next
}

export function parseRentalStyleMeta(rentalStyle) {
  const fallback = { minimumStay: '1', bedrooms: '', bathrooms: '', deposit: '', availableFrom: '' }
  if (!rentalStyle) return fallback
  try {
    const parsed = JSON.parse(rentalStyle)
    if (parsed && typeof parsed === 'object') {
      return {
        minimumStay: String(parsed.minStay || parsed.minimumStay || '1'),
        bedrooms: parsed.bedrooms != null ? String(parsed.bedrooms) : '',
        bathrooms: parsed.bathrooms != null ? String(parsed.bathrooms) : '',
        deposit: parsed.deposit != null ? String(parsed.deposit) : '',
        availableFrom: parsed.availableFrom || '',
      }
    }
  } catch {
    /* plain string minimum stay */
  }
  return { ...fallback, minimumStay: String(rentalStyle) }
}

export function buildRentalStyleMeta(form) {
  return JSON.stringify({
    minStay: form.minimumStay,
    availableFrom: form.availableFrom || null,
    bedrooms: form.bedrooms !== '' ? Number(form.bedrooms) : null,
    bathrooms: form.bathrooms !== '' ? Number(form.bathrooms) : null,
    deposit: form.deposit !== '' ? Number(form.deposit) : null,
  })
}

export function paymentMethodsToApi(formPaymentMethods) {
  return PAYMENT_METHOD_OPTIONS.filter((opt) => formPaymentMethods?.[opt.key]).map((opt) => opt.key)
}

export function paymentMethodsFromApi(paymentMethodsField) {
  const next = { ...EMPTY_PROPERTY_FORM.paymentMethods }
  if (!paymentMethodsField) return next
  let ids = []
  if (Array.isArray(paymentMethodsField)) {
    ids = paymentMethodsField.map((x) => String(x).toLowerCase())
  } else {
    try {
      const parsed = JSON.parse(paymentMethodsField)
      if (Array.isArray(parsed)) ids = parsed.map((x) => String(x).toLowerCase())
    } catch {
      ids = String(paymentMethodsField)
        .split(',')
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)
    }
  }
  PAYMENT_METHOD_OPTIONS.forEach((opt) => {
    next[opt.key] = ids.includes(opt.key)
  })
  return next
}

export function listPaymentMethodLabels(paymentMethodsField) {
  const selected = paymentMethodsFromApi(paymentMethodsField)
  return PAYMENT_METHOD_OPTIONS.filter((opt) => selected[opt.key]).map((opt) => opt.label)
}

export function tenantPreferencesFromApi(item) {
  const religion = String(item?.religion || '').trim().toLowerCase()
  const race = String(item?.race || '').trim().toLowerCase()
  return {
    gender: item?.gender === 'mixed' ? '' : item?.gender || '',
    religion: ['', 'islam', 'others'].includes(religion) ? religion : 'others',
    race: ['', 'malay', 'others'].includes(race) ? race : 'others',
  }
}

export function formatTenantPreferenceDisplay(value) {
  const v = String(value || '').trim().toLowerCase()
  if (!v) return 'Any'
  if (v === 'others') return 'Other'
  if (v === 'islam') return 'Islam'
  if (v === 'malay') return 'Malay'
  if (v === 'male') return 'Male'
  if (v === 'female') return 'Female'
  return v.charAt(0).toUpperCase() + v.slice(1)
}

/** Build the JSON body for POST/PUT /api/v1/properties */
export function buildPropertyApiPayload(form, locationMeta) {
  const { campus, distance, campusDistances, latitude, longitude } = locationMeta
  const paymentMethodList = paymentMethodsToApi(form.paymentMethods)

  return {
    name: form.title.trim(),
    type: form.type,
    location: form.address.trim(),
    city: form.city.trim() || null,
    state: 'Terengganu',
    postcode: form.postcode.trim() || null,
    latitude,
    longitude,
    campus,
    distance,
    campusDistances: JSON.stringify(campusDistances),
    price: Number(form.price),
    capacity: form.maxPersons ? Number(form.maxPersons) : null,
    description: form.description.trim() || null,
    amenities: amenitiesToApi(form.amenities),
    images: JSON.stringify(form.images),
    rentalStyle: buildRentalStyleMeta(form),
    status: 'available',
    contactPhone: form.contactPhone.trim(),
    contactEmail: form.contactEmail.trim(),
    paymentMethods: paymentMethodList,
    paymentDueDate: FIXED_PAYMENT_DUE_DATE,
    bankName: form.paymentMethods?.online_banking ? form.bankName.trim() : null,
    accountNumber: form.paymentMethods?.online_banking ? form.accountNumber.trim() : null,
    accountHolder: form.paymentMethods?.online_banking ? form.accountHolder.trim() : null,
    qrCodeUrl: form.paymentMethods?.duitnow_qr ? form.qrCodeUrl || null : null,
    acceptsMarriedHousehold: Boolean(form.acceptsMarriedStudents),
    gender: form.gender || null,
    religion: form.religion || null,
    race: form.race || null,
  }
}

export default function AddProperty({
  resetKey = 'new',
  initialValues = EMPTY_PROPERTY_FORM,
  mode = 'create',
  saving = false,
  uploading = false,
  onSubmit,
  onCancel,
  onUploadImages,
}) {
  const [form, setForm] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const qrFileInputRef = useRef(null)

  const prevResetKey = useRef(null)

  useEffect(() => {
    if (prevResetKey.current === resetKey) return
    prevResetKey.current = resetKey
    setForm(initialValues)
    setErrors({})
  }, [resetKey, initialValues])

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const setAmenity = useCallback((key, checked) => {
    setForm((prev) => ({
      ...prev,
      amenities: { ...prev.amenities, [key]: checked },
    }))
  }, [])

  const setPaymentMethod = useCallback((key, checked) => {
    setForm((prev) => {
      const next = {
        ...prev,
        paymentMethods: { ...prev.paymentMethods, [key]: checked },
      }
      if (key === 'online_banking' && !checked) {
        next.bankName = ''
        next.accountNumber = ''
        next.accountHolder = ''
      }
      if (key === 'duitnow_qr' && !checked) {
        next.qrCodeUrl = ''
      }
      return next
    })
    setErrors((prev) => {
      const next = { ...prev }
      delete next.paymentMethods
      if (key === 'online_banking' && !checked) {
        delete next.bankName
        delete next.accountNumber
        delete next.accountHolder
      }
      if (key === 'duitnow_qr' && !checked) {
        delete next.qrCodeUrl
      }
      return next
    })
  }, [])

  const handleLocationChange = useCallback((location) => {
    setForm((prev) => ({
      ...prev,
      latitude:
        location.latitude !== '' && location.latitude != null ? String(location.latitude) : '',
      longitude:
        location.longitude !== '' && location.longitude != null ? String(location.longitude) : '',
    }))
    setErrors((prev) => {
      if (!prev.locationPin) return prev
      const next = { ...prev }
      delete next.locationPin
      return next
    })
  }, [])

  const orderedImages = useCallback(() => {
    const images = [...(form.images || [])]
    const idx = Math.min(Math.max(form.primaryImageIndex || 0, 0), Math.max(images.length - 1, 0))
    if (!images.length) return []
    const [primary] = images.splice(idx, 1)
    return [primary, ...images]
  }, [form.images, form.primaryImageIndex])

  function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validatePropertyForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSubmit?.({ ...form, images: orderedImages() })
  }

  async function handleQrUpload(fileList) {
    const file = fileList?.[0]
    if (!file || !onUploadImages) return
    const added = await onUploadImages([file])
    if (!added?.length) return
    setField('qrCodeUrl', added[0])
  }

  function removeQrCode() {
    setField('qrCodeUrl', '')
  }

  async function handleFiles(files) {
    if (!files?.length || !onUploadImages) return
    const slotsLeft = MAX_PROPERTY_IMAGES - (form.images?.length || 0)
    if (slotsLeft <= 0) return
    const added = await onUploadImages(Array.from(files).slice(0, slotsLeft))
    if (!added?.length) return
    setForm((prev) => ({
      ...prev,
      images: [...(prev.images || []), ...added].slice(0, MAX_PROPERTY_IMAGES),
    }))
    setErrors((prev) => {
      if (!prev.images) return prev
      const next = { ...prev }
      delete next.images
      return next
    })
  }

  function handleDrop(event) {
    event.preventDefault()
    setDragOver(false)
    handleFiles(event.dataTransfer?.files)
  }

  function removeImage(index) {
    setForm((prev) => {
      const images = prev.images.filter((_, i) => i !== index)
      let primaryImageIndex = prev.primaryImageIndex
      if (index < primaryImageIndex) primaryImageIndex -= 1
      if (primaryImageIndex >= images.length) primaryImageIndex = Math.max(images.length - 1, 0)
      return { ...prev, images, primaryImageIndex }
    })
  }

  return (
    <div className="min-h-[calc(100vh-4.5rem)] w-full bg-[#FAFAFA] font-sans text-[#2D3748]">
      <form className="mx-auto max-w-4xl space-y-6 px-4 py-6" onSubmit={handleSubmit} noValidate>
        <header>
          <h1 className="text-2xl font-bold text-[#2D3748]">
            {mode === 'edit' ? 'Edit Property' : 'Add New Property'}
          </h1>
          <p className="mt-1 text-sm text-[#A0AEC0]">
            {mode === 'edit' ? 'Update your rental listing details' : 'Create a new rental listing for students'}
          </p>
        </header>

        {Object.keys(errors).length ? (
          <div className="rounded-xl border border-[#FC8181] bg-[#FFF5F5] px-4 py-3 text-sm text-[#C53030]" role="alert">
            Please fix the highlighted fields before saving.
          </div>
        ) : null}

        <SectionCard title="Property Details">
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor="title" required>
                Property Title
              </FieldLabel>
              <input
                id="title"
                className={inputClass(errors.title)}
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="e.g. Rumah Sewa Ayah Wan"
              />
              <FieldError message={errors.title} />
            </div>

            <div>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <textarea
                id="description"
                rows={4}
                className={inputClass(false)}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Describe the property, nearby campus access, and house rules…"
              />
            </div>

            <div>
              <FieldLabel required>Property Type</FieldLabel>
              <div className="flex flex-wrap gap-3">
                {PROPERTY_TYPES.map((opt) => {
                  const selected = form.type === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setField('type', opt.value)}
                      className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
                        selected
                          ? 'bg-[#E88D5B] text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      aria-pressed={selected}
                    >
                      <span aria-hidden="true">{opt.emoji}</span>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              <FieldError message={errors.type} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Location">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="address" required>
                Full Address
              </FieldLabel>
              <input
                id="address"
                className={inputClass(errors.address)}
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
                placeholder="Street address"
              />
              <FieldError message={errors.address} />
            </div>

            <div>
              <FieldLabel htmlFor="city">City</FieldLabel>
              <input
                id="city"
                className={inputClass(false)}
                value={form.city}
                onChange={(e) => setField('city', e.target.value)}
                placeholder="e.g. Kuala Terengganu"
              />
            </div>

            <div>
              <FieldLabel htmlFor="state">State</FieldLabel>
              <input
                id="state"
                type="text"
                readOnly
                disabled
                className="w-full cursor-not-allowed rounded-lg border border-[#E2E8F0] bg-gray-100 px-3 py-2.5 text-sm text-gray-500"
                value={DEFAULT_STATE}
              />
            </div>

            <div>
              <FieldLabel htmlFor="postcode">Postal Code</FieldLabel>
              <input
                id="postcode"
                className={inputClass(errors.postcode)}
                value={form.postcode}
                onChange={(e) => setField('postcode', e.target.value)}
                placeholder="e.g. 21300"
                inputMode="numeric"
              />
              <FieldError message={errors.postcode} />
            </div>
          </div>

          <div className="mt-6 border-t border-[#E2E8F0] pt-6">
            <FieldLabel required>Property location on map</FieldLabel>
            <p className="mb-3 text-xs text-[#A0AEC0]">
              Pin the exact location so students can find your property and see campus distances.
            </p>
            <PropertyLocationPicker
              latitude={form.latitude}
              longitude={form.longitude}
              onLocationChange={handleLocationChange}
            />
            <FieldError message={errors.locationPin} />
          </div>
        </SectionCard>

        <SectionCard title="Contact">
          <p className="mb-4 text-xs text-[#A0AEC0]">
            Pre-filled from your profile — you can edit these before publishing.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="contactPhone" required>
                Phone Number
              </FieldLabel>
              <input
                id="contactPhone"
                type="tel"
                className={inputClass(errors.contactPhone)}
                value={form.contactPhone}
                onChange={(e) => setField('contactPhone', e.target.value)}
                placeholder="e.g. 012-345 6789"
              />
              <FieldError message={errors.contactPhone} />
            </div>

            <div>
              <FieldLabel htmlFor="contactEmail" required>
                Email
              </FieldLabel>
              <input
                id="contactEmail"
                type="email"
                className={inputClass(errors.contactEmail)}
                value={form.contactEmail}
                onChange={(e) => setField('contactEmail', e.target.value)}
                placeholder="landlord@email.com"
              />
              <FieldError message={errors.contactEmail} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Payment">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="deposit" required>
                Deposit Amount (RM)
              </FieldLabel>
              <input
                id="deposit"
                type="number"
                min="0"
                step="1"
                className={inputClass(errors.deposit)}
                value={form.deposit}
                onChange={(e) => setField('deposit', e.target.value)}
                placeholder="1500"
              />
              <FieldError message={errors.deposit} />
            </div>

            <div>
              <FieldLabel htmlFor="price" required>
                Monthly Rent (RM)
              </FieldLabel>
              <input
                id="price"
                type="number"
                min="0"
                step="1"
                className={inputClass(errors.price)}
                value={form.price}
                onChange={(e) => setField('price', e.target.value)}
                placeholder="1500"
              />
              <FieldError message={errors.price} />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel required>Accepted Payment Methods</FieldLabel>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <label
                    key={opt.key}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#E2E8F0] px-4 py-3 transition hover:bg-[#FAFAFA]"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#E2E8F0] text-[#E88D5B] focus:ring-[#E88D5B]"
                      checked={Boolean(form.paymentMethods?.[opt.key])}
                      onChange={(e) => setPaymentMethod(opt.key, e.target.checked)}
                    />
                    <span className="text-sm font-medium text-[#2D3748]">{opt.label}</span>
                  </label>
                ))}
              </div>
              <FieldError message={errors.paymentMethods} />
            </div>

            {form.paymentMethods?.online_banking ? (
              <div className="sm:col-span-2 rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] p-4">
                <p className="mb-3 text-sm font-medium text-[#2D3748]">Online Banking Details</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="bankName" required>
                      Bank Name
                    </FieldLabel>
                    <input
                      id="bankName"
                      className={inputClass(errors.bankName)}
                      value={form.bankName}
                      onChange={(e) => setField('bankName', e.target.value)}
                      placeholder="e.g. Maybank"
                    />
                    <FieldError message={errors.bankName} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="accountNumber" required>
                      Account Number
                    </FieldLabel>
                    <input
                      id="accountNumber"
                      className={inputClass(errors.accountNumber)}
                      value={form.accountNumber}
                      onChange={(e) => setField('accountNumber', e.target.value)}
                      placeholder="e.g. 1234567890"
                    />
                    <FieldError message={errors.accountNumber} />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel htmlFor="accountHolder" required>
                      Account Holder Name
                    </FieldLabel>
                    <input
                      id="accountHolder"
                      className={inputClass(errors.accountHolder)}
                      value={form.accountHolder}
                      onChange={(e) => setField('accountHolder', e.target.value)}
                      placeholder="Name as shown on bank account"
                    />
                    <FieldError message={errors.accountHolder} />
                  </div>
                </div>
              </div>
            ) : null}

            {form.paymentMethods?.duitnow_qr ? (
              <div className="sm:col-span-2 rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] p-4">
                <FieldLabel required>QR Code Image</FieldLabel>
                <p className="mb-3 text-xs text-[#A0AEC0]">
                  Upload your DuitNow QR code so tenants can scan and pay.
                </p>
                {form.qrCodeUrl ? (
                  <div className="flex flex-wrap items-start gap-4">
                    <img
                      src={resolveMediaUrl(form.qrCodeUrl)}
                      alt="Payment QR code"
                      className="h-40 w-40 rounded-lg border border-[#E2E8F0] bg-white object-contain p-2"
                    />
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#2D3748] transition hover:bg-[#FAFAFA]"
                        onClick={() => qrFileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? 'Uploading…' : 'Replace QR Code'}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg px-4 py-2 text-sm font-medium text-[#E53E3E] transition hover:bg-[#FFF5F5]"
                        onClick={removeQrCode}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E2E8F0] bg-white px-4 py-8 text-sm text-[#A0AEC0] transition hover:border-[#E88D5B] hover:text-[#E88D5B]"
                    onClick={() => qrFileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading…' : 'Click to upload QR code image'}
                  </button>
                )}
                <input
                  ref={qrFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleQrUpload(e.target.files)
                    e.target.value = ''
                  }}
                />
                <FieldError message={errors.qrCodeUrl} />
              </div>
            ) : null}

            <div className="sm:col-span-2">
              <FieldLabel>Payment Due Date</FieldLabel>
              <p className="rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] px-3 py-2.5 text-sm text-[#4A5568]">
                {FIXED_PAYMENT_DUE_DATE}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Property Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="bedrooms">Bedrooms</FieldLabel>
              <input
                id="bedrooms"
                type="number"
                min="1"
                step="1"
                className={inputClass(errors.bedrooms)}
                value={form.bedrooms}
                onChange={(e) => setField('bedrooms', e.target.value)}
              />
              <FieldError message={errors.bedrooms} />
            </div>

            <div>
              <FieldLabel htmlFor="bathrooms">Bathrooms</FieldLabel>
              <input
                id="bathrooms"
                type="number"
                min="1"
                step="1"
                className={inputClass(errors.bathrooms)}
                value={form.bathrooms}
                onChange={(e) => setField('bathrooms', e.target.value)}
              />
              <FieldError message={errors.bathrooms} />
            </div>

            <div>
              <FieldLabel htmlFor="maxPersons">Maximum Persons</FieldLabel>
              <input
                id="maxPersons"
                type="number"
                min="1"
                step="1"
                className={inputClass(errors.maxPersons)}
                value={form.maxPersons}
                onChange={(e) => setField('maxPersons', e.target.value)}
                placeholder="e.g. 10"
              />
              <FieldError message={errors.maxPersons} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Tenant Preferences">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel htmlFor="gender">Gender Preference</FieldLabel>
              <select
                id="gender"
                className={inputClass(false)}
                value={form.gender}
                onChange={(e) => setField('gender', e.target.value)}
              >
                {GENDER_PREFERENCE_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="religion">Religion Preference</FieldLabel>
              <select
                id="religion"
                className={inputClass(false)}
                value={form.religion}
                onChange={(e) => setField('religion', e.target.value)}
              >
                {RELIGION_PREFERENCE_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="race">Race Preference</FieldLabel>
              <select
                id="race"
                className={inputClass(false)}
                value={form.race}
                onChange={(e) => setField('race', e.target.value)}
              >
                {RACE_PREFERENCE_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-[#E2E8F0] px-4 py-4 transition hover:bg-[#FAFAFA]">
            <input
              id="acceptsMarriedStudents"
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#E2E8F0] text-[#E88D5B] focus:ring-[#E88D5B]"
              checked={Boolean(form.acceptsMarriedStudents)}
              onChange={(e) => setField('acceptsMarriedStudents', e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-[#2D3748]">👰🤵 Accepts Married Students</span>
              <span className="mt-1 block text-xs text-[#A0AEC0]">
                Students with families/spouses can apply
              </span>
            </span>
          </label>
        </SectionCard>

        <SectionCard title="Amenities">
          <p className="mb-3 text-xs text-[#A0AEC0]">Tap a chip to select amenities offered with this property.</p>
          <AmenityChipScroller amenities={form.amenities} onToggle={setAmenity} />
        </SectionCard>

        <SectionCard title="Images">
          <div
            className={`rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
              dragOver ? 'border-[#E88D5B] bg-[#FFF5F0]' : 'border-[#E2E8F0] bg-[#FAFAFA]'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <p className="text-sm font-medium text-[#2D3748]">Drag and drop images here</p>
            <p className="mt-1 text-xs text-[#A0AEC0]">PNG, JPG up to 10 MB each · Max {MAX_PROPERTY_IMAGES} images</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-4 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#2D3748] transition hover:bg-[#FAFAFA] disabled:opacity-60"
            >
              {uploading ? 'Uploading…' : 'Browse files'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>
          <FieldError message={errors.images} />

          {form.images?.length ? (
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {form.images.map((path, index) => {
                const isPrimary = index === form.primaryImageIndex
                return (
                  <div key={`${path}-${index}`} className="relative overflow-hidden rounded-lg border border-[#E2E8F0]">
                    <img src={resolveMediaUrl(path)} alt="" className="h-28 w-full object-cover" />
                    {isPrimary ? (
                      <span className="absolute left-2 top-2 rounded-full bg-[#E88D5B] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Primary
                      </span>
                    ) : null}
                    <div className="flex gap-1 border-t border-[#E2E8F0] bg-white p-2">
                      {!isPrimary ? (
                        <button
                          type="button"
                          onClick={() => setField('primaryImageIndex', index)}
                          className="flex-1 rounded-full bg-[#F7FAFC] px-2 py-1 text-[10px] font-semibold text-[#2D3748]"
                        >
                          Set primary
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="rounded-full bg-[#FFF5F5] px-2 py-1 text-[10px] font-semibold text-[#E53E3E]"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </SectionCard>

        <SectionCard title="Availability">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="availableFrom">Available from</FieldLabel>
              <input
                id="availableFrom"
                type="date"
                className={inputClass(false)}
                value={form.availableFrom}
                onChange={(e) => setField('availableFrom', e.target.value)}
              />
            </div>

            <div>
              <FieldLabel htmlFor="minimumStay">Minimum stay</FieldLabel>
              <select
                id="minimumStay"
                className={inputClass(false)}
                value={form.minimumStay}
                onChange={(e) => setField('minimumStay', e.target.value)}
              >
                {MINIMUM_STAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </SectionCard>

        <div className="flex flex-wrap gap-3 pb-8">
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-full bg-[#E88D5B] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d97a48] disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Property'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-full border border-[#E2E8F0] bg-white px-6 py-2.5 text-sm font-semibold text-[#2D3748] transition hover:bg-[#FAFAFA] disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
