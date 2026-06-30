import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import OCRProcessor from './OCRProcessor'
import {
  formatIcNumber,
  isAllowedVerificationFile,
  isOcrCompatibleFile,
  mapIcConfirmError,
  MAX_VERIFICATION_FILE_BYTES,
  namesMatch,
  validateIcFormat,
  VERIFICATION_ACCEPT,
} from '../utils/icOcrUtils'

function ValidationRow({ ok, label, value }) {
  return (
    <p className={`text-sm ${ok ? 'text-[#38A169]' : 'text-[#E53E3E]'}`}>
      <span aria-hidden="true">{ok ? '✅' : '❌'} </span>
      {label}
      {value ? (
        <>
          : <span className="font-semibold text-[#2D3748]">{value}</span>
        </>
      ) : null}
    </p>
  )
}

const PRIVACY_MESSAGE =
  'Your IC image is processed on this device only and is not stored. Your IC number is encrypted before saving.'

/**
 * Drag-and-drop upload with optional client-side IC OCR (Tesseract.js).
 * IC images are kept in memory only — not persisted by this component.
 */
export default function VerificationUpload({
  title = 'Identity Card',
  description = 'Photo of the front of your Identity Card',
  emoji = '🪪',
  variant = 'default',
  accentColor = '#E88D5B',
  previewUrl = '',
  fileName = '',
  fileSize = null,
  disabled = false,
  registeredName = '',
  registeredIc = '',
  icConfirmed = false,
  onFileSelected,
  onIcConfirmed,
  onClear,
  onProcessingChange,
}) {
  const inputId = useId()
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [localPreview, setLocalPreview] = useState('')
  const [localFileName, setLocalFileName] = useState('')
  const [localFileSize, setLocalFileSize] = useState(null)
  const [ocrSource, setOcrSource] = useState(null)
  const [ocrCompatible, setOcrCompatible] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(null)
  const [ocrFailed, setOcrFailed] = useState(false)
  const [manualIc, setManualIc] = useState('')
  const [extracted, setExtracted] = useState({ icNumber: '', name: '' })
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [icSubmitError, setIcSubmitError] = useState('')

  const isIc = variant === 'ic'
  const isDocument = variant === 'document'
  const displayPreview = localPreview || previewUrl
  const displayName = localFileName || fileName
  const displaySize = localFileSize ?? fileSize
  const isOcrRunning =
    isIc && !icConfirmed && !ocrFailed && ocrProgress != null && ocrProgress < 100

  function formatSize(bytes) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  useEffect(() => {
    return () => {
      if (localPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(localPreview)
      }
    }
  }, [localPreview])

  useEffect(() => {
    onProcessingChange?.(isOcrRunning)
  }, [isOcrRunning, onProcessingChange])

  const formattedManualIc = useMemo(() => formatIcNumber(manualIc), [manualIc])
  const manualIcHasInput = manualIc.trim().length > 0
  const manualIcValid = validateIcFormat(formattedManualIc)

  const icFormatValid = useMemo(() => {
    const candidate = extracted.icNumber || formattedManualIc
    return validateIcFormat(candidate)
  }, [extracted.icNumber, formattedManualIc])

  const displayConfirmedIc = useMemo(() => {
    const raw = registeredIc || ''
    const formatted = formatIcNumber(raw)
    return formatted || (validateIcFormat(raw) ? raw.trim() : '')
  }, [registeredIc])

  const nameMatches = useMemo(() => {
    if (!extracted.name) return true
    return namesMatch(registeredName, extracted.name)
  }, [registeredName, extracted.name])

  const resetOcrState = useCallback(() => {
    setOcrProgress(null)
    setOcrSource(null)
    setOcrCompatible(false)
    setOcrFailed(false)
    setManualIc('')
    setExtracted({ icNumber: '', name: '' })
    setError('')
    setIcSubmitError('')
  }, [])

  const handleOcrComplete = useCallback(
    (result) => {
      setOcrProgress(100)
      setExtracted(result)
      setOcrSource(null)
      if (!result?.icNumber) {
        setOcrFailed(true)
        setError('Could not read IC. Please enter manually.')
      }
    },
    [],
  )

  const handleOcrError = useCallback(() => {
    setOcrFailed(true)
    setOcrProgress(null)
    setOcrSource(null)
    setError('Could not read IC. Please enter manually.')
  }, [])

  const processFile = useCallback(
    (file) => {
      if (!file) return
      setError('')

      if (!isAllowedVerificationFile(file)) {
        setError(isDocument ? 'Use JPG or PNG up to 5 MB.' : 'Use JPG, PNG, or PDF up to 5 MB.')
        return
      }
      if (isDocument && !file.type.startsWith('image/')) {
        setError('Please use a JPG or PNG image.')
        return
      }
      if (file.size > MAX_VERIFICATION_FILE_BYTES) {
        setError('File must be 5 MB or smaller.')
        return
      }

      if (localPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(localPreview)
      }

      const preview = URL.createObjectURL(file)
      setLocalPreview(preview)
      setLocalFileName(file.name)
      setLocalFileSize(file.size)

      if (isIc) {
        resetOcrState()
        const compatible = isOcrCompatibleFile(file)
        setOcrCompatible(compatible)
        if (!compatible) {
          setOcrFailed(true)
          setError('Could not read IC. Please enter manually.')
          return
        }
        setOcrSource(preview)
        setOcrProgress(5)
      } else {
        resetOcrState()
      }

      onFileSelected?.(file, { previewUrl: preview, fileName: file.name })
    },
    [isDocument, isIc, localPreview, onFileSelected, resetOcrState],
  )

  function handleInputChange(e) {
    const file = e.target.files?.[0]
    processFile(file)
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    processFile(file)
  }

  function handleClear() {
    if (localPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(localPreview)
    }
    setLocalPreview('')
    setLocalFileName('')
    setLocalFileSize(null)
    resetOcrState()
    onClear?.()
  }

  async function handleConfirmManual() {
    const formatted = formattedManualIc
    if (!validateIcFormat(formatted)) {
      setIcSubmitError('Invalid IC format. Please use YYYYMM-DD-####')
      return
    }
    setConfirming(true)
    setError('')
    setIcSubmitError('')
    try {
      await onIcConfirmed?.({ icNumber: formatted, extractedName: '', manual: true })
      if (localPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(localPreview)
      }
      setLocalPreview('')
      setLocalFileName('')
      setLocalFileSize(null)
      setManualIc('')
      setIcSubmitError('')
    } catch (err) {
      const mapped = mapIcConfirmError(err.message)
      setIcSubmitError(mapped.message)
    } finally {
      setConfirming(false)
    }
  }

  async function handleConfirmOcr() {
    const formatted = extracted.icNumber
    if (!validateIcFormat(formatted)) {
      setError('Could not read IC. Please enter manually.')
      setOcrFailed(true)
      return
    }
    setConfirming(true)
    setError('')
    setIcSubmitError('')
    try {
      await onIcConfirmed?.({ icNumber: formatted, extractedName: extracted.name, manual: false })
      if (localPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(localPreview)
      }
      setLocalPreview('')
      setLocalFileName('')
      setLocalFileSize(null)
      resetOcrState()
    } catch (err) {
      const mapped = mapIcConfirmError(err.message)
      setIcSubmitError(mapped.message)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <article className="flex flex-col rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <p className="text-3xl" aria-hidden="true">
        {emoji}
      </p>
      <h3 className="mt-3 text-lg font-bold text-[#2D3748]">{title}</h3>
      <p className="mt-2 flex-1 text-sm text-[#4A5568]">{description}</p>

      <div
        className={`mt-4 rounded-lg border-2 border-dashed transition ${
          dragOver ? 'bg-opacity-50' : 'border-[#E2E8F0] bg-[#F7FAFC]'
        } ${disabled ? 'opacity-60' : ''}`}
        style={{
          borderColor: dragOver ? accentColor : undefined,
          backgroundColor: dragOver ? `${accentColor}14` : undefined,
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragOver(false)
        }}
        onDrop={handleDrop}
      >
        <label
          htmlFor={inputId}
          className={`flex min-h-36 cursor-pointer flex-col items-center justify-center overflow-hidden px-4 py-6 ${
            disabled ? 'cursor-not-allowed' : ''
          }`}
        >
          {displayPreview ? (
            <img src={displayPreview} alt="" className="max-h-32 w-full object-contain" />
          ) : (
            <>
              <span className="text-2xl" aria-hidden="true">
                📷
              </span>
              <span className="mt-2 text-sm font-medium text-[#2D3748]">Drag & drop or click to upload</span>
              <span className="mt-1 text-xs text-[#A0AEC0]">
                {isDocument ? 'JPG, PNG · max 5 MB' : 'JPG, PNG, PDF · max 5 MB'}
              </span>
            </>
          )}
        </label>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={isDocument ? 'image/jpeg,image/png,image/jpg' : VERIFICATION_ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={handleInputChange}
      />

      {isIc ? (
        <p className="mt-3 rounded-lg border border-[#E2E8F0] bg-[#F9FAFB] p-3 text-xs leading-relaxed text-[#718096]">
          <span aria-hidden="true">🔒 </span>
          {PRIVACY_MESSAGE}
        </p>
      ) : null}

      {displayName ? (
        <p className="mt-3 truncate text-xs text-[#4A5568]" title={displayName}>
          {displayName}
          {displaySize ? ` · ${formatSize(displaySize)}` : ''}
        </p>
      ) : null}

      {isOcrRunning ? (
        <p className="mt-3 text-sm font-medium" style={{ color: accentColor }}>
          <span aria-hidden="true">📷 </span>
          Processing IC… {ocrProgress}%
        </p>
      ) : null}

      {isIc && icConfirmed ? (
        <div className="mt-4 space-y-2 rounded-lg border border-[#C6F6D5] bg-[#F0FFF4] p-4">
          <p className="text-sm font-semibold text-[#38A169]">
            <span aria-hidden="true">✅ </span>
            {displayConfirmedIc ? (
              <>
                IC confirmed: <span className="font-semibold">{displayConfirmedIc}</span>
              </>
            ) : (
              'IC confirmed'
            )}
          </p>
        </div>
      ) : null}

      {isIc && !icConfirmed && extracted.icNumber && !ocrFailed ? (
        <div className="mt-4 space-y-2 rounded-lg border border-[#C6F6D5] bg-[#F0FFF4] p-4">
          <p className="text-sm font-semibold text-[#2D3748]">
            <span aria-hidden="true">✅ </span>
            IC Extracted: <span className="font-semibold">{extracted.icNumber}</span>
          </p>
          {extracted.name ? (
            <p className="text-sm text-[#4A5568]">
              Name detected: <span className="font-medium">{extracted.name}</span>
            </p>
          ) : null}
          <ValidationRow ok={icFormatValid} label="IC format valid" />
          {!nameMatches && extracted.name ? (
            <p className="text-xs text-[#ED8936]">
              Name on IC does not exactly match your profile — you can still confirm or enter manually.
            </p>
          ) : (
            <ValidationRow ok={nameMatches} label="Name matches" />
          )}
          <button
            type="button"
            disabled={disabled || confirming || !icFormatValid}
            onClick={handleConfirmOcr}
            className="mt-2 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            {confirming ? 'Confirming…' : 'Confirm IC details'}
          </button>
        </div>
      ) : null}

      {isIc && ocrFailed && !icConfirmed ? (
        <div className="mt-4 space-y-3 rounded-lg border border-[#FED7D7] bg-[#FFF5F5] p-4">
          <p className="text-sm font-medium text-[#C53030]">
            <span aria-hidden="true">❌ </span>
            Could not read IC. Please enter manually.
          </p>
          <label className="block text-sm font-medium text-[#2D3748]" htmlFor={`${inputId}-manual-ic`}>
            IC Number
          </label>
          <input
            id={`${inputId}-manual-ic`}
            type="text"
            inputMode="numeric"
            placeholder="040929-01-0715"
            value={manualIc}
            onChange={(e) => {
              setManualIc(e.target.value)
              setIcSubmitError('')
            }}
            className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-sm outline-none focus:border-[#E88D5B] focus:ring-2 focus:ring-[#E88D5B]/20"
          />
          {manualIcHasInput ? (
            manualIcValid ? (
              <p className="text-sm text-[#38A169]">
                <span aria-hidden="true">✅ </span>
                IC format valid
              </p>
            ) : (
              <p className="text-sm text-[#E53E3E]">
                <span aria-hidden="true">❌ </span>
                Invalid IC format. Please use YYYYMM-DD-####
              </p>
            )
          ) : null}
          {icSubmitError ? (
            <p className="text-sm text-[#E53E3E]">
              <span aria-hidden="true">❌ </span>
              {icSubmitError}
            </p>
          ) : null}
          <button
            type="button"
            disabled={disabled || confirming || !manualIcValid}
            onClick={handleConfirmManual}
            className="w-full rounded-lg bg-[#2D3748] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1A202C] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirming ? 'Saving…' : 'Save IC Number'}
          </button>
        </div>
      ) : null}

      {icSubmitError && !ocrFailed && !icConfirmed ? (
        <p className="mt-3 text-sm text-[#E53E3E]">
          <span aria-hidden="true">❌ </span>
          {icSubmitError}
        </p>
      ) : null}
      {error && !ocrFailed && !icSubmitError ? <p className="mt-3 text-sm text-[#E53E3E]">{error}</p> : null}

      <p className="mt-3 text-sm font-semibold">
        {icConfirmed || (!isIc && displayPreview) ? (
          <span className="text-[#38A169]">
            <span aria-hidden="true">✅ </span>
            {isIc ? 'Verified' : 'Uploaded'}
          </span>
        ) : isOcrRunning ? (
          <span className="text-[#ED8936]">
            <span aria-hidden="true">⏳ </span>
            Processing…
          </span>
        ) : (
          <span className="text-[#ED8936]">
            <span aria-hidden="true">⏳ </span>
            Pending
          </span>
        )}
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={disabled || isOcrRunning}
          onClick={() => inputRef.current?.click()}
          className="flex-1 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold hover:bg-opacity-10 disabled:opacity-50"
          style={{ borderColor: accentColor, color: accentColor }}
        >
          {displayPreview ? 'Replace File' : 'Choose File'}
        </button>
        {displayPreview && !icConfirmed ? (
          <button
            type="button"
            disabled={disabled || isOcrRunning}
            onClick={handleClear}
            className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#4A5568] hover:bg-[#F7FAFC] disabled:opacity-50"
          >
            Clear
          </button>
        ) : null}
      </div>

      {isIc && ocrSource && ocrCompatible && !icConfirmed && !ocrFailed && !extracted.icNumber ? (
        <OCRProcessor
          imageSource={ocrSource}
          active
          onProgress={setOcrProgress}
          onComplete={handleOcrComplete}
          onError={handleOcrError}
        />
      ) : null}
    </article>
  )
}
