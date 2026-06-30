import { useEffect, useMemo, useState } from 'react'

import { useToast } from '../../context/ToastContext'

import { confirmRentPayment } from '../../services/rentPaymentService'

import { formatReceiptDate } from '../../utils/ReceiptGenerator'

import { formatRm } from '../../utils/rentTrackerUtils'



function paymentMethodLabel(code) {

  switch (String(code || '').toLowerCase()) {

    case 'cash':

      return 'Cash'

    case 'bank_transfer':

      return 'Bank Transfer'

    case 'duitnow_qr':

      return 'QR Code (DuitNow)'

    case 'toyyibpay':

      return 'ToyyibPay'

    default:

      return code ? String(code) : '—'

  }

}



function receiptHref(url) {

  if (!url) return ''

  const s = String(url).trim()

  if (!s) return ''

  if (/^https?:\/\//i.test(s)) return s

  return s.startsWith('/') ? s : `/${s}`

}



function parseAmountMyr(str) {

  const n = Number(String(str ?? '').replace(/,/g, '').trim())

  if (!Number.isFinite(n)) return Number.NaN

  return Math.round(n * 100) / 100

}



/**

 * Landlord rent payment confirmation — confirm or reject student-logged payments.

 */

export default function RentConfirmationModal({

  applicationId,

  year,

  month,

  monthLabel,

  propertyName,

  studentName,

  defaultAmountHint,

  existingRecord,

  studentPaymentLog,

  onClose,

  onSaved,

}) {

  const { pushToast } = useToast()

  const hasListingRent =

    defaultAmountHint != null && Number.isFinite(Number(defaultAmountHint)) && Number(defaultAmountHint) > 0

  const [amountStr, setAmountStr] = useState('')

  const [saving, setSaving] = useState(null)

  const busy = saving != null



  const isPaid = existingRecord?.monthState === 'received'

  const isPending = Boolean(studentPaymentLog) && !isPaid

  const paymentLogId = studentPaymentLog?.paymentLogId ?? studentPaymentLog?.id ?? null



  const displayAmount = useMemo(() => {

    if (existingRecord?.amount != null && Number.isFinite(Number(existingRecord.amount))) {

      return Number(existingRecord.amount)

    }

    if (hasListingRent) return Number(defaultAmountHint)

    const amt = parseAmountMyr(amountStr)

    return Number.isFinite(amt) ? amt : null

  }, [existingRecord, hasListingRent, defaultAmountHint, amountStr])



  const title = useMemo(() => {

    if (isPaid) return `✅ Rent Paid — ${monthLabel}`

    return `💰 Rent — ${monthLabel}`

  }, [isPaid, monthLabel])



  const statusLabel = isPaid ? 'Paid' : isPending ? 'Pending Confirmation' : 'Awaiting payment'

  const statusClass = isPaid

    ? 'text-green-700'

    : isPending

      ? 'text-amber-700'

      : 'text-[#718096]'



  useEffect(() => {

    if (existingRecord?.amount != null && Number.isFinite(Number(existingRecord.amount))) {

      setAmountStr(Number(existingRecord.amount).toFixed(2))

    } else if (hasListingRent) {

      setAmountStr(Number(defaultAmountHint).toFixed(2))

    } else {

      setAmountStr('')

    }

  }, [existingRecord, defaultAmountHint, year, month, hasListingRent])



  async function markPaidLegacy() {

    const token = localStorage.getItem('mysewa_token')

    if (!token || !applicationId) return



    let body

    if (hasListingRent) {

      body = { year, month }

    } else {

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

      onClose()

    } catch (e) {

      pushToast({ message: e.message || 'Failed to save.', type: 'error' })

    } finally {

      setSaving(null)

    }

  }



  async function handleConfirm() {

    const token = localStorage.getItem('mysewa_token')

    if (!token) return



    if (paymentLogId != null && isPending) {

      let amountOverride = null

      if (!hasListingRent) {

        const amt = parseAmountMyr(amountStr)

        if (!Number.isFinite(amt) || amt < 1) {

          pushToast({

            message: 'Enter an amount of at least RM 1.00 (this listing has no monthly rent on file).',

            type: 'error',

          })

          return

        }

        amountOverride = amt

      }



      setSaving('confirm')

      try {

        const data = await confirmRentPayment(

          paymentLogId,

          amountOverride != null ? { amount: amountOverride } : {},

          token,

        )

        pushToast({ message: data.message || `${monthLabel} confirmed as paid.`, type: 'success' })

        if (typeof onSaved === 'function') onSaved(data)

        onClose()

      } catch (e) {

        pushToast({ message: e.message || 'Failed to confirm payment.', type: 'error' })

      } finally {

        setSaving(null)

      }

      return

    }



    await markPaidLegacy()

  }



  async function rejectPayment() {

    const token = localStorage.getItem('mysewa_token')

    if (!token || !applicationId || !studentPaymentLog) return

    const ok = window.confirm('Reject this payment? The student will need to log payment again.')

    if (!ok) return



    setSaving('reject')

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

      pushToast({ message: 'Payment rejected. Student can submit again.', type: 'success' })

      if (typeof onSaved === 'function') onSaved(data)

      onClose()

    } catch (e) {

      pushToast({ message: e.message || 'Failed to reject.', type: 'error' })

    } finally {

      setSaving(null)

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

        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl"

        role="dialog"

        aria-modal="true"

        aria-labelledby="rent-confirmation-title"

        onMouseDown={(e) => e.stopPropagation()}

      >

        <header className="border-b border-[#E2E8F0] bg-[#F7FAFC] px-6 py-4">

          <div className="flex items-start justify-between gap-3">

            <h2 id="rent-confirmation-title" className="text-lg font-bold text-[#2D3748]">

              {title}

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



        <div className="space-y-4 px-6 py-5">

          {propertyName ? (

            <p className="text-sm font-semibold text-[#2D3748]">

              <span aria-hidden="true">🏠 </span>

              {propertyName}

            </p>

          ) : null}



          {studentName ? (

            <p className="text-sm text-[#4A5568]">

              <span aria-hidden="true">👤 </span>

              {studentName}

            </p>

          ) : null}



          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] px-4 py-3 text-sm">

            <span className="font-semibold text-[#2D3748]">

              Amount: <span className="text-[#E88D5B]">{formatRm(displayAmount)}</span>

            </span>

            <span className="hidden text-[#CBD5E0] sm:inline" aria-hidden="true">

              │

            </span>

            <span className={`font-medium ${statusClass}`}>Status: {statusLabel}</span>

          </div>



          {studentPaymentLog?.paymentMethod ? (

            <p className="text-sm text-[#4A5568]">

              Payment Method:{' '}

              <span className="font-semibold text-[#2D3748]">

                {paymentMethodLabel(studentPaymentLog.paymentMethod)}

              </span>

            </p>

          ) : null}



          {studentPaymentLog?.loggedAt ? (

            <p className="text-xs text-[#A0AEC0]">

              Logged: {formatReceiptDate(studentPaymentLog.loggedAt)}

            </p>

          ) : null}



          {studentPaymentLog?.receiptUrl && isPending ? (

            <a

              href={receiptHref(studentPaymentLog.receiptUrl)}

              target="_blank"

              rel="noreferrer"

              className="inline-block text-sm font-semibold text-[#E88D5B] hover:underline"

            >

              View uploaded proof →

            </a>

          ) : null}



          {!hasListingRent && !isPaid ? (

            <div>

              <label className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]" htmlFor="rent-amt">

                Amount (MYR)

              </label>

              <input

                id="rent-amt"

                type="text"

                inputMode="decimal"

                autoComplete="off"

                value={amountStr}

                onChange={(e) => setAmountStr(e.target.value)}

                disabled={busy}

                placeholder="e.g. 500.00"

                className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#2D3748] focus:border-[#E88D5B] focus:outline-none focus:ring-2 focus:ring-[#E88D5B]/20"

              />

            </div>

          ) : null}

        </div>



        <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-[#E2E8F0] bg-[#F7FAFC] px-6 py-4">

          {isPaid ? (

            <button

              type="button"

              onClick={onClose}

              className="rounded-lg bg-[#E88D5B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d97a48]"

            >

              Close

            </button>

          ) : isPending ? (

            <>

              <button

                type="button"

                disabled={busy}

                onClick={() => void rejectPayment()}

                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"

              >

                <span aria-hidden="true">❌</span>

                {saving === 'reject' ? 'Rejecting…' : 'Reject'}

              </button>

              <button

                type="button"

                disabled={busy || (paymentLogId == null && !hasListingRent && !parseAmountMyr(amountStr))}

                onClick={() => void handleConfirm()}

                className="inline-flex items-center gap-2 rounded-lg bg-[#E88D5B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d97a48] disabled:opacity-50"

              >

                <span aria-hidden="true">✅</span>

                {saving === 'confirm' || saving === 'paid' ? 'Confirming…' : 'Confirm'}

              </button>

            </>

          ) : (

            <>

              <button

                type="button"

                disabled={busy}

                onClick={onClose}

                className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#718096] transition hover:bg-[#EDF2F7]"

              >

                Cancel

              </button>

              <button

                type="button"

                disabled={busy}

                onClick={() => void handleConfirm()}

                className="inline-flex items-center gap-2 rounded-lg bg-[#E88D5B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d97a48] disabled:opacity-50"

              >

                <span aria-hidden="true">✅</span>

                {saving === 'paid' ? 'Saving…' : 'Confirm'}

              </button>

            </>

          )}

        </footer>

      </div>

    </div>

  )

}


