import { useCallback, useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { useAdminGuard } from '../hooks/useAdminGuard'
import { useToast } from '../context/ToastContext'
import {
  approveVerification,
  fetchPendingVerifications,
  fetchVerificationDetail,
  rejectVerification,
} from '../services/verificationApi'
import AdminVerification from './dashboard/AdminVerification'

export default function AdminVerificationPage() {
  const { loading, error, token } = useAdminGuard()
  const { pushToast } = useToast()

  const [users, setUsers] = useState([])
  const [pendingCount, setPendingCount] = useState(0)
  const [listLoading, setListLoading] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const loadPending = useCallback(async () => {
    if (!token) return
    setListLoading(true)
    try {
      const data = await fetchPendingVerifications(token)
      const items = Array.isArray(data.items) ? data.items : []
      setUsers(items)
      setPendingCount(Number(data.count) || items.length)
    } catch (e) {
      setUsers([])
      setPendingCount(0)
      pushToast({ message: e.message || 'Could not load verifications.', type: 'error' })
    } finally {
      setListLoading(false)
    }
  }, [token, pushToast])

  useEffect(() => {
    if (token) void loadPending()
  }, [token, loadPending])

  async function handleView(user) {
    if (!token || !user?.id) return
    setSelectedId(user.id)
    setSelectedUser(user)
    setRejectionReason('')
    setDetailLoading(true)
    try {
      const detail = await fetchVerificationDetail(token, user.id)
      setSelectedUser(detail)
    } catch (e) {
      pushToast({ message: e.message || 'Could not load verification details.', type: 'error' })
    } finally {
      setDetailLoading(false)
    }
  }

  function handleCloseDetail() {
    if (saving) return
    setSelectedId(null)
    setSelectedUser(null)
    setRejectionReason('')
  }

  async function handleApprove() {
    if (!token || !selectedId) return
    setSaving(true)
    try {
      await approveVerification(token, selectedId)
      pushToast({ message: `${selectedUser?.fullName || 'User'} verified.`, type: 'success' })
      setSelectedId(null)
      setSelectedUser(null)
      setRejectionReason('')
      await loadPending()
    } catch (e) {
      pushToast({ message: e.message || 'Could not approve user.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleReject() {
    if (!token || !selectedId) return
    setSaving(true)
    try {
      await rejectVerification(token, selectedId, rejectionReason)
      pushToast({
        message: `${selectedUser?.fullName || 'User'} rejected.${rejectionReason.trim() ? ` Reason: ${rejectionReason.trim()}` : ''}`,
        type: 'info',
        duration: 5000,
      })
      setSelectedId(null)
      setSelectedUser(null)
      setRejectionReason('')
      await loadPending()
    } catch (e) {
      pushToast({ message: e.message || 'Could not reject user.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#F7FAFC]">
          <p className="text-sm text-[#A0AEC0]">Verifying privileges…</p>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <AdminVerification
        pendingCount={pendingCount}
        users={users}
        loading={listLoading}
        selectedUser={selectedUser}
        detailLoading={detailLoading}
        saving={saving}
        rejectionReason={rejectionReason}
        onView={handleView}
        onCloseDetail={handleCloseDetail}
        onRejectionReasonChange={setRejectionReason}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </AdminLayout>
  )
}
