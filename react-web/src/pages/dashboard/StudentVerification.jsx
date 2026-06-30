import VerificationUpload from '../../components/VerificationUpload'
import {
  VERIFICATION_STATUS_LABELS,
  verificationStatusClass,
} from '../../utils/verificationStatus'

function ProgressDots({ steps, activeColor = '#6C2BD9' }) {
  const dots = [0, 1, 2, 3]
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-sm" aria-hidden="true">
      {dots.map((i) => (
        <span key={i} style={{ color: i < steps ? activeColor : '#D1D5DB' }}>
          {i < steps ? '●' : '○'}
        </span>
      ))}
    </span>
  )
}

const DOCUMENTS = [
  {
    key: 'ic',
    emoji: '🪪',
    title: 'Identity Card',
    description: 'Photo of the front of your Identity Card',
  },
  {
    key: 'matric',
    emoji: '🎓',
    title: 'University Matric Card',
    description: 'Photo of the front of your University Matric Card',
  },
  {
    key: 'selfie',
    emoji: '📸',
    title: 'Selfie',
    description: 'Take a selfie just yourself or with any of the cards',
  },
]

const ACCENT = '#6C2BD9'

function VerificationStepChips({ icConfirmed, matricUrl, selfieUrl }) {
  const steps = [
    { key: 'ic', done: icConfirmed, label: 'IC' },
    { key: 'matric', done: Boolean(matricUrl), label: 'Matric' },
    { key: 'selfie', done: Boolean(selfieUrl), label: 'Selfie' },
  ]
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {steps.map((step) => (
        <span
          key={step.key}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            step.done
              ? 'bg-[#F0FFF4] text-[#38A169] ring-1 ring-[#C6F6D5]'
              : 'bg-[#F7FAFC] text-[#718096] ring-1 ring-[#E2E8F0]'
          }`}
        >
          {step.done ? `${step.label} ✓` : step.label}
        </span>
      ))}
    </div>
  )
}

export default function StudentVerification({
  verificationState = 'not_submitted',
  verificationLabel = VERIFICATION_STATUS_LABELS.not_submitted,
  rejectionReason = '',
  progressSteps = 0,
  progressPercent = 0,
  icConfirmed = false,
  registeredName = '',
  registeredIc = '',
  matricUrl = '',
  selfieUrl = '',
  fileMeta = {},
  submittedAt = null,
  submitting = false,
  icProcessing = false,
  onIcProcessingChange,
  onDocumentUpload,
  onDocumentClear,
  onIcConfirmed,
  onIcClear,
  onSubmit,
  onClearAll,
}) {
  const isVerified = verificationState === 'verified'
  const isRejected = verificationState === 'rejected'
  const isUnderReview = verificationState === 'under_review'
  const allUploaded = Boolean(icConfirmed && matricUrl && selfieUrl)
  const canSubmit = allUploaded && !icProcessing && !submitting && !isVerified && !isUnderReview

  const previews = { matric: matricUrl, selfie: selfieUrl }

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
            <span aria-hidden="true">✅ </span>
            Account Verification
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">Upload documents to verify your student identity</p>
        </header>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[#1A1A2E]">Verification Status</p>
              <p className={`mt-1 text-sm font-semibold ${verificationStatusClass(verificationState)}`}>
                {verificationLabel}
              </p>
              {submittedAt && isUnderReview ? (
                <p className="mt-1 text-xs text-[#6B7280]">
                  Submitted {new Date(submittedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <ProgressDots steps={isVerified ? 4 : progressSteps} activeColor={ACCENT} />
              <p className="mt-1 text-sm font-semibold text-[#6C2BD9]">
                {isVerified ? '100' : progressPercent}% Complete
              </p>
            </div>
          </div>

          {isRejected ? (
            <div className="mt-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4">
              <p className="text-sm font-semibold text-[#B91C1C]">
                <span aria-hidden="true">❌ </span>
                Verification Rejected{rejectionReason ? `: ${rejectionReason}` : ''}
              </p>
              <p className="mt-1 text-xs text-[#7F1D1D]">
                Update your documents and submit again for review.
              </p>
            </div>
          ) : null}

          <VerificationStepChips icConfirmed={icConfirmed} matricUrl={matricUrl} selfieUrl={selfieUrl} />
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <VerificationUpload
            variant="ic"
            accentColor={ACCENT}
            title={DOCUMENTS[0].title}
            description={DOCUMENTS[0].description}
            emoji={DOCUMENTS[0].emoji}
            disabled={submitting || isVerified}
            registeredName={registeredName}
            registeredIc={registeredIc}
            icConfirmed={icConfirmed}
            onIcConfirmed={onIcConfirmed}
            onClear={onIcClear}
            onProcessingChange={onIcProcessingChange}
          />
          {DOCUMENTS.filter((doc) => doc.key !== 'ic').map((doc) => (
            <VerificationUpload
              key={doc.key}
              variant="document"
              accentColor={ACCENT}
              title={doc.title}
              description={doc.description}
              emoji={doc.emoji}
              previewUrl={previews[doc.key]}
              fileName={fileMeta[doc.key]?.fileName || ''}
              fileSize={fileMeta[doc.key]?.size}
              disabled={submitting || isVerified}
              onFileSelected={(file) => onDocumentUpload?.(doc.key, file)}
              onClear={() => onDocumentClear?.(doc.key)}
            />
          ))}
        </section>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A2E]">
            <span aria-hidden="true">ℹ️ </span>
            Requirements
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-[#4B5563]">
            <li>
              <strong className="text-[#1A1A2E]">Identity Card:</strong> Clear photo of front of MyKad/Passport
            </li>
            <li>
              <strong className="text-[#1A1A2E]">Matric Card:</strong> Student ID from your university
            </li>
            <li>
              <strong className="text-[#1A1A2E]">Selfie:</strong> Photo of yourself holding any of the above cards
            </li>
          </ul>
        </section>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={onSubmit}
              className="rounded-lg bg-[#6C2BD9] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? 'Submitting…'
                : isVerified
                  ? 'Verified'
                  : isUnderReview
                    ? 'Under Review'
                    : 'Submit for Verification'}
            </button>
            <button
              type="button"
              disabled={submitting || isVerified}
              onClick={onClearAll}
              className="rounded-lg border border-[#6C2BD9] bg-white px-6 py-2.5 text-sm font-semibold text-[#6C2BD9] hover:bg-[#F3F0FF] disabled:opacity-50"
            >
              Clear All Files
            </button>
          </div>
          {!canSubmit && !isVerified && !isUnderReview ? (
            <p className="text-sm text-[#6B7280]">
              {icProcessing
                ? 'Please wait while your IC is being processed…'
                : 'Please upload all documents to submit'}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
