import VerificationUpload from '../../components/VerificationUpload'

function ProgressDots({ steps }) {
  const dots = [0, 1, 2, 3]
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-sm" aria-hidden="true">
      {dots.map((i) => (
        <span key={i} className={i < steps ? 'text-[#6C2BD9]' : 'text-[#D1D5DB]'}>
          {i < steps ? '●' : '○'}
        </span>
      ))}
    </span>
  )
}

function DocumentCard({ doc, previewUrl, onChooseFile, inputRef }) {
  const uploaded = Boolean(previewUrl)

  return (
    <article className="flex flex-col rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <p className="text-3xl" aria-hidden="true">
        {doc.emoji}
      </p>
      <h3 className="mt-3 text-lg font-bold text-[#1A1A2E]">{doc.title}</h3>
      <p className="mt-2 flex-1 text-sm text-[#6B7280]">{doc.description}</p>

      <button
        type="button"
        onClick={() => onChooseFile(doc.key)}
        className="mt-4 flex h-36 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-[#E2E8F0] bg-[#FAFAFA] transition hover:border-[#6C2BD9] hover:bg-[#F9F7FF]"
        aria-label={`Upload ${doc.title}`}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm text-[#9CA3AF]">Tap to upload</span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => onChooseFile(doc.key, e)}
      />

      <p className="mt-3 text-sm font-semibold">
        {uploaded ? (
          <span className="text-[#10B981]">
            <span aria-hidden="true">✅ </span>
            Uploaded
          </span>
        ) : (
          <span className="text-[#F59E0B]">
            <span aria-hidden="true">⏳ </span>
            Pending
          </span>
        )}
      </p>

      <button
        type="button"
        onClick={() => onChooseFile(doc.key)}
        className="mt-3 w-full rounded-lg border border-[#6C2BD9] bg-white px-4 py-2.5 text-sm font-semibold text-[#6C2BD9] hover:bg-[#F3F0FF]"
      >
        {uploaded ? 'Replace File' : 'Choose File'}
      </button>
    </article>
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

export default function StudentVerification({
  verificationState = 'pending',
  verificationLabel = 'Pending',
  progressSteps = 0,
  progressPercent = 0,
  icConfirmed = false,
  registeredName = '',
  registeredIc = '',
  matricUrl = '',
  selfieUrl = '',
  submittedAt = null,
  submitting = false,
  matricInputRef,
  selfieInputRef,
  onChooseFile,
  onIcConfirmed,
  onIcClear,
  onSubmit,
  onClearAll,
}) {
  const isVerified = verificationState === 'verified'
  const statusEmoji = isVerified ? '✅' : verificationState === 'rejected' ? '❌' : '⚠️'

  const previews = { matric: matricUrl, selfie: selfieUrl }
  const refs = { matric: matricInputRef, selfie: selfieInputRef }

  const allUploaded = Boolean(icConfirmed && matricUrl && selfieUrl)

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
              <p className="mt-1 text-sm text-[#4B5563]">
                <span aria-hidden="true">{statusEmoji} </span>
                {verificationLabel}
              </p>
              {submittedAt && !isVerified ? (
                <p className="mt-1 text-xs text-[#6B7280]">
                  Submitted {new Date(submittedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <ProgressDots steps={isVerified ? 4 : progressSteps} />
              <p className="mt-1 text-sm font-semibold text-[#6C2BD9]">
                {isVerified ? '100' : progressPercent}% Complete
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <VerificationUpload
            variant="ic"
            title={DOCUMENTS[0].title}
            description={DOCUMENTS[0].description}
            emoji={DOCUMENTS[0].emoji}
            disabled={submitting || isVerified}
            registeredName={registeredName}
            registeredIc={registeredIc}
            icConfirmed={icConfirmed}
            onIcConfirmed={onIcConfirmed}
            onClear={onIcClear}
          />
          {DOCUMENTS.filter((doc) => doc.key !== 'ic').map((doc) => (
            <DocumentCard
              key={doc.key}
              doc={doc}
              previewUrl={previews[doc.key]}
              inputRef={refs[doc.key]}
              onChooseFile={(key, e) => {
                if (e?.target?.files) onChooseFile(key, e)
                else onChooseFile(key)
              }}
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

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            disabled={!allUploaded || submitting || isVerified}
            onClick={onSubmit}
            className="rounded-lg bg-[#6C2BD9] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : isVerified ? 'Verified' : 'Submit for Verification'}
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
      </div>
    </div>
  )
}
