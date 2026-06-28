import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../context/ToastContext'
import MarkRentPaidConfirmModal from './rent-tracker/MarkRentPaidConfirmModal'
import MarkRentUnavailableConfirmModal from './rent-tracker/MarkRentUnavailableConfirmModal'
import { MONTH_FULL } from '../utils/rentTrackerUtils'

function formatRm(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  try {
    return `RM ${Number(amount).toFixed(2)}`
  } catch {
    return String(amount)
  }
}

function channelLabel(id) {
  if (id === 'rent_auto' || !id) return 'Standard (listing & app payment settings)'
  return id || '—'
}

function parseAmountMyr(str) {
  const n = Number(String(str ?? '').replace(/,/g, '').trim())
  if (!Number.isFinite(n)) return Number.NaN
  return Math.round(n * 100) / 100
}

function studentRentPaymentMethodLabel(code) {
  switch (String(code || '').toLowerCase()) {
    case 'cash':
      return 'Cash'
    case 'bank_transfer':
      return 'Bank transfer'
    case 'duitnow_qr':
      return 'QR code (DuitNow)'
    case 'toyyibpay':
      return 'ToyyibPay'
    default:
      return code ? String(code) : 'Not specified'
  }
}

function receiptHref(url) {
  if (!url) return ''
  const s = String(url).trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  return s.startsWith('/') ? s : `/${s}`
}

function isImageReceiptUrl(url) {
  return /\.(png|jpe?g|gif|webp)(\?|#|$)/i.test(String(url))
}

/**
 * Landlord confirms rent received for one month. Amount defaults from the listing; payment context is automatic.
 */
export default function LandlordRentMonthModal({
  applicationId,
  year,
  month,
  monthLabel,
  propertyName,
  defaultAmountHint,
  existingRecord,
  studentPaymentLog,
  onClose,
  onSaved,
}) {
  const { pushToast } = useToast()
  const hasListingRent =
    defaultAmountHint != null && Number.isFinite(Number(defaultAmountHint)) && Number(defaultAmountHint) > 0
  const [amountStr, setAmountStr] = useState(() => {
    if (existingRecord?.amount != null && Number.isFinite(Number(existingRecord.amount))) {
      return Number(existingRecord.amount).toFixed(2)
    }
    if (hasListingRent) return Number(defaultAmountHint).toFixed(2)
    return ''
  })
  const [saving, setSaving] = useState(null)
  const [showPaidConfirm, setShowPaidConfirm] = useState(false)
  const [showUnavailableConfirm, setShowUnavailableConfirm] = useState(false)
  const busy = saving != null
  const confirmMonthLabel = `${MONTH_FULL[month - 1]} ${year}`

  useEffect(() => {
    if (existingRecord?.amount != null && Number.isFinite(Number(existingRecord.amount))) {
      setAmountStr(Number(existingRecord.amount).toFixed(2))
    } else if (hasListingRent) {
      setAmountStr(Number(defaultAmountHint).toFixed(2))
    } else {
      setAmountStr('')
    }
  }, [existingRecord, defaultAmountHint, year, month])

  const title = useMemo(() => `Rent — ${monthLabel}`, [monthLabel])

  const confirmAmount = useMemo(() => {
    if (existingRecord?.amount != null && Number.isFinite(Number(existingRecord.amount))) {
      return Number(existingRecord.amount)
    }
    if (hasListingRent) return Number(defaultAmountHint)
    const amt = parseAmountMyr(amountStr)
    return Number.isFinite(amt) ? amt : null
  }, [existingRecord, hasListingRent, defaultAmountHint, amountStr])

  function requestMarkPaid() {
    if (!hasListingRent) {
      const amt = parseAmountMyr(amountStr)
      if (!Number.isFinite(amt) || amt < 1) {
        pushToast({
          message: 'Enter an amount of at least RM 1.00 (this listing has no monthly rent on file).',
          type: 'error',
        })
        return
      }
      if (amt > 999999.99) {
        pushToast({ message: 'Amount is too large.', type: 'error' })
        return
      }
    }
    setShowPaidConfirm(true)
  }

  async function markPaid() {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !applicationId) return

    let body
    if (hasListingRent) {
      body = { year, month }
    } else {
      const amt = parseAmountMyr(amountStr)
      if (!Number.isFinite(amt) || amt < 1) {
        pushToast({ message: 'Enter an amount of at least RM 1.00 (this listing has no monthly rent on file).', type: 'error' })
        return
      }
      if (amt > 999999.99) {
        pushToast({ message: 'Amount is too large.', type: 'error' })
        return
      }
      body = { year, month, amount: amt }
    }

    setSaving('paid')
    try {
      const res = await fetch(`/api/v1/applications/${encodeURIComponent(applicationId)}/rent-months/mark-paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not save (${res.status})`)
      pushToast({ message: `${monthLabel} marked as paid.`, type: 'success' })
      if (typeof onSaved === 'function') onSaved(data)
      setShowPaidConfirm(false)
      onClose()
    } catch (e) {
      pushToast({ message: e.message || 'Failed to save.', type: 'error' })
    } finally {
      setSaving(null)
    }
  }

  function requestMarkUnavailable() {
    setShowUnavailableConfirm(true)
  }

  async function markUnavailable() {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !applicationId) return
    setSaving('unavailable')
    try {
      const res = await fetch(
        `/api/v1/applications/${encodeURIComponent(applicationId)}/rent-months/mark-unavailable`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ year, month }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not save (${res.status})`)
      pushToast({ message: `${confirmMonthLabel} marked as unavailable (no rent expected).`, type: 'success' })
      if (typeof onSaved === 'function') onSaved(data)
      setShowUnavailableConfirm(false)
      onClose()
    } catch (e) {
      pushToast({ message: e.message || 'Failed to save.', type: 'error' })
    } finally {
      setSaving(null)
    }
  }

  async function clearRecord() {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !applicationId) return
    setSaving('clear')
    try {
      const res = await fetch(`/api/v1/applications/${encodeURIComponent(applicationId)}/rent-months/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ year, month }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not clear (${res.status})`)
      pushToast({ message: `${monthLabel} payment record removed.`, type: 'success' })
      if (typeof onSaved === 'function') onSaved(data)
      onClose()
    } catch (e) {
      pushToast({ message: e.message || 'Failed to clear.', type: 'error' })
    } finally {
      setSaving(null)
    }
  }

  async function rejectStudentPaymentLog() {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !applicationId || !studentPaymentLog) return
    const ok = window.confirm(
      'Reject this student payment record? They will need to choose a payment method and submit again from their dashboard.',
    )
    if (!ok) return
    setSaving('rejectStudent')
    try {
      const res = await fetch(
        `/api/v1/applications/${encodeURIComponent(applicationId)}/rent-months/student-payment-log/reject`,
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
      if (!res.ok) throw new Error(data.message || `Could not reject (${res.status})`)
      pushToast({
        message: 'Student payment record removed. They can submit a new payment update for this month.',
        type: 'success',
      })
      if (typeof onSaved === 'function') onSaved(data)
    } catch (e) {
      pushToast({ message: e.message || 'Failed to reject.', type: 'error' })
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="student-pay-modal-backdrop" role="presentation">
      <div
        className="student-pay-modal landlord-rent-month-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="landlord-rent-month-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="student-pay-modal-head">
          <h2 id="landlord-rent-month-modal-title">{title}</h2>
          <button type="button" className="student-pay-modal-close" onClick={onClose} disabled={busy} aria-label="Close">
            ×
          </button>
        </header>

        <p className="student-pay-modal-sub landlord-rent-month-modal-lead">
          MySewa uses your <strong>listing rent</strong> and shared payment settings as the payment context for the
          student — you only confirm when rent for this month is received.{' '}
          <strong>Mark as Unavailable</strong> is for a special case when no rent is expected this month (not the same
          as paid).
        </p>

        {studentPaymentLog ? (
          <section className="landlord-rent-student-log" aria-label="Student payment log">
            <h3 className="landlord-rent-student-log-title">How the student paid</h3>
            <p className="landlord-rent-student-log-lead">
              The student recorded this in MySewa. Use it together with what you actually received before you mark this
              month.
            </p>
            <p className="landlord-rent-student-log-row">
              <span className="student-dash-muted">Method · </span>
              {studentRentPaymentMethodLabel(studentPaymentLog.paymentMethod)}
            </p>
            {studentPaymentLog.loggedAt ? (
              <p className="landlord-rent-student-log-row">
                <span className="student-dash-muted">Logged · </span>
                {String(studentPaymentLog.loggedAt)}
              </p>
            ) : null}
            {studentPaymentLog.receiptUrl ? (
              <>
                <p className="landlord-rent-student-log-row">
                  <a
                    className="landlord-rent-student-log-receipt-link"
                    href={receiptHref(studentPaymentLog.receiptUrl)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open receipt (new tab)
                  </a>
                </p>
                {isImageReceiptUrl(studentPaymentLog.receiptUrl) ? (
                  <img
                    className="landlord-rent-student-log-preview"
                    src={receiptHref(studentPaymentLog.receiptUrl)}
                    alt=""
                  />
                ) : null}
              </>
            ) : ['bank_transfer', 'duitnow_qr'].includes(
                String(studentPaymentLog.paymentMethod || '').toLowerCase(),
              ) ? (
              <p className="landlord-rent-month-modal-hint">
                No receipt uploaded for this log (older entry or upload not completed).
              </p>
            ) : (
              <p className="landlord-rent-month-modal-hint">No receipt is expected for this payment type.</p>
            )}
            <div className="landlord-rent-student-log-actions">
              <button
                type="button"
                className="landlord-application-status-btn landlord-application-status-btn--reject landlord-rent-student-log-reject-btn"
                disabled={busy}
                onClick={rejectStudentPaymentLog}
              >
                {saving === 'rejectStudent' ? 'Rejecting…' : 'Reject student payment'}
              </button>
              <p className="landlord-rent-student-log-reject-hint">
                Removes their submission so they must try again before you rely on it.
              </p>
            </div>
          </section>
        ) : null}

        {existingRecord?.monthState === 'unavailable' ? (
          <p className="landlord-rent-month-modal-current landlord-rent-month-modal-current--unavailable">
            This month is marked <strong>unavailable</strong> — no rent expected (special case). Use{' '}
            <strong>Mark as Paid</strong> below if that changes, or remove the record.
          </p>
        ) : existingRecord ? (
          <p className="landlord-rent-month-modal-current">
            Current record: <strong>{formatRm(existingRecord.amount)}</strong> · {channelLabel(existingRecord.channel)}
          </p>
        ) : null}

        {hasListingRent ? (
          <p className="landlord-rent-month-modal-amount-line">
            Amount recorded: <strong>{formatRm(Number(defaultAmountHint))}</strong> (from this listing&apos;s monthly rent)
          </p>
        ) : (
          <>
            <label className="landlord-rent-month-modal-label" htmlFor="landlord-rent-month-amt">
              Amount (MYR)
            </label>
            <input
              id="landlord-rent-month-amt"
              className="landlord-rent-month-modal-input"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              disabled={busy}
              placeholder="e.g. 850.00"
            />
            <p className="landlord-rent-month-modal-hint">
              This listing has no monthly rent on file — enter the amount for this month, or set the price on{' '}
              <strong>My properties</strong> to skip this next time.
            </p>
          </>
        )}

        <div className="student-pay-modal-foot landlord-rent-month-modal-actions">
          {existingRecord ? (
            <button
              type="button"
              className="landlord-application-status-btn landlord-application-status-btn--ghost"
              disabled={busy}
              onClick={clearRecord}
            >
              {saving === 'clear' ? 'Removing…' : 'Remove record'}
            </button>
          ) : (
            <span />
          )}
          <div className="landlord-rent-month-modal-actions-right">
            <button
              type="button"
              className="landlord-application-status-btn landlord-application-status-btn--ghost"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="landlord-application-status-btn landlord-application-status-btn--unavailable"
              disabled={busy}
              onClick={requestMarkUnavailable}
            >
              {saving === 'unavailable' ? 'Saving…' : 'Mark as Unavailable'}
            </button>
            <button
              type="button"
              className="landlord-application-status-btn landlord-application-status-btn--accept"
              disabled={busy}
              onClick={requestMarkPaid}
            >
              {saving === 'paid' ? 'Saving…' : 'Mark as Paid'}
            </button>
          </div>
        </div>
      </div>

      {showPaidConfirm ? (
        <MarkRentPaidConfirmModal
          monthLabel={confirmMonthLabel}
          propertyName={propertyName}
          amount={confirmAmount}
          busy={saving === 'paid'}
          onConfirm={markPaid}
          onCancel={() => setShowPaidConfirm(false)}
        />
      ) : null}

      {showUnavailableConfirm ? (
        <MarkRentUnavailableConfirmModal
          monthLabel={confirmMonthLabel}
          propertyName={propertyName}
          amount={confirmAmount}
          busy={saving === 'unavailable'}
          onConfirm={markUnavailable}
          onCancel={() => setShowUnavailableConfirm(false)}
        />
      ) : null}
    </div>
  )
}
