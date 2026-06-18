import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../context/ToastContext'

function formatRm(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return null
  try {
    return `RM ${Number(amount).toFixed(2)}`
  } catch {
    return null
  }
}

function methodLabel(code) {
  switch (code) {
    case 'cash':
      return 'Cash'
    case 'bank_transfer':
      return 'Bank transfer'
    case 'duitnow_qr':
      return 'QR code'
    case 'toyyibpay':
      return 'ToyyibPay'
    default:
      return code || '—'
  }
}

/** Student rent payment: choose channel, follow steps, confirm. */
export default function StudentRentPaymentHintModal({
  applicationId,
  year,
  month,
  monthLabel,
  monthlyRent,
  existingLog,
  onClose,
  onSaved,
}) {
  const { pushToast } = useToast()
  const [manual, setManual] = useState(null)
  const [saving, setSaving] = useState(null)
  /** @type {'cash' | 'bank' | 'qr' | 'toyyib' | null} */
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [ackCash, setAckCash] = useState(false)
  const [ackToyyib, setAckToyyib] = useState(false)
  const [receiptUrl, setReceiptUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [toyyibPayUrl, setToyyibPayUrl] = useState(null)
  const [toyyibLoading, setToyyibLoading] = useState(false)
  const [toyyibOptions, setToyyibOptions] = useState(null)

  const alreadyLogged = existingLog != null
  const busy = saving != null

  const resetFlow = useCallback(() => {
    setSelectedMethod(null)
    setAckCash(false)
    setAckToyyib(false)
    setReceiptUrl(null)
    setToyyibPayUrl(null)
  }, [])

  useEffect(() => {
    resetFlow()
  }, [applicationId, year, month, resetFlow])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [manRes, tpRes] = await Promise.all([
          fetch('/api/v1/payments/manual-instructions'),
          fetch('/api/v1/payments/toyyibpay/options'),
        ])
        const man = await manRes.json().catch(() => ({}))
        const tp = await tpRes.json().catch(() => ({}))
        if (!cancelled) {
          if (manRes.ok && man && typeof man === 'object') setManual(man)
          if (tpRes.ok && tp && typeof tp === 'object') setToyyibOptions(tp)
        }
      } catch {
        if (!cancelled) {
          setManual(null)
          setToyyibOptions(null)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const rentLine = formatRm(monthlyRent)

  async function uploadReceiptFile(file) {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !applicationId || !file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(
        `/api/v1/applications/${encodeURIComponent(applicationId)}/rent-months/receipt-upload`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Upload failed (${res.status})`)
      if (!data.url) throw new Error('No file URL returned')
      setReceiptUrl(String(data.url))
      pushToast({ message: 'Receipt uploaded.', type: 'success' })
    } catch (e) {
      pushToast({ message: e.message || 'Upload failed.', type: 'error' })
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
      pushToast({ message: 'ToyyibPay link ready — open it in a new tab to pay.', type: 'success' })
    } catch (e) {
      pushToast({ message: e.message || 'Could not start ToyyibPay.', type: 'error' })
    } finally {
      setToyyibLoading(false)
    }
  }

  function mapUiToApiMethod(ui) {
    if (ui === 'bank') return 'bank_transfer'
    if (ui === 'qr') return 'duitnow_qr'
    if (ui === 'toyyib') return 'toyyibpay'
    if (ui === 'cash') return 'cash'
    return null
  }

  const canConfirm =
    selectedMethod === 'cash'
      ? ackCash
      : selectedMethod === 'bank'
        ? Boolean(receiptUrl)
        : selectedMethod === 'qr'
          ? Boolean(receiptUrl)
          : selectedMethod === 'toyyib'
            ? Boolean(toyyibPayUrl) && ackToyyib
            : false

  async function confirmSubmit() {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !applicationId) return
    const paymentMethod = mapUiToApiMethod(selectedMethod)
    if (!paymentMethod) {
      pushToast({ message: 'Choose how you paid first.', type: 'info' })
      return
    }
    setSaving('log')
    try {
      const res = await fetch(
        `/api/v1/applications/${encodeURIComponent(applicationId)}/rent-months/student-payment-log`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            year,
            month,
            paymentMethod,
            receiptUrl: receiptUrl || null,
          }),
        },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not save (${res.status})`)
      pushToast({ message: 'Payment recorded — your landlord can review the receipt on their side.', type: 'success' })
      if (typeof onSaved === 'function') onSaved(data)
    } catch (e) {
      pushToast({ message: e.message || 'Failed to save.', type: 'error' })
    } finally {
      setSaving(null)
    }
  }

  async function clearLog() {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !applicationId) return
    setSaving('clear')
    try {
      const res = await fetch(
        `/api/v1/applications/${encodeURIComponent(applicationId)}/rent-months/student-payment-log/clear`,
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
      if (!res.ok) throw new Error(data.message || `Could not clear (${res.status})`)
      pushToast({ message: 'Your payment log for this month was removed.', type: 'success' })
      if (typeof onSaved === 'function') onSaved(data)
    } catch (e) {
      pushToast({ message: e.message || 'Failed to clear.', type: 'error' })
    } finally {
      setSaving(null)
    }
  }

  function onBackdropMouseDown(e) {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div
      className="student-rent-payment-modal-backdrop"
      role="presentation"
      onMouseDown={onBackdropMouseDown}
      aria-hidden="true"
    >
      <div
        className="student-pay-modal landlord-rent-month-modal student-rent-payment-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-rent-pay-hint-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="student-pay-modal-head">
          <h2 id="student-rent-pay-hint-title">Pay rent — {monthLabel}</h2>
          <button type="button" className="student-pay-modal-close" onClick={onClose} disabled={busy} aria-label="Close">
            ×
          </button>
        </header>

        {alreadyLogged ? (
          <>
            <p className="landlord-rent-month-modal-current">
              Logged as <strong>{methodLabel(existingLog.paymentMethod)}</strong>
              {existingLog.loggedAt ? (
                <>
                  {' '}
                  · <span className="student-dash-muted">{String(existingLog.loggedAt)}</span>
                </>
              ) : null}
            </p>
            {existingLog.receiptUrl ? (
              <p className="landlord-rent-month-modal-hint">
                Receipt:{' '}
                <a href={existingLog.receiptUrl} target="_blank" rel="noreferrer">
                  View uploaded file
                </a>
              </p>
            ) : null}
            <div className="student-pay-modal-foot landlord-rent-month-modal-actions">
              <button
                type="button"
                className="landlord-application-status-btn landlord-application-status-btn--ghost"
                disabled={busy}
                onClick={clearLog}
              >
                {saving === 'clear' ? 'Removing…' : 'Remove my log'}
              </button>
              <div className="landlord-rent-month-modal-actions-right">
                <button
                  type="button"
                  className="landlord-application-status-btn landlord-application-status-btn--ghost"
                  disabled={busy}
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="student-pay-modal-sub landlord-rent-month-modal-lead">
              Choose how you are paying this month&apos;s rent, complete the steps, then <strong>Confirm</strong>.
            </p>

            {rentLine ? (
              <p className="landlord-rent-month-modal-amount-line">
                Amount for this tenancy: <strong>{rentLine}</strong> (from the listing — confirm with your landlord if
                needed).
              </p>
            ) : (
              <p className="landlord-rent-month-modal-hint">
                No monthly rent on file in MySewa — confirm the amount with your landlord before paying.
              </p>
            )}

            <div className="student-rent-pay-channel-grid" role="group" aria-label="Payment method">
              {[
                { id: 'cash', label: 'Cash' },
                { id: 'bank', label: 'Bank transfer' },
                { id: 'qr', label: 'QR code' },
                { id: 'toyyib', label: 'ToyyibPay' },
              ].map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  className={[
                    'student-rent-pay-channel-btn',
                    selectedMethod === ch.id ? 'student-rent-pay-channel-btn--on' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={busy}
                  onClick={() => {
                    setSelectedMethod(ch.id)
                    setAckCash(false)
                    setAckToyyib(false)
                    setReceiptUrl(null)
                    setToyyibPayUrl(null)
                  }}
                >
                  {ch.label}
                </button>
              ))}
            </div>

            {selectedMethod === 'cash' ? (
              <section className="student-rent-pay-panel" aria-labelledby="srp-cash-heading">
                <h3 id="srp-cash-heading" className="student-rent-pay-panel-title">
                  Cash
                </h3>
                <p className="landlord-rent-month-modal-hint">
                  Pay your landlord in cash as agreed. Tick the box below to confirm you understand this is your record
                  only until your landlord marks the month as paid in MySewa.
                </p>
                <label className="student-rent-pay-check">
                  <input type="checkbox" checked={ackCash} onChange={(e) => setAckCash(e.target.checked)} disabled={busy} />
                  <span>I have paid or will pay this month&apos;s rent in cash to my landlord.</span>
                </label>
              </section>
            ) : null}

            {selectedMethod === 'bank' ? (
              <section className="student-rent-pay-panel" aria-labelledby="srp-bank-heading">
                <h3 id="srp-bank-heading" className="student-rent-pay-panel-title">
                  Bank transfer
                </h3>
                <p className="student-dash-muted student-rent-pay-panel-note">
                  Reference account on file for MySewa (verify with your landlord — they may use different bank
                  details).
                </p>
                {manual?.bankName ? (
                  <p className="student-rent-pay-hint-line">
                    <strong>Bank</strong> {String(manual.bankName)}
                  </p>
                ) : null}
                {manual?.bankAccount ? (
                  <p className="student-rent-pay-hint-line">
                    <strong>Account number</strong> {String(manual.bankAccount)}
                  </p>
                ) : null}
                {manual?.bankHolder ? (
                  <p className="student-rent-pay-hint-line">
                    <strong>Account name</strong> {String(manual.bankHolder)}
                  </p>
                ) : (
                  <p className="landlord-rent-month-modal-hint">No bank details configured — ask your landlord.</p>
                )}
                <label className="student-rent-pay-upload-label">
                  Upload receipt (image or PDF)
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    disabled={busy || uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ''
                      if (f) void uploadReceiptFile(f)
                    }}
                  />
                </label>
                {uploading ? <p className="student-dash-muted">Uploading…</p> : null}
                {receiptUrl ? (
                  <p className="landlord-rent-month-modal-hint">
                    Uploaded:{' '}
                    <a href={receiptUrl} target="_blank" rel="noreferrer">
                      Preview receipt
                    </a>
                  </p>
                ) : null}
              </section>
            ) : null}

            {selectedMethod === 'qr' ? (
              <section className="student-rent-pay-panel" aria-labelledby="srp-qr-heading">
                <h3 id="srp-qr-heading" className="student-rent-pay-panel-title">
                  QR code
                </h3>
                <p className="student-dash-muted student-rent-pay-panel-note">
                  Scan the DuitNow / QR reference below if configured. Confirm with your landlord if unsure.
                </p>
                {manual?.qrImageUrl ? (
                  <div className="student-rent-pay-qr-wrap">
                    <img src={String(manual.qrImageUrl)} alt="Payment QR reference" className="student-rent-pay-qr-img" />
                  </div>
                ) : (
                  <p className="landlord-rent-month-modal-hint">No QR image URL is configured for MySewa — ask your landlord for their QR.</p>
                )}
                <label className="student-rent-pay-upload-label">
                  Upload receipt (image or PDF)
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    disabled={busy || uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ''
                      if (f) void uploadReceiptFile(f)
                    }}
                  />
                </label>
                {uploading ? <p className="student-dash-muted">Uploading…</p> : null}
                {receiptUrl ? (
                  <p className="landlord-rent-month-modal-hint">
                    Uploaded:{' '}
                    <a href={receiptUrl} target="_blank" rel="noreferrer">
                      Preview receipt
                    </a>
                  </p>
                ) : null}
              </section>
            ) : null}

            {selectedMethod === 'toyyib' ? (
              <section className="student-rent-pay-panel" aria-labelledby="srp-tp-heading">
                <h3 id="srp-tp-heading" className="student-rent-pay-panel-title">
                  ToyyibPay
                </h3>
                {!toyyibOptions?.enabled ? (
                  <p className="landlord-rent-month-modal-hint">
                    ToyyibPay is not available on this server. Use another method or contact support.
                    {toyyibOptions?.setupHint ? ` (${String(toyyibOptions.setupHint)})` : null}
                  </p>
                ) : (
                  <>
                    <p className="landlord-rent-month-modal-hint">
                      Generate a secure ToyyibPay link for this month&apos;s rent (same listing rent amount). Complete
                      payment in the ToyyibPay tab, then return here and confirm.
                    </p>
                    <div className="student-rent-pay-toyyib-actions">
                      <button
                        type="button"
                        className="landlord-application-status-btn landlord-application-status-btn--accept"
                        disabled={busy || toyyibLoading}
                        onClick={() => void initToyyib()}
                      >
                        {toyyibLoading ? 'Preparing…' : toyyibPayUrl ? 'Regenerate link' : 'Open ToyyibPay link'}
                      </button>
                      {toyyibPayUrl ? (
                        <a
                          className="landlord-application-status-btn landlord-application-status-btn--ghost"
                          href={toyyibPayUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Pay in new tab
                        </a>
                      ) : null}
                    </div>
                    <label className="student-rent-pay-check">
                      <input
                        type="checkbox"
                        checked={ackToyyib}
                        onChange={(e) => setAckToyyib(e.target.checked)}
                        disabled={busy}
                      />
                      <span>I opened ToyyibPay and completed or started payment for this month.</span>
                    </label>
                  </>
                )}
              </section>
            ) : null}

            <div className="student-pay-modal-foot landlord-rent-month-modal-actions student-rent-pay-modal-foot">
              <button
                type="button"
                className="landlord-application-status-btn landlord-application-status-btn--ghost"
                disabled={busy}
                onClick={() => {
                  if (selectedMethod) resetFlow()
                  else onClose()
                }}
              >
                {selectedMethod ? 'Change method' : 'Cancel'}
              </button>
              <div className="landlord-rent-month-modal-actions-right">
                <button
                  type="button"
                  className="landlord-application-status-btn landlord-application-status-btn--ghost"
                  disabled={busy}
                  onClick={onClose}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="landlord-application-status-btn landlord-application-status-btn--accept"
                  disabled={busy || !selectedMethod || !canConfirm}
                  onClick={() => void confirmSubmit()}
                >
                  {saving === 'log' ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
