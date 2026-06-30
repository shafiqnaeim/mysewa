import VerificationUpload from '../../components/VerificationUpload'
import {
  VERIFICATION_STATUS_LABELS,
  verificationStatusClass,
} from '../../utils/verificationStatus'

function ProgressDots({ steps, activeColor = '#2D3748' }) {
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
    defaultFileName: 'identity_card.jpg',
  },
  {
    key: 'matric',
    emoji: '📄',
    title: 'Grant or Property Tax Receipt',
    description: 'Photo of your grant or property tax receipt',
    defaultFileName: 'property_grant.jpg',
  },
  {
    key: 'selfie',
    emoji: '📸',
    title: 'Selfie',
    description: 'Take a selfie just yourself',
    defaultFileName: 'selfie.jpg',
  },
]

const ACCENT = '#E88D5B'

function VerificationStepChips({ icConfirmed, grantUrl, selfieUrl }) {
  const steps = [
    { key: 'ic', done: icConfirmed, label: 'IC' },
    { key: 'grant', done: Boolean(grantUrl), label: 'Grant' },
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

export default function LandlordVerification({
  verificationState = 'not_submitted',
  verificationLabel = VERIFICATION_STATUS_LABELS.not_submitted,
  rejectionReason = '',
  progressSteps = 0,
  progressPercent = 0,
  icConfirmed = false,
  registeredName = '',
  registeredIc = '',
  grantUrl = '',
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
  const previews = { matric: grantUrl, selfie: selfieUrl }
  const allUploaded = Boolean(icConfirmed && grantUrl && selfieUrl)
  const canSubmit = allUploaded && !icProcessing && !submitting && !isVerified && !isUnderReview

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#2D3748]">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#2D3748] sm:text-3xl">
            <span aria-hidden="true">🛡️ </span>
            Account Verification
          </h1>
          <p className="mt-2 text-sm text-[#4A5568]">
            Upload documents to verify your identity as a landlord
          </p>
        </header>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[#2D3748]">Verification Status</p>
              <p className={`mt-1 text-sm font-semibold ${verificationStatusClass(verificationState)}`}>
                {verificationLabel}
              </p>
              {submittedAt && isUnderReview ? (
                <p className="mt-1 text-xs text-[#4A5568]">
                  Submitted {new Date(submittedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
            <div className="text-left sm:text-right">
              <ProgressDots steps={isVerified ? 4 : progressSteps} />
              <p className="mt-1 text-sm font-semibold text-[#2D3748]">
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

          <p className="mt-4 text-sm leading-relaxed text-[#4A5568]">
            Upload three documents below to confirm your identity. Uploads are reviewed by the MySewa team.
          </p>

          <VerificationStepChips icConfirmed={icConfirmed} grantUrl={grantUrl} selfieUrl={selfieUrl} />
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
              fileName={fileMeta[doc.key]?.fileName || (previews[doc.key] ? doc.defaultFileName : '')}
              fileSize={fileMeta[doc.key]?.size}
              disabled={submitting || isVerified}
              onFileSelected={(file) => onDocumentUpload?.(doc.key, file)}
              onClear={() => onDocumentClear?.(doc.key)}
            />
          ))}
        </section>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#2D3748]">
            <span aria-hidden="true">ℹ️ </span>
            Requirements
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-[#4A5568]">
            <li>
              <strong className="text-[#2D3748]">Identity Card:</strong> Clear photo of front of MyKad/Passport
            </li>
            <li>
              <strong className="text-[#2D3748]">Grant or Property Tax Receipt:</strong> Proof of property ownership
            </li>
            <li>
              <strong className="text-[#2D3748]">Selfie:</strong> Photo of yourself (clear, front-facing)
            </li>
          </ul>
        </section>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={onSubmit}
              className="rounded-lg bg-[#E88D5B] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#D97A4C] disabled:cursor-not-allowed disabled:opacity-50"
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
              className="rounded-lg border border-[#2D3748] bg-white px-6 py-2.5 text-sm font-semibold text-[#2D3748] hover:bg-[#F7FAFC] disabled:opacity-50"
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
