import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import {
  fetchToyyibPayOptions,
  uploadPaymentReceipt,
  validatePaymentReceiptFile,
} from '../../services/bookingService'
import { logRentPayment } from '../../services/rentPaymentService'
import { MONTH_FULL } from '../../utils/rentTrackerUtils'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import RentPaymentSuccessModal from './RentPaymentSuccessModal'

const PAYMENT_METHODS = [
  { id: 'cash', icon: '💵', title: 'Cash', subtitle: 'Pay in cash' },
  { id: 'duitnow_qr', icon: '📱', title: 'QR Code', subtitle: 'Scan & pay' },
  { id: 'bank_transfer', icon: '🏦', title: 'Bank Transfer', subtitle: 'Transfer online' },
  { id: 'toyyibpay', icon: '🔗', title: 'ToyyibPay', subtitle: 'Secure payment' },
]

function formatRm(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '—'
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function dueDateLabel(year, month) {
  const d = new Date(year, month - 1, 1)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Student monthly rent payment modal — opened from the rent calendar.
 */
export default function RentPaymentModal({
  applicationId,
  year,
  month,
  monthLabel,
  monthlyRent,
  propertyName,
  propertyLocation,
  bankName,
  bankAccount,
  bankHolder,
  qrImageUrl,
  existingLog,
  studentName,
  landlordName,
  isPaid = false,
  onClose,
  onSaved,
}) {
  const { pushToast } = useToast()
  const fileInputRef = useRef(null)

  const [selectedMethod, setSelectedMethod] = useState(null)
  const [receiptFile, setReceiptFile] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState(null)
  const [receiptUrl, setReceiptUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [toyyibPayUrl, setToyyibPayUrl] = useState(null)
  const [toyyibLoading, setToyyibLoading] = useState(false)
  const [toyyibOptions, setToyyibOptions] = useState(null)

  const monthTitle = useMemo(() => {
    if (monthLabel) return monthLabel
    if (month >= 1 && month <= 12) return `${MONTH_FULL[month - 1]} ${year}`
    return `${year}`
  }, [monthLabel, month, year])

  const alreadyLogged = existingLog != null && !success
  const showSuccessView = success || alreadyLogged
  const busy = saving || uploading || toyyibLoading
  const activeMethod = success ? selectedMethod : existingLog?.paymentMethod
  const resolvedQr = qrImageUrl ? resolveMediaUrl(qrImageUrl) : null
  const showReceiptUpload = Boolean(selectedMethod) && selectedMethod !== 'cash'
  const needsReceipt = showReceiptUpload

  const resetForm = useCallback(() => {
    setSelectedMethod(null)
    setReceiptFile(null)
    setReceiptPreview(null)
    setReceiptUrl(null)
    setSuccess(false)
    setToyyibPayUrl(null)
  }, [])

  useEffect(() => {
    resetForm()
  }, [applicationId, year, month, resetForm])

  useEffect(() => {
    return () => {
      if (receiptPreview?.startsWith('blob:')) URL.revokeObjectURL(receiptPreview)
    }
  }, [receiptPreview])

  useEffect(() => {
    let cancelled = false
    fetchToyyibPayOptions()
      .then((data) => {
        if (!cancelled) setToyyibOptions(data)
      })
      .catch(() => {
        if (!cancelled) setToyyibOptions({ enabled: false })
      })
    return () => {
      cancelled = true
    }
  }, [])

  function selectMethod(methodId) {
    setSelectedMethod(methodId)
    setToyyibPayUrl(null)
    if (methodId === 'cash') {
      if (receiptPreview?.startsWith('blob:')) URL.revokeObjectURL(receiptPreview)
      setReceiptFile(null)
      setReceiptPreview(null)
      setReceiptUrl(null)
    }
  }

  function pickReceiptFile(file) {
    const err = validatePaymentReceiptFile(file)
    if (err) {
      pushToast({ message: err, type: 'error' })
      return
    }
    if (receiptPreview?.startsWith('blob:')) URL.revokeObjectURL(receiptPreview)
    setReceiptFile(file)
    setReceiptUrl(null)
    if (file.type.startsWith('image/')) {
      setReceiptPreview(URL.createObjectURL(file))
    } else {
      setReceiptPreview(null)
    }
  }

  async function ensureReceiptUploaded() {
    if (receiptUrl) return receiptUrl
    if (!receiptFile) return null
    const token = localStorage.getItem('mysewa_token')
    if (!token || !applicationId) throw new Error('Session expired — sign in again.')
    setUploading(true)
    try {
      const url = await uploadPaymentReceipt(applicationId, receiptFile, token)
      setReceiptUrl(url)
      return url
    } finally {
      setUploading(false)
    }
  }

  async function initToyyib() {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !applicationId) return
    setToyyibLoading(true)
    try {
      const res = await fetch(
        `/api/v1/applications/${encodeURIComponent(applicationId)}/rent-months/toyyibpay-init`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ year, month }),
        },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `ToyyibPay (${res.status})`)
      if (!data.payUrl) throw new Error('No payment URL returned')
      setToyyibPayUrl(String(data.payUrl))
      pushToast({ message: 'ToyyibPay link ready — complete payment in the new tab.', type: 'success' })
    } catch (e) {
      pushToast({ message: e.message || 'Could not start ToyyibPay.', type: 'error' })
    } finally {
      setToyyibLoading(false)
    }
  }

  const canSubmit =
    Boolean(selectedMethod) &&
    !busy &&
    (selectedMethod === 'cash' || Boolean(receiptFile || receiptUrl))

  async function handleMarkAsPaid() {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !applicationId) return
    if (!selectedMethod) {
      pushToast({ message: 'Choose how you paid first.', type: 'info' })
      return
    }
    if (needsReceipt && !receiptFile && !receiptUrl) {
      pushToast({
        message: 'Upload a receipt for QR, bank transfer, or ToyyibPay payments.',
        type: 'error',
      })
      return
    }

    setSaving(true)
    try {
      let uploadedUrl = null
      if (needsReceipt) {
        uploadedUrl = await ensureReceiptUploaded()
      }
      const data = await logRentPayment(
        {
          bookingId: applicationId,
          year,
          month,
          paymentMethod: selectedMethod,
          receiptUrl: uploadedUrl || null,
        },
        token,
      )
      setSuccess(true)
      pushToast({
        message: `✅ Rent for ${monthTitle} logged successfully!`,
        type: 'success',
        duration: 6000,
      })
      if (typeof onSaved === 'function') onSaved(data)
    } catch (e) {
      pushToast({ message: e.message || 'Failed to save payment.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#2D3748]/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rent-payment-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-[#E2E8F0] bg-[#F7FAFC] px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <h2 id="rent-payment-modal-title" className="text-lg font-bold text-[#2D3748]">
              {showSuccessView
                ? isPaid
                  ? `✅ Payment Confirmed — ${monthTitle}`
                  : `✅ Payment Logged — ${monthTitle}`
                : `💰 Pay Rent — ${monthTitle}`}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#A0AEC0] transition hover:bg-white hover:text-[#2D3748]"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {showSuccessView ? (
            <RentPaymentSuccessModal
              monthTitle={monthTitle}
              propertyName={propertyName}
              propertyAddress={propertyLocation}
              amount={monthlyRent}
              paymentMethod={activeMethod}
              loggedAt={existingLog?.loggedAt || new Date().toISOString()}
              bookingId={applicationId}
              year={year}
              month={month}
              studentName={studentName}
              landlordName={landlordName}
              paymentLogId={existingLog?.paymentLogId}
              isPaid={isPaid}
              onClose={onClose}
            />
          ) : (
            <>
              {propertyName ? (
                <p className="text-sm font-semibold text-[#2D3748]">
                  <span aria-hidden="true">🏠 </span>
                  {propertyName}
                </p>
              ) : null}
              {propertyLocation ? (
                <p className="mt-1 text-sm text-[#718096]">
                  <span aria-hidden="true">📍 </span>
                  {propertyLocation}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] px-4 py-3 text-sm">
                <span className="font-semibold text-[#2D3748]">
                  <span aria-hidden="true">💰 </span>
                  Amount: <span className="text-[#E88D5B]">{formatRm(monthlyRent)}</span>
                </span>
                <span className="hidden text-[#CBD5E0] sm:inline" aria-hidden="true">
                  │
                </span>
                <span className="text-[#4A5568]">
                  <span aria-hidden="true">📅 </span>
                  Due: {dueDateLabel(year, month)}
                </span>
                <span className="hidden text-[#CBD5E0] sm:inline" aria-hidden="true">
                  │
                </span>
                <span className="font-medium text-amber-700">
                  <span aria-hidden="true">⏳ </span>
                  Status: Pending
                </span>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold text-[#2D3748]">How did you pay?</p>
                <div
                  className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"
                  role="radiogroup"
                  aria-label="Payment method"
                >
                  {PAYMENT_METHODS.map((method) => {
                    const selected = selectedMethod === method.id
                    return (
                      <button
                        key={method.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={busy}
                        onClick={() => selectMethod(method.id)}
                        className={[
                          'flex flex-col items-center rounded-xl border-2 px-2 py-3 text-center transition sm:px-3 sm:py-4',
                          selected
                            ? 'border-[#E88D5B] bg-[#FFF7F3] shadow-sm ring-2 ring-[#E88D5B]/20'
                            : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E0] hover:bg-[#F7FAFC]',
                        ].join(' ')}
                      >
                        <span className="text-xl sm:text-2xl" aria-hidden="true">
                          {method.icon}
                        </span>
                        <span className="mt-1.5 text-xs font-bold text-[#2D3748] sm:text-sm">{method.title}</span>
                        <span className="mt-0.5 text-[10px] leading-tight text-[#718096] sm:text-xs">
                          {method.subtitle}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {selectedMethod === 'bank_transfer' ? (
                <section className="mt-5 rounded-xl border border-[#E2E8F0] bg-white p-4">
                  <h3 className="text-sm font-semibold text-[#2D3748]">Bank transfer details</h3>
                  {bankName || bankAccount ? (
                    <ul className="mt-2 space-y-1 text-sm text-[#4A5568]">
                      {bankName ? (
                        <li>
                          <span className="text-[#A0AEC0]">Bank: </span>
                          {bankName}
                        </li>
                      ) : null}
                      {bankAccount ? (
                        <li>
                          <span className="text-[#A0AEC0]">Account: </span>
                          <span className="font-mono">{bankAccount}</span>
                        </li>
                      ) : null}
                      {bankHolder ? (
                        <li>
                          <span className="text-[#A0AEC0]">Name: </span>
                          {bankHolder}
                        </li>
                      ) : null}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-[#718096]">
                      Ask your landlord for bank details if none are listed on MySewa.
                    </p>
                  )}
                </section>
              ) : null}

              {selectedMethod === 'duitnow_qr' ? (
                <section className="mt-5 rounded-xl border border-[#E2E8F0] bg-white p-4">
                  <h3 className="text-sm font-semibold text-[#2D3748]">Scan to pay</h3>
                  {resolvedQr ? (
                    <img
                      src={resolvedQr}
                      alt="Landlord DuitNow QR"
                      className="mx-auto mt-3 max-h-44 rounded-lg border border-[#E2E8F0] object-contain"
                    />
                  ) : (
                    <p className="mt-2 text-sm text-[#718096]">
                      No QR code on file — ask your landlord for their DuitNow QR.
                    </p>
                  )}
                </section>
              ) : null}

              {selectedMethod === 'toyyibpay' ? (
                <section className="mt-5 rounded-xl border border-[#E2E8F0] bg-white p-4">
                  <h3 className="text-sm font-semibold text-[#2D3748]">ToyyibPay</h3>
                  <p className="mt-1 text-sm text-[#718096]">Secure online payment gateway</p>
                  {!toyyibOptions?.enabled ? (
                    <p className="mt-2 text-sm text-[#718096]">
                      ToyyibPay is not available on this server. Use another method or contact support.
                      {toyyibOptions?.setupHint ? ` (${String(toyyibOptions.setupHint)})` : null}
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void initToyyib()}
                        className="rounded-lg bg-[#2D3748] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1A202C]"
                      >
                        {toyyibLoading ? 'Preparing…' : toyyibPayUrl ? 'Regenerate link' : 'Get ToyyibPay link'}
                      </button>
                      {toyyibPayUrl ? (
                        <a
                          href={toyyibPayUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] px-4 py-2 text-sm font-semibold text-[#2D3748] transition hover:bg-[#EDF2F7]"
                        >
                          Pay in new tab
                        </a>
                      ) : null}
                    </div>
                  )}
                </section>
              ) : null}

              {selectedMethod === 'cash' ? (
                <p className="mt-5 rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] px-4 py-3 text-sm text-[#4A5568]">
                  Pay your landlord in cash as agreed. No receipt upload needed — your landlord can verify
                  manually when you mark as paid.
                </p>
              ) : null}

              {showReceiptUpload ? (
                <section className="mt-5 rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] p-4">
                  <p className="text-sm font-semibold text-[#2D3748]">
                    📤 Upload Payment Receipt
                    <span className="ml-1 font-normal text-[#718096]">
                      (Required for QR / Bank / ToyyibPay)
                    </span>
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        e.target.value = ''
                        if (file) pickReceiptFile(file)
                      }}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#2D3748] shadow-sm transition hover:bg-[#EDF2F7]"
                    >
                      Choose File
                    </button>
                    <span className="text-sm text-[#718096]">
                      {receiptFile ? receiptFile.name : 'No file chosen'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#A0AEC0]">JPG, PNG, PDF (max 5MB)</p>
                  {receiptPreview ? (
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="mt-3 max-h-32 rounded-lg border border-[#E2E8F0] object-contain"
                    />
                  ) : null}
                  {receiptFile && !receiptPreview ? (
                    <p className="mt-2 text-xs font-medium text-[#4A5568]">PDF selected: {receiptFile.name}</p>
                  ) : null}
                </section>
              ) : null}
            </>
          )}
        </div>

        {!showSuccessView ? (
        <footer className="shrink-0 flex flex-wrap items-center justify-end gap-3 border-t border-[#E2E8F0] bg-[#F7FAFC] px-6 py-4">
          <>
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="rounded-lg border-2 border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D3748] transition hover:bg-[#EDF2F7]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void handleMarkAsPaid()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#E88D5B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d97a48] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving || uploading ? 'Saving…' : '✅ Mark as Paid'}
              </button>
            </>
        </footer>
        ) : null}
      </div>
    </div>
  )
}
