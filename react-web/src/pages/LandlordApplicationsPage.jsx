import { useEffect, useState } from 'react'
import LandlordLayout from '../components/LandlordLayout'
import { useToast } from '../context/ToastContext'
import { useLandlordGuard } from '../hooks/useLandlordGuard'
import ApplicantDetailsModal from '../components/landlord/ApplicantDetailsModal'
import ApprovalSuccessModal from '../components/landlord/ApprovalSuccessModal'
import ApproveModal from '../components/landlord/ApproveModal'
import RejectModal from '../components/landlord/RejectModal'
import { mergeApplicationsWithPropertyDeposits, resolveApplicationDeposit } from '../utils/propertyDeposit'
import { buildLandlordStatusUpdateBody } from '../utils/applicationStatusApi'
import Applications from './dashboard/Applications'

const LANDLORD_DEPOSIT_MIN = 100
const LANDLORD_DEPOSIT_MAX = 5000

export default function LandlordApplicationsPage() {
  const { user, loading: authLoading, error: authError } = useLandlordGuard()
  const { pushToast } = useToast()

  const [token, setToken] = useState('')
  const [applications, setApplications] = useState([])
  const [landlordProperties, setLandlordProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [applicationStatusSavingId, setApplicationStatusSavingId] = useState(null)
  const [markDepositSavingId, setMarkDepositSavingId] = useState(null)
  const [approveApp, setApproveApp] = useState(null)
  const [rejectApp, setRejectApp] = useState(null)
  const [detailsApp, setDetailsApp] = useState(null)
  const [approvalSuccess, setApprovalSuccess] = useState(null)

  useEffect(() => {
    const localToken = localStorage.getItem('mysewa_token')
    if (localToken) setToken(localToken)
  }, [])

  useEffect(() => {
    if (authError) pushToast({ message: authError, type: 'error', duration: 7000 })
  }, [authError, pushToast])

  useEffect(() => {
    if (!approveApp && !rejectApp) return
    function onKey(e) {
      if (e.key === 'Escape' && applicationStatusSavingId == null) {
        setApproveApp(null)
        setRejectApp(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [approveApp, rejectApp, applicationStatusSavingId])

  useEffect(() => {
    if (!detailsApp) return
    function onKey(e) {
      if (e.key === 'Escape') setDetailsApp(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detailsApp])

  async function loadApplications() {
    if (!token || !user?.id) return
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [appRes, propRes] = await Promise.all([
        fetch('/api/v1/applications/for-landlord', { headers }),
        fetch('/api/v1/properties', { headers }),
      ])
      const data = await appRes.json().catch(() => ({}))
      const propData = await propRes.json().catch(() => ({}))
      if (!appRes.ok) throw new Error(data.message || `Failed to load applications (HTTP ${appRes.status})`)

      const items = Array.isArray(data.items) ? data.items : []
      const allProperties = Array.isArray(propData.items) ? propData.items : []
      const mine = allProperties.filter((item) => Number(item.landlordId) === Number(user.id))

      setLandlordProperties(mine)
      setApplications(mergeApplicationsWithPropertyDeposits(items, mine))
    } catch (e) {
      setApplications([])
      pushToast({ message: e.message || 'Unable to load applications.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  function applyApplicationPatch(item) {
    if (!item?.id) return
    setApplications((prev) =>
      mergeApplicationsWithPropertyDeposits(
        prev.map((x) => (Number(x.id) === Number(item.id) ? { ...x, ...item } : x)),
        landlordProperties,
      ),
    )
    setDetailsApp((prev) => (prev && Number(prev.id) === Number(item.id) ? { ...prev, ...item } : prev))
  }

  useEffect(() => {
    if (user?.id && token) loadApplications()
  }, [user?.id, token])

  async function updateApplicationStatus(applicationId, status, { depositAmount, message } = {}) {
    if (!token) return { ok: false }
    setApplicationStatusSavingId(applicationId)
    try {
      const body = buildLandlordStatusUpdateBody(status, { depositAmount, message })
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
          data.message || (raw && raw.length < 400 ? raw : null) || `Update failed (HTTP ${res.status})`,
        )
      }
      const item = data.item
      if (item && item.id != null) {
        applyApplicationPatch(item)
      }
      if (status === 'accepted') {
        const approvedApp = item && item.id != null ? item : applications.find((x) => Number(x.id) === Number(applicationId))
        const deposit =
          depositAmount != null && Number.isFinite(Number(depositAmount))
            ? Number(depositAmount)
            : resolveApplicationDeposit(approvedApp)
        setApprovalSuccess({ app: approvedApp, depositAmount: deposit })
      }
      return { ok: true, item }
    } catch (e) {
      pushToast({ message: e.message || 'Could not update application status.', type: 'error' })
      return { ok: false }
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
        applyApplicationPatch(item)
      }
      pushToast({ message: 'Deposit marked as paid.', type: 'success' })
    } catch (e) {
      pushToast({ message: e.message || 'Could not mark deposit paid.', type: 'error' })
    } finally {
      setMarkDepositSavingId(null)
    }
  }

  function openApprove(app) {
    setRejectApp(null)
    setApproveApp(app)
  }

  function openReject(app) {
    setApproveApp(null)
    setRejectApp(app)
  }

  async function submitApprove({ message, depositAmount }) {
    if (!approveApp) return
    const amt = depositAmount != null ? Number(depositAmount) : null
    if (amt != null && (amt < LANDLORD_DEPOSIT_MIN || amt > LANDLORD_DEPOSIT_MAX)) {
      pushToast({
        message: `Property deposit must be between RM ${LANDLORD_DEPOSIT_MIN} and RM ${LANDLORD_DEPOSIT_MAX}.`,
        type: 'error',
      })
      return
    }
    const result = await updateApplicationStatus(approveApp.id, 'accepted', {
      depositAmount: amt,
      message,
    })
    if (result?.ok) {
      setApproveApp(null)
      pushToast({ message: '✅ Application approved! Student notified.', type: 'success' })
    }
  }

  async function submitReject({ message }) {
    if (!rejectApp) return
    const result = await updateApplicationStatus(rejectApp.id, 'rejected', { message })
    if (result?.ok) {
      setRejectApp(null)
      pushToast({ message: '❌ Application rejected. Student notified.', type: 'success' })
    }
  }

  if (authLoading) {
    return (
      <LandlordLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA] font-sans text-[#2D3748]">
          <p className="text-sm font-medium">Loading applications…</p>
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
      <Applications
        applications={applications}
        loading={loading}
        savingId={applicationStatusSavingId}
        onApprove={openApprove}
        onReject={openReject}
        onViewDetails={setDetailsApp}
      />

      {approveApp ? (
        <ApproveModal
          application={approveApp}
          saving={applicationStatusSavingId === approveApp.id}
          onClose={() => setApproveApp(null)}
          onConfirm={submitApprove}
        />
      ) : null}

      {rejectApp ? (
        <RejectModal
          application={rejectApp}
          saving={applicationStatusSavingId === rejectApp.id}
          onClose={() => setRejectApp(null)}
          onConfirm={submitReject}
        />
      ) : null}

      {approvalSuccess ? (
        <ApprovalSuccessModal
          application={approvalSuccess.app}
          depositAmount={approvalSuccess.depositAmount}
          onClose={() => setApprovalSuccess(null)}
        />
      ) : null}

      {detailsApp ? (
        <ApplicantDetailsModal
          application={detailsApp}
          onClose={() => setDetailsApp(null)}
          onApprove={openApprove}
          onReject={openReject}
          onMarkDepositPaid={landlordMarkDepositPaid}
          saving={applicationStatusSavingId === detailsApp.id}
          markDepositSaving={markDepositSavingId === detailsApp.id}
        />
      ) : null}
    </LandlordLayout>
  )
}
