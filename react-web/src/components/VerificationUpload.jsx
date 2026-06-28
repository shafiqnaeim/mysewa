import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import OCRProcessor from './OCRProcessor'
import {
  formatIcNumber,
  isAllowedVerificationFile,
  isOcrCompatibleFile,
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

/**
 * Drag-and-drop upload with optional client-side IC OCR (Tesseract.js).
 * IC images are kept in memory only — not persisted by this component.
 */
export default function VerificationUpload({
  title = 'Identity Card',
  description = 'Photo of the front of your Identity Card',
  emoji = '🪪',
  variant = 'default',
  previewUrl = '',
  fileName = '',
  disabled = false,
  registeredName = '',
  registeredIc = '',
  icConfirmed = false,
  onFileSelected,
  onIcConfirmed,
  onClear,
}) {
  const inputId = useId()
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [localPreview, setLocalPreview] = useState('')
  const [localFileName, setLocalFileName] = useState('')
  const [ocrSource, setOcrSource] = useState(null)
  const [ocrCompatible, setOcrCompatible] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(null)
  const [ocrFailed, setOcrFailed] = useState(false)
  const [manualIc, setManualIc] = useState('')
  const [extracted, setExtracted] = useState({ icNumber: '', name: '' })
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  const isIc = variant === 'ic'
  const displayPreview = localPreview || previewUrl
  const displayName = localFileName || fileName

  useEffect(() => {
    return () => {
      if (localPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(localPreview)
      }
    }
  }, [localPreview])

  const icFormatValid = useMemo(() => {
    const candidate = extracted.icNumber || formatIcNumber(manualIc)
    return validateIcFormat(candidate)
  }, [extracted.icNumber, manualIc])

  const nameMatches = useMemo(() => {
    if (!extracted.name) return false
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
  }, [])

  const processFile = useCallback(
    (file) => {
      if (!file) return
      setError('')

      if (!isAllowedVerificationFile(file)) {
        setError('Use JPG, PNG, or PDF up to 5 MB.')
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
      resetOcrState()

      if (isIc) {
        const compatible = isOcrCompatibleFile(file)
        setOcrCompatible(compatible)
        if (!compatible) {
          setOcrFailed(true)
          setError('Could not read IC. Please enter manually.')
          return
        }
        setOcrSource(preview)
        setOcrProgress(0)
      }

      onFileSelected?.(file, { previewUrl: preview, fileName: file.name })
    },
    [isIc, localPreview, onFileSelected, resetOcrState],
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
    resetOcrState()
    onClear?.()
  }

  async function handleConfirmManual() {
    const formatted = formatIcNumber(manualIc)
    if (!validateIcFormat(formatted)) {
      setError('Enter a valid IC number (YYYYMM-DD-####).')
      return
    }
    setConfirming(true)
    setError('')
    try {
      await onIcConfirmed?.({ icNumber: formatted, extractedName: '', manual: true })
      resetOcrState()
      setLocalPreview('')
      setLocalFileName('')
    } catch (err) {
      setError(err.message || 'Could not confirm IC.')
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
    try {
      await onIcConfirmed?.({ icNumber: formatted, extractedName: extracted.name, manual: false })
      if (localPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(localPreview)
      }
      setLocalPreview('')
      setLocalFileName('')
      resetOcrState()
    } catch (err) {
      setError(err.message || 'Could not confirm IC.')
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
          dragOver ? 'border-[#E88D5B] bg-[#FFF8F3]' : 'border-[#E2E8F0] bg-[#F7FAFC]'
        } ${disabled ? 'opacity-60' : 'hover:border-[#E88D5B]'}`}
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
              <span className="mt-1 text-xs text-[#A0AEC0]">JPG, PNG, PDF · max 5 MB</span>
            </>
          )}
        </label>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={VERIFICATION_ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={handleInputChange}
      />

      {displayName ? (
        <p className="mt-3 truncate text-xs text-[#4A5568]" title={displayName}>
          {displayName}
        </p>
      ) : null}

      {isIc && ocrProgress != null && ocrProgress < 100 ? (
        <p className="mt-3 text-sm font-medium text-[#E88D5B]">
          <span aria-hidden="true">📷 </span>
          Processing IC… {ocrProgress}%
        </p>
      ) : null}

      {isIc && icConfirmed ? (
        <div className="mt-4 space-y-2 rounded-lg border border-[#C6F6D5] bg-[#F0FFF4] p-4">
          <p className="text-sm font-semibold text-[#38A169]">
            <span aria-hidden="true">✅ </span>
            IC verified
          </p>
          {registeredIc ? (
            <p className="text-sm text-[#2D3748]">
              IC Number: <span className="font-semibold">{formatIcNumber(registeredIc)}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {isIc && !icConfirmed && extracted.icNumber ? (
        <div className="mt-4 space-y-2 rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] p-4">
          <p className="text-sm text-[#2D3748]">
            <span aria-hidden="true">✅ </span>
            IC Number: <span className="font-semibold">{extracted.icNumber}</span>
          </p>
          {extracted.name ? (
            <p className="text-sm text-[#4A5568]">
              Name detected: <span className="font-medium">{extracted.name}</span>
            </p>
          ) : null}
          <ValidationRow ok={icFormatValid} label="IC format valid" />
          <ValidationRow ok={nameMatches} label="Name matches" />
          {!nameMatches && extracted.name ? (
            <>
              <p className="text-xs text-[#A0AEC0]">Registered name: {registeredName}</p>
              <button
                type="button"
                onClick={() => {
                  setManualIc(extracted.icNumber)
                  setOcrFailed(true)
                }}
                className="text-sm font-medium text-[#E88D5B] hover:underline"
              >
                Enter manually instead
              </button>
            </>
          ) : null}
          <button
            type="button"
            disabled={disabled || confirming || !icFormatValid || !nameMatches}
            onClick={handleConfirmOcr}
            className="mt-2 w-full rounded-lg bg-[#E88D5B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D97A4C] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirming ? 'Confirming…' : 'Confirm IC details'}
          </button>
        </div>
      ) : null}

      {isIc && ocrFailed && !icConfirmed ? (
        <div className="mt-4 space-y-3 rounded-lg border border-[#FED7D7] bg-[#FFF5F5] p-4">
          <p className="text-sm text-[#C53030]">Could not read IC. Please enter manually.</p>
          <label className="block text-sm font-medium text-[#2D3748]" htmlFor={`${inputId}-manual-ic`}>
            IC Number
          </label>
          <input
            id={`${inputId}-manual-ic`}
            type="text"
            inputMode="numeric"
            placeholder="040929-01-0715"
            value={manualIc}
            onChange={(e) => setManualIc(e.target.value)}
            className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-sm outline-none focus:border-[#E88D5B] focus:ring-2 focus:ring-[#E88D5B]/20"
          />
          <ValidationRow ok={validateIcFormat(formatIcNumber(manualIc))} label="IC format valid" />
          <button
            type="button"
            disabled={disabled || confirming || !validateIcFormat(formatIcNumber(manualIc))}
            onClick={handleConfirmManual}
            className="w-full rounded-lg bg-[#2D3748] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1A202C] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirming ? 'Saving…' : 'Save IC Number'}
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-[#E53E3E]">{error}</p> : null}

      <p className="mt-3 text-sm font-semibold">
        {icConfirmed || (!isIc && displayPreview) ? (
          <span className="text-[#38A169]">
            <span aria-hidden="true">✅ </span>
            {isIc ? 'Verified' : 'Uploaded'}
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
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="flex-1 rounded-lg border border-[#E88D5B] bg-white px-4 py-2.5 text-sm font-semibold text-[#E88D5B] hover:bg-[#FFF8F3] disabled:opacity-50"
        >
          {displayPreview ? 'Replace File' : 'Choose File'}
        </button>
        {displayPreview && !icConfirmed ? (
          <button
            type="button"
            disabled={disabled}
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
          onComplete={(result) => {
            setOcrProgress(100)
            setExtracted(result)
            setOcrSource(null)
            if (!result.icNumber) {
              setOcrFailed(true)
              setError('Could not read IC. Please enter manually.')
            }
          }}
          onError={() => {
            setOcrFailed(true)
            setOcrProgress(null)
            setOcrSource(null)
            setError('Could not read IC. Please enter manually.')
          }}
        />
      ) : null}

      {isIc ? (
        <p className="mt-4 text-xs leading-relaxed text-[#A0AEC0]">
          <span aria-hidden="true">🔒 </span>
          Your IC image is processed on this device only and is not stored. Your IC number is encrypted before saving.
        </p>
      ) : null}
    </article>
  )
}
