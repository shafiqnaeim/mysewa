import { useEffect, useMemo, useState } from 'react'
import LandlordLayout from '../components/LandlordLayout'
import { useLandlordGuard } from '../hooks/useLandlordGuard'
import { useToast } from '../context/ToastContext'
import {
  apiSlotForUi,
  clearIcVerification,
  confirmIcVerification,
  fetchMyVerificationStatus,
  resolveUploadUrl,
  submitVerificationForReview,
  uploadVerificationDocument,
} from '../services/verificationApi'
import {
  clearVerificationDocs,
  computeUploadProgress,
  getDefaultFileName,
  readVerificationDocs,
  removeVerificationDoc,
  saveVerificationDoc,
} from '../utils/landlordVerificationStorage'
import {
  getDocumentVerificationState,
  VERIFICATION_STATUS_LABELS,
} from '../utils/verificationStatus'
import LandlordVerification from './dashboard/LandlordVerification'

export default function LandlordVerificationPage() {
  const { user, loading, error } = useLandlordGuard()
  const { pushToast } = useToast()

  const [icConfirmed, setIcConfirmed] = useState(false)
  const [grantUrl, setGrantUrl] = useState('')
  const [selfieUrl, setSelfieUrl] = useState('')
  const [fileMeta, setFileMeta] = useState({})
  const [submittedAt, setSubmittedAt] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [docStatus, setDocStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploadingSlot, setUploadingSlot] = useState(null)
  const [icProcessing, setIcProcessing] = useState(false)
  const [confirmedIc, setConfirmedIc] = useState('')

  const verificationState = useMemo(
    () => getDocumentVerificationState(docStatus || user?.documentVerificationStatus),
    [docStatus, user?.documentVerificationStatus],
  )

  const verificationLabel = VERIFICATION_STATUS_LABELS[verificationState] || VERIFICATION_STATUS_LABELS.not_submitted

  const { steps, percent } = useMemo(
    () => computeUploadProgress({ icConfirmed, grantUrl, selfieUrl, submittedAt }),
    [icConfirmed, grantUrl, selfieUrl, submittedAt],
  )

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    async function loadDocs() {
      const local = readVerificationDocs(user.id)
      if (!cancelled) {
        setGrantUrl(local.grantUrl)
        setSelfieUrl(local.selfieUrl)
        setFileMeta(local.meta || {})
        setSubmittedAt(local.submittedAt)
      }
      try {
        const remote = await fetchMyVerificationStatus()
        if (cancelled) return
        setIcConfirmed(Boolean(remote.icConfirmed))
        if (remote.icConfirmed && user?.icNumber) {
          setConfirmedIc(user.icNumber)
        }
        setDocStatus(remote.documentVerificationStatus || '')
        setRejectionReason(remote.rejectionReason || '')
        const docs = remote.documents || {}
        if (docs.grantUrl) setGrantUrl(resolveUploadUrl(docs.grantUrl))
        if (docs.selfieUrl) setSelfieUrl(resolveUploadUrl(docs.selfieUrl))
        if (remote.submittedAt) setSubmittedAt(remote.submittedAt)
      } catch {
        /* keep local fallback */
      }
    }

    void loadDocs()
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.icNumber])

  async function handleDocumentUpload(slot, file) {
    if (!user?.id || !file) return
    if (!file.type.startsWith('image/')) {
      pushToast({ message: 'Please choose a JPG or PNG image.', type: 'error' })
      return
    }
    setUploadingSlot(slot)
    try {
      const uploaded = await uploadVerificationDocument(apiSlotForUi(slot), file)
      const url = resolveUploadUrl(uploaded.url)
      const meta = {
        fileName: file.name || getDefaultFileName(slot),
        size: file.size,
        uploadedAt: uploaded.uploadedAt || new Date().toISOString(),
      }
      saveVerificationDoc(user.id, slot, url, meta)
      if (slot === 'matric') setGrantUrl(url)
      else setSelfieUrl(url)
      setFileMeta((prev) => ({ ...prev, [slot]: meta }))
      setSubmittedAt(null)
      setRejectionReason('')
      pushToast({ message: 'Document uploaded.', type: 'success' })
    } catch (err) {
      pushToast({ message: err.message || 'Upload failed.', type: 'error' })
    } finally {
      setUploadingSlot(null)
    }
  }

  function handleDocumentClear(slot) {
    if (!user?.id || slot === 'ic') return
    removeVerificationDoc(user.id, slot)
    if (slot === 'matric') setGrantUrl('')
    else setSelfieUrl('')
    setFileMeta((prev) => {
      const next = { ...prev }
      delete next[slot]
      return next
    })
    setSubmittedAt(null)
  }

  async function handleIcConfirmed({ icNumber, extractedName }) {
    const result = await confirmIcVerification(icNumber, extractedName || '')
    setIcConfirmed(true)
    setConfirmedIc(result.icNumber || icNumber)
    setSubmittedAt(null)
    setRejectionReason('')
    removeVerificationDoc(user.id, 'ic')
    pushToast({ message: 'IC number saved securely.', type: 'success' })
  }

  async function handleIcClear() {
    try {
      await clearIcVerification()
    } catch {
      /* ignore */
    }
    setIcConfirmed(false)
    setConfirmedIc('')
    removeVerificationDoc(user.id, 'ic')
  }

  async function handleClearAll() {
    if (!user?.id) return
    if (!window.confirm('Clear all uploaded verification files?')) return
    try {
      await clearIcVerification()
    } catch {
      /* ignore */
    }
    clearVerificationDocs(user.id)
    setIcConfirmed(false)
    setConfirmedIc('')
    setGrantUrl('')
    setSelfieUrl('')
    setFileMeta({})
    setSubmittedAt(null)
    setRejectionReason('')
    pushToast({ message: 'All verification files cleared.', type: 'success' })
  }

  async function handleSubmit() {
    if (!user?.id) return
    if (!icConfirmed || !grantUrl || !selfieUrl) {
      pushToast({ message: 'Confirm your IC and upload grant receipt and selfie before submitting.', type: 'error' })
      return
    }
    setSubmitting(true)
    try {
      const result = await submitVerificationForReview()
      const submitted = result.submittedAt || new Date().toISOString()
      setSubmittedAt(submitted)
      setDocStatus('pending_review')
      setRejectionReason('')
      pushToast({
        message: 'Your verification documents have been submitted for review.',
        type: 'success',
        duration: 6000,
      })
    } catch (err) {
      pushToast({ message: err.message || 'Could not submit documents.', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <LandlordLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA]">
          <p className="text-sm text-[#4A5568]">Loading…</p>
        </div>
      </LandlordLayout>
    )
  }

  if (error) {
    return (
      <LandlordLayout>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Error: {error}
          </div>
        </div>
      </LandlordLayout>
    )
  }

  return (
    <LandlordLayout>
      <LandlordVerification
        verificationState={verificationState}
        verificationLabel={verificationLabel}
        rejectionReason={rejectionReason}
        progressSteps={verificationState === 'verified' ? 4 : steps}
        progressPercent={verificationState === 'verified' ? 100 : percent}
        icConfirmed={icConfirmed}
        registeredName={user?.fullName || ''}
        registeredIc={confirmedIc || user?.icNumber || ''}
        grantUrl={grantUrl}
        selfieUrl={selfieUrl}
        fileMeta={fileMeta}
        submittedAt={submittedAt}
        submitting={submitting || uploadingSlot != null}
        icProcessing={icProcessing}
        onIcProcessingChange={setIcProcessing}
        onDocumentUpload={handleDocumentUpload}
        onDocumentClear={handleDocumentClear}
        onIcConfirmed={handleIcConfirmed}
        onIcClear={handleIcClear}
        onSubmit={handleSubmit}
        onClearAll={handleClearAll}
      />
    </LandlordLayout>
  )
}
