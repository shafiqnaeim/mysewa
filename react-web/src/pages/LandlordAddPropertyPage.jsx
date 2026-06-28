import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import LandlordLayout from '../components/LandlordLayout'
import { useToast } from '../context/ToastContext'
import { useLandlordGuard } from '../hooks/useLandlordGuard'
import {
  resolvePropertyLocationByRoad,
} from '../utils/propertyLocation'
import AddProperty, {
  EMPTY_PROPERTY_FORM,
  MAX_PROPERTY_IMAGES,
  amenitiesFromApi,
  buildPropertyApiPayload,
  parseRentalStyleMeta,
  paymentMethodsFromApi,
  tenantPreferencesFromApi,
} from './dashboard/AddProperty'

function propertyToForm(item) {
  const meta = parseRentalStyleMeta(item.rentalStyle)
  const images = (() => {
    if (!item.images) return []
    try {
      const parsed = JSON.parse(item.images)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return [String(item.images)]
    }
  })()

  const prefs = tenantPreferencesFromApi(item)

  return {
    title: item.name || '',
    description: item.description || '',
    type: item.type || '',
    address: item.location || '',
    city: item.city || '',
    state: item.state || 'Terengganu',
    postcode: item.postcode || '',
    latitude: item.latitude != null ? String(item.latitude) : '',
    longitude: item.longitude != null ? String(item.longitude) : '',
    contactPhone: item.contactPhone || '',
    contactEmail: item.contactEmail || '',
    price: item.price != null ? String(item.price) : '',
    deposit:
      item.deposit != null
        ? String(item.deposit)
        : meta.deposit,
    paymentMethods: paymentMethodsFromApi(item.paymentMethods),
    bankName: item.bankName || '',
    accountNumber: item.accountNumber || '',
    accountHolder: item.accountHolder || '',
    qrCodeUrl: item.qrCodeUrl || '',
    paymentDueDate: item.paymentDueDate || '1st of every month',
    bedrooms: meta.bedrooms,
    bathrooms: meta.bathrooms,
    maxPersons: item.capacity != null ? String(item.capacity) : '',
    amenities: amenitiesFromApi(item.amenities),
    images,
    primaryImageIndex: 0,
    availableFrom: meta.availableFrom,
    minimumStay: meta.minimumStay,
    gender: prefs.gender,
    religion: prefs.religion,
    race: prefs.race,
    acceptsMarriedStudents: Boolean(item.acceptsMarriedHousehold),
  }
}

export default function LandlordAddPropertyPage() {
  const { propertyId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading, error: authError } = useLandlordGuard()
  const { pushToast } = useToast()

  const editingId = propertyId ? Number(propertyId) : null
  const isEdit = Number.isFinite(editingId) && editingId > 0

  const [token, setToken] = useState('')
  const [initialValues, setInitialValues] = useState(EMPTY_PROPERTY_FORM)
  const [loadingProperty, setLoadingProperty] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const localToken = localStorage.getItem('mysewa_token')
    if (localToken) setToken(localToken)
  }, [])

  useEffect(() => {
    if (authError) pushToast({ message: authError, type: 'error', duration: 7000 })
  }, [authError, pushToast])

  useEffect(() => {
    if (!isEdit || !user?.id || !token) return
    let cancelled = false

    async function loadProperty() {
      setLoadingProperty(true)
      try {
        const res = await fetch(`/api/v1/properties/${editingId}`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.message || `Failed to load property (HTTP ${res.status})`)
        const item = data.item || data
        if (Number(item.landlordId) !== Number(user.id)) {
          throw new Error('You can only edit your own properties.')
        }
        if (!cancelled) setInitialValues(propertyToForm(item))
      } catch (e) {
        if (!cancelled) {
          pushToast({ message: e.message || 'Unable to load property.', type: 'error' })
          navigate('/dashboard/landlord/properties', { replace: true })
        }
      } finally {
        if (!cancelled) setLoadingProperty(false)
      }
    }

    loadProperty()
    return () => {
      cancelled = true
    }
  }, [isEdit, editingId, user?.id, token, navigate, pushToast])

  const resetKey = useMemo(() => {
    if (loadingProperty) return 'loading'
    if (isEdit) return `edit-${editingId}`
    return `new-${user?.id || 'pending'}`
  }, [loadingProperty, isEdit, editingId, user?.id])

  const formInitialValues = useMemo(() => {
    if (isEdit) return initialValues
    return {
      ...EMPTY_PROPERTY_FORM,
      contactPhone: user?.phoneNumber || '',
      contactEmail: user?.email || '',
    }
  }, [isEdit, initialValues, user?.phoneNumber, user?.email])

  const uploadImages = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || [])
      if (!files.length) return []

      setUploading(true)
      const uploaded = []

      try {
        if (!token) throw new Error('Please sign in again to upload photos.')

        for (const file of files) {
          if (!file.type.startsWith('image/')) {
            throw new Error(`"${file.name}" is not an image file.`)
          }
          if (file.size > 10 * 1024 * 1024) {
            throw new Error(`"${file.name}" is too large. Maximum size is 10 MB.`)
          }

          const formData = new FormData()
          formData.append('images', file)
          const res = await fetch('/api/v1/properties/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(data.message || `Upload failed for "${file.name}"`)
          if (Array.isArray(data.files)) uploaded.push(...data.files)
        }

        if (uploaded.length) {
          pushToast({
            message: uploaded.length === 1 ? 'Image uploaded.' : `${uploaded.length} images uploaded.`,
            type: 'success',
          })
        }
        return uploaded
      } catch (e) {
        pushToast({ message: e.message || 'Unable to upload images.', type: 'error' })
        return uploaded
      } finally {
        setUploading(false)
      }
    },
    [token, pushToast],
  )

  async function handleSave(form) {
    setSaving(true)
    try {
      if (!user) throw new Error('Please wait for your profile to load.')
      if (!token) throw new Error('Please sign in again.')

      const lat = form.latitude === '' || form.latitude == null ? NaN : Number(form.latitude)
      const lng = form.longitude === '' || form.longitude == null ? NaN : Number(form.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error('Please pin the property location on the map.')
      }

      const resolved = await resolvePropertyLocationByRoad(lat, lng)
      const payload = buildPropertyApiPayload(
        { ...form, latitude: lat, longitude: lng },
        {
          campus: resolved.campus,
          distance: resolved.distance,
          campusDistances: resolved.campusDistances,
          latitude: lat,
          longitude: lng,
        },
      )

      const method = isEdit ? 'PUT' : 'POST'
      const url = isEdit ? `/api/v1/properties/${editingId}` : '/api/v1/properties'
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Save failed (HTTP ${res.status})`)

      pushToast({
        message: isEdit ? 'Property updated successfully.' : 'Property created successfully.',
        type: 'success',
      })
      navigate('/dashboard/landlord/properties')
    } catch (e) {
      pushToast({ message: e.message || 'Unable to save property.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loadingProperty) {
    return (
      <LandlordLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA] font-sans text-[#2D3748]">
          <p className="text-sm font-medium">{loadingProperty ? 'Loading property…' : 'Loading…'}</p>
        </div>
      </LandlordLayout>
    )
  }

  if (authError) {
    return (
      <LandlordLayout>
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Error: {authError}
          </div>
        </div>
      </LandlordLayout>
    )
  }

  return (
    <LandlordLayout>
      <AddProperty
        resetKey={resetKey}
        initialValues={formInitialValues}
        mode={isEdit ? 'edit' : 'create'}
        saving={saving}
        uploading={uploading}
        onSubmit={handleSave}
        onCancel={() => navigate('/dashboard/landlord/properties')}
        onUploadImages={uploadImages}
      />
    </LandlordLayout>
  )
}
