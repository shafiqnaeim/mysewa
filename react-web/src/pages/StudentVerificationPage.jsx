import { useEffect, useMemo, useState } from 'react'
import StudentLayout from '../components/StudentLayout'
import { useStudentGuard } from '../hooks/useStudentGuard'
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
  readVerificationDocs,
  saveVerificationDoc,
} from '../utils/studentVerificationStorage'
import {
  getDocumentVerificationState,
  VERIFICATION_STATUS_LABELS,
} from '../utils/verificationStatus'
import StudentVerification from './dashboard/StudentVerification'

export default function StudentVerificationPage() {
  const { user, loading, error } = useStudentGuard()
  const { pushToast } = useToast()

  const [icConfirmed, setIcConfirmed] = useState(false)
  const [matricUrl, setMatricUrl] = useState('')
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
    () => computeUploadProgress({ icConfirmed, matricUrl, selfieUrl, submittedAt }),
    [icConfirmed, matricUrl, selfieUrl, submittedAt],
  )

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    async function loadDocs() {
      const local = readVerificationDocs(user.id)
      if (!cancelled) {
        setMatricUrl(local.matricUrl)
        setSelfieUrl(local.selfieUrl)
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
        if (docs.grantUrl) setMatricUrl(resolveUploadUrl(docs.grantUrl))
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
      const meta = { fileName: file.name, size: file.size }
      saveVerificationDoc(user.id, slot, url)
      if (slot === 'matric') setMatricUrl(url)
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
    if (!user?.id) return
    if (slot === 'matric') setMatricUrl('')
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
  }

  function handleClearAll() {
    if (!user?.id) return
    if (!window.confirm('Clear all uploaded verification files?')) return
    clearVerificationDocs(user.id)
    setIcConfirmed(false)
    setConfirmedIc('')
    setMatricUrl('')
    setSelfieUrl('')
    setFileMeta({})
    setSubmittedAt(null)
    setRejectionReason('')
    pushToast({ message: 'All verification files cleared.', type: 'success' })
  }

  async function handleSubmit() {
    if (!user?.id) return
    if (!icConfirmed || !matricUrl || !selfieUrl) {
      pushToast({ message: 'Confirm your IC and upload matric card and selfie before submitting.', type: 'error' })
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
      <StudentLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA]">
          <p className="text-sm text-[#6B7280]">Loading…</p>
        </div>
      </StudentLayout>
    )
  }

  if (error) {
    return (
      <StudentLayout>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Error: {error}
          </div>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <StudentVerification
        verificationState={verificationState}
        verificationLabel={verificationLabel}
        rejectionReason={rejectionReason}
        progressSteps={verificationState === 'verified' ? 4 : steps}
        progressPercent={verificationState === 'verified' ? 100 : percent}
        icConfirmed={icConfirmed}
        registeredName={user?.fullName || ''}
        registeredIc={confirmedIc || user?.icNumber || ''}
        matricUrl={matricUrl}
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
    </StudentLayout>
  )
}
