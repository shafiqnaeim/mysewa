import VerificationUpload from '../../components/VerificationUpload'

function formatFileSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

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

function StatusBadge({ isVerified }) {
  if (isVerified) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0FFF4] px-3 py-1 text-xs font-semibold text-[#48BB78]">
        <span aria-hidden="true">✅</span> Verified
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFAF0] px-3 py-1 text-xs font-semibold text-[#ED8936]">
      <span aria-hidden="true">⏳</span> Pending
    </span>
  )
}

function DocumentCard({ doc, previewUrl, fileName, onChooseFile, inputRef }) {
  const uploaded = Boolean(previewUrl)

  return (
    <article className="flex flex-col rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <p className="text-3xl" aria-hidden="true">
        {doc.emoji}
      </p>
      <h3 className="mt-3 text-lg font-bold text-[#2D3748]">{doc.title}</h3>
      <p className="mt-2 flex-1 text-sm text-[#4A5568]">{doc.description}</p>

      <button
        type="button"
        onClick={() => onChooseFile(doc.key)}
        className="mt-4 flex h-36 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-[#E2E8F0] bg-[#FAFAFA] transition hover:border-[#E88D5B] hover:bg-[#FFF8F3]"
        aria-label={`Upload ${doc.title}`}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm text-[#A0AEC0]">Tap to upload</span>
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

      {uploaded && fileName ? (
        <p className="mt-3 truncate text-xs text-[#4A5568]" title={fileName}>
          {fileName}
        </p>
      ) : null}

      <p className="mt-2 text-sm font-semibold">
        {uploaded ? (
          <span className="text-[#48BB78]">
            <span aria-hidden="true">✅ </span>
            Uploaded
          </span>
        ) : (
          <span className="text-[#ED8936]">
            <span aria-hidden="true">⏳ </span>
            Pending
          </span>
        )}
      </p>

      <button
        type="button"
        onClick={() => onChooseFile(doc.key)}
        className="mt-3 w-full rounded-lg border border-[#E88D5B] bg-white px-4 py-2.5 text-sm font-semibold text-[#E88D5B] hover:bg-[#FFF8F3]"
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

const PREVIEW_LABELS = {
  ic: 'Identity Card',
  matric: 'Grant or Property Tax Receipt',
  selfie: 'Selfie',
}

export default function LandlordVerification({
  verificationState = 'pending',
  verificationLabel = 'Pending',
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
  grantInputRef,
  selfieInputRef,
  onChooseFile,
  onIcConfirmed,
  onIcClear,
  onRemoveFile,
  onSubmit,
  onClearAll,
}) {
  const isVerified = verificationState === 'verified'
  const isRejected = verificationState === 'rejected'

  const previews = { matric: grantUrl, selfie: selfieUrl }
  const refs = { matric: grantInputRef, selfie: selfieInputRef }
  const allUploaded = Boolean(icConfirmed && grantUrl && selfieUrl)

  const uploadedItems = DOCUMENTS.filter((doc) => doc.key !== 'ic' && previews[doc.key]).map((doc) => {
    const slotMeta = fileMeta[doc.key] || {}
    return {
      key: doc.key,
      label: PREVIEW_LABELS[doc.key],
      url: previews[doc.key],
      fileName: slotMeta.fileName || doc.defaultFileName,
      size: slotMeta.size,
      uploadedAt: slotMeta.uploadedAt,
    }
  })

  const statusColor = isVerified ? 'text-[#48BB78]' : isRejected ? 'text-[#FC8181]' : 'text-[#ED8936]'

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#2D3748]">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2D3748] sm:text-3xl">
              <span aria-hidden="true">🛡️ </span>
              Account Verification
            </h1>
            <p className="mt-2 text-sm text-[#4A5568]">
              Upload documents to verify your identity as a landlord
            </p>
          </div>
          <StatusBadge isVerified={isVerified} />
        </header>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[#2D3748]">Verification Status</p>
              <p className={`mt-1 text-sm font-semibold ${statusColor}`}>{verificationLabel}</p>
              {submittedAt && !isVerified ? (
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
          <p className="mt-4 text-sm leading-relaxed text-[#4A5568]">
            Landlord need to upload three files according as below to confirm your identity. Uploads are reviewed by
            the MySewa system.
          </p>
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
              fileName={
                previews[doc.key]
                  ? fileMeta[doc.key]?.fileName || doc.defaultFileName
                  : ''
              }
              inputRef={refs[doc.key]}
              onChooseFile={(key, e) => {
                if (e?.target?.files) onChooseFile(key, e)
                else onChooseFile(key)
              }}
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

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            disabled={!allUploaded || submitting || isVerified}
            onClick={onSubmit}
            className="rounded-lg bg-[#E88D5B] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#D97A4C] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : isVerified ? 'Verified' : 'Submit for Verification'}
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

        {uploadedItems.length > 0 || icConfirmed ? (
          <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#2D3748]">Uploaded Files Preview</h2>
            <ul className="mt-4 space-y-4">
              {icConfirmed ? (
                <li className="flex flex-col gap-4 rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] p-4 sm:flex-row sm:items-center">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-[#C6F6D5] bg-[#F0FFF4] text-2xl">
                    🪪
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#2D3748]">Identity Card</p>
                    <p className="text-sm text-[#38A169]">Verified via OCR — image not stored</p>
                  </div>
                </li>
              ) : null}
              {uploadedItems.map((item) => (
                <li
                  key={item.key}
                  className="flex flex-col gap-4 rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] p-4 sm:flex-row sm:items-center"
                >
                  <img
                    src={item.url}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-lg border border-[#E2E8F0] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#2D3748]">{item.label}</p>
                    <p className="truncate text-sm text-[#4A5568]" title={item.fileName}>
                      {item.fileName}
                    </p>
                    <p className="mt-1 text-xs text-[#A0AEC0]">
                      {formatFileSize(item.size)}
                      {item.uploadedAt
                        ? ` · Uploaded ${new Date(item.uploadedAt).toLocaleString()}`
                        : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={submitting || isVerified}
                    onClick={() => onRemoveFile(item.key)}
                    className="shrink-0 rounded-lg border border-[#FC8181] bg-white px-4 py-2 text-sm font-semibold text-[#E53E3E] hover:bg-[#FFF5F5] disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}
