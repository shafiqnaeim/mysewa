import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import LandlordLayout from '../../components/LandlordLayout'
import DeletePropertyConfirmModal from '../../components/DeletePropertyConfirmModal'
import DeleteError from '../../components/errors/DeleteError'
import ErrorToast from '../../components/errors/ErrorToast'
import LoadingSkeleton from '../../components/errors/LoadingSkeleton'
import NetworkError from '../../components/errors/NetworkError'
import PropertyNotFound from '../../components/errors/PropertyNotFound'
import UnauthorizedError from '../../components/errors/UnauthorizedError'
import { useToast } from '../../context/ToastContext'
import { useLandlordGuard } from '../../hooks/useLandlordGuard'
import LandlordPropertyDetail from '../dashboard/LandlordPropertyDetail'

/**
 * Landlord property detail page with structured error handling.
 * Route: /dashboard/landlord/properties/:propertyId
 */
export default function PropertyDetail() {
  const { propertyId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading, error: authError } = useLandlordGuard()
  const { pushToast } = useToast()

  const [token, setToken] = useState('')
  const [property, setProperty] = useState(null)
  const [pageState, setPageState] = useState('loading')
  const [toastMessage, setToastMessage] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const id = Number(propertyId)

  const goToProperties = useCallback(() => {
    navigate('/dashboard/landlord/properties')
  }, [navigate])

  const goBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  useEffect(() => {
    const localToken = localStorage.getItem('mysewa_token')
    if (localToken) setToken(localToken)
  }, [])

  useEffect(() => {
    if (authError) pushToast({ message: authError, type: 'error', duration: 7000 })
  }, [authError, pushToast])

  const loadProperty = useCallback(async () => {
    if (!Number.isFinite(id) || id <= 0) {
      setPageState('not_found')
      return
    }
    if (!user?.id) return

    setPageState('loading')
    setToastMessage('')

    let res
    try {
      res = await fetch(`/api/v1/properties/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    } catch {
      setPageState('network')
      setToastMessage('Error loading property details')
      return
    }

    let data = {}
    try {
      data = await res.json()
    } catch {
      data = {}
    }

    if (res.status === 404) {
      setPageState('not_found')
      return
    }

    if (!res.ok) {
      setPageState('network')
      setToastMessage(data.message || 'Error loading property details')
      return
    }

    const item = data.item || data
    if (Number(item.landlordId) !== Number(user.id)) {
      setPageState('unauthorized')
      return
    }

    setProperty(item)
    setPageState('ready')
  }, [id, user?.id, token])

  useEffect(() => {
    if (authLoading) return
    if (!user?.id) return
    loadProperty()
  }, [authLoading, user?.id, loadProperty])

  async function confirmDelete() {
    if (!property) return
    setDeleting(true)
    setDeleteFailed(false)
    try {
      const res = await fetch(`/api/v1/properties/${property.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Delete failed (HTTP ${res.status})`)
      pushToast({ message: 'Property deleted.', type: 'success' })
      navigate('/dashboard/landlord/properties', { replace: true })
    } catch (e) {
      setDeleteOpen(false)
      setDeleteFailed(true)
      pushToast({ message: e.message || 'Unable to delete property.', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  function renderBody() {
    if (authLoading || pageState === 'loading') {
      return <LoadingSkeleton variant="property-detail" />
    }

    if (pageState === 'not_found') {
      return (
        <div className="flex min-h-[50vh] items-center justify-center px-4 py-12">
          <PropertyNotFound onBack={goToProperties} />
        </div>
      )
    }

    if (pageState === 'unauthorized') {
      return (
        <div className="flex min-h-[50vh] items-center justify-center px-4 py-12">
          <UnauthorizedError onGoBack={goBack} />
        </div>
      )
    }

    if (pageState === 'network') {
      return (
        <div className="flex min-h-[50vh] items-center justify-center px-4 py-12">
          <NetworkError onRetry={loadProperty} />
        </div>
      )
    }

    if (!property) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center px-4 py-12">
          <PropertyNotFound onBack={goToProperties} />
        </div>
      )
    }

    return (
      <LandlordPropertyDetail
        property={property}
        token={token}
        onEdit={(item) => navigate(`/dashboard/landlord/properties/${item.id}/edit`)}
        onDelete={() => {
          setDeleteFailed(false)
          setDeleteOpen(true)
        }}
      />
    )
  }

  return (
    <LandlordLayout>
      {toastMessage ? (
        <ErrorToast message={toastMessage} onClose={() => setToastMessage('')} duration={5000} />
      ) : null}

      {renderBody()}

      {deleteOpen && property ? (
        <DeletePropertyConfirmModal
          propertyName={property.name || 'Untitled property'}
          deleting={deleting}
          onCancel={() => !deleting && setDeleteOpen(false)}
          onConfirm={confirmDelete}
        />
      ) : null}

      {deleteFailed ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
          <DeleteError
            onRetry={() => {
              setDeleteFailed(false)
              setDeleteOpen(true)
            }}
            onCancel={() => setDeleteFailed(false)}
          />
        </div>
      ) : null}
    </LandlordLayout>
  )
}
