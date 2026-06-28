import { useEffect, useMemo, useRef, useState } from 'react'
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
import LandlordVerification from './dashboard/LandlordVerification'

const VERIFICATION_STATE_LABEL = {
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
}

function getVerificationState(raw) {
  const s = String(raw || '').trim()
  if (!s) return 'pending'
  const u = s.toUpperCase()
  if (u.includes('VERIF') && !u.includes('UNVER')) return 'verified'
  if (u.includes('REJECT') || u.includes('FAIL') || u.includes('INVALID')) return 'rejected'
  return 'pending'
}

export default function LandlordVerificationPage() {
  const { user, loading, error } = useLandlordGuard()
  const { pushToast } = useToast()

  const grantInputRef = useRef(null)
  const selfieInputRef = useRef(null)

  const [icConfirmed, setIcConfirmed] = useState(false)
  const [grantUrl, setGrantUrl] = useState('')
  const [selfieUrl, setSelfieUrl] = useState('')
  const [fileMeta, setFileMeta] = useState({})
  const [submittedAt, setSubmittedAt] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingSlot, setUploadingSlot] = useState(null)

  const verificationState = useMemo(
    () => getVerificationState(user?.documentVerificationStatus),
    [user?.documentVerificationStatus],
  )

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
  }, [user?.id])

  function triggerFileInput(slot) {
    if (slot === 'matric') grantInputRef.current?.click()
    else selfieInputRef.current?.click()
  }

  async function onChooseFile(slot, e) {
    if (!user?.id || slot === 'ic') return
    if (!e?.target?.files) {
      triggerFileInput(slot)
      return
    }
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      pushToast({ message: 'Please choose an image file.', type: 'error' })
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
      pushToast({ message: 'Document uploaded.', type: 'success' })
    } catch (err) {
      pushToast({ message: err.message || 'Upload failed.', type: 'error' })
    } finally {
      setUploadingSlot(null)
      e.target.value = ''
    }
  }

  async function handleIcConfirmed({ icNumber, extractedName }) {
    await confirmIcVerification(icNumber, extractedName || '')
    setIcConfirmed(true)
    setSubmittedAt(null)
    removeVerificationDoc(user.id, 'ic')
    pushToast({ message: 'IC verified and saved securely.', type: 'success' })
  }

  async function handleIcClear() {
    try {
      await clearIcVerification()
    } catch {
      /* local clear still applies */
    }
    setIcConfirmed(false)
    removeVerificationDoc(user.id, 'ic')
  }

  function handleRemoveFile(slot) {
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
    if (slot === 'matric' && grantInputRef.current) grantInputRef.current.value = ''
    if (slot === 'selfie' && selfieInputRef.current) selfieInputRef.current.value = ''
    pushToast({ message: 'File removed.', type: 'success' })
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
    setGrantUrl('')
    setSelfieUrl('')
    setFileMeta({})
    setSubmittedAt(null)
    if (grantInputRef.current) grantInputRef.current.value = ''
    if (selfieInputRef.current) selfieInputRef.current.value = ''
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
      pushToast({
        message:
          'Documents submitted for review. MySewa will verify your identity — you will be notified when approved.',
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
        verificationLabel={VERIFICATION_STATE_LABEL[verificationState] || 'Pending'}
        progressSteps={verificationState === 'verified' ? 4 : steps}
        progressPercent={verificationState === 'verified' ? 100 : percent}
        icConfirmed={icConfirmed}
        registeredName={user?.fullName || ''}
        registeredIc={user?.icNumber || ''}
        grantUrl={grantUrl}
        selfieUrl={selfieUrl}
        fileMeta={fileMeta}
        submittedAt={submittedAt}
        submitting={submitting || uploadingSlot != null}
        grantInputRef={grantInputRef}
        selfieInputRef={selfieInputRef}
        onChooseFile={onChooseFile}
        onIcConfirmed={handleIcConfirmed}
        onIcClear={handleIcClear}
        onRemoveFile={handleRemoveFile}
        onSubmit={handleSubmit}
        onClearAll={handleClearAll}
      />
    </LandlordLayout>
  )
}
