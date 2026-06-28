import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LandlordLayout from '../components/LandlordLayout'
import DeletePropertyConfirmModal from '../components/DeletePropertyConfirmModal'
import { useToast } from '../context/ToastContext'
import { useLandlordGuard } from '../hooks/useLandlordGuard'
import MyProperties from './dashboard/MyProperties'

export default function LandlordMyPropertiesPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, error: authError } = useLandlordGuard()
  const { pushToast } = useToast()

  const [token, setToken] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const localToken = localStorage.getItem('mysewa_token')
    if (localToken) setToken(localToken)
  }, [])

  useEffect(() => {
    if (authError) pushToast({ message: authError, type: 'error', duration: 7000 })
  }, [authError, pushToast])

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
    if (user?.id) loadProperties(user.id)
  }, [user?.id])

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
      await loadProperties(user.id)
    } catch (e) {
      pushToast({ message: e.message || 'Unable to delete property.', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  if (authLoading) {
    return (
      <LandlordLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA] font-sans text-[#2D3748]">
          <p className="text-sm font-medium">Loading your properties…</p>
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
      <MyProperties
        properties={items}
        loading={loading}
        onAdd={() => navigate('/dashboard/landlord/properties/new')}
        onView={(item) => navigate(`/dashboard/landlord/properties/${item.id}`)}
        onEdit={(item) => navigate(`/dashboard/landlord/properties/${item.id}/edit`)}
        onDelete={requestDelete}
      />

      {deleteTarget ? (
        <DeletePropertyConfirmModal
          propertyName={deleteTarget.name}
          deleting={deleting}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </LandlordLayout>
  )
}
