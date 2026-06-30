import { useMemo } from 'react'
import { ReceiptCard } from '../ReceiptModal'
import { useToast } from '../../context/ToastContext'
import { buildRentReceiptData, downloadRentReceipt, formatReceiptDate } from '../../utils/ReceiptGenerator'
import { formatRm } from '../../utils/rentTrackerUtils'

function methodLabel(code) {
  switch (String(code || '').toLowerCase()) {
    case 'cash':
      return 'Cash'
    case 'bank_transfer':
      return 'Bank Transfer'
    case 'duitnow_qr':
      return 'QR Code'
    case 'toyyibpay':
      return 'ToyyibPay'
    default:
      return code || '—'
  }
}

/**
 * Student view after logging rent payment or when payment is confirmed.
 */
export default function RentPaymentSuccessModal({
  monthTitle,
  propertyName,
  propertyAddress,
  amount,
  paymentMethod,
  loggedAt,
  bookingId,
  year,
  month,
  studentName,
  landlordName,
  paymentLogId,
  isPaid = false,
  onClose,
}) {
  const { pushToast } = useToast()

  const receipt = useMemo(
    () =>
      isPaid
        ? buildRentReceiptData({
            bookingId,
            year,
            month,
            amount,
            paymentMethod,
            paymentLogId,
            studentName,
            propertyName,
            propertyAddress,
            landlordName,
            recordedAt: loggedAt,
            loggedAt,
          })
        : null,
    [
      isPaid,
      bookingId,
      year,
      month,
      amount,
      paymentMethod,
      paymentLogId,
      studentName,
      propertyName,
      propertyAddress,
      landlordName,
      loggedAt,
    ],
  )

  function handleDownloadReceipt() {
    if (!receipt) return
    try {
      downloadRentReceipt(receipt)
      pushToast({ message: 'Receipt downloaded.', type: 'success' })
    } catch (e) {
      pushToast({ message: e.message || 'Could not generate receipt.', type: 'error' })
    }
  }

  return (
    <div className="space-y-5 py-1">
      {isPaid && receipt ? (
        <>
          <ReceiptCard receipt={receipt} />
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={handleDownloadReceipt}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2D3748] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1A202C]"
            >
              <span aria-hidden="true">📥</span>
              Download Receipt
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-[#E88D5B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#d97a48]"
            >
              Done
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">
              ⏳
            </div>
          </div>

          {propertyName ? (
            <p className="text-sm font-semibold text-[#2D3748]">
              <span aria-hidden="true">🏠 </span>
              {propertyName}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] px-4 py-3 text-sm">
            <span className="font-semibold text-[#2D3748]">
              Amount: <span className="text-[#E88D5B]">{formatRm(amount)}</span>
            </span>
            <span className="hidden text-[#CBD5E0] sm:inline" aria-hidden="true">
              │
            </span>
            <span className="font-medium text-amber-700">Status: Pending Confirmation</span>
          </div>

          {paymentMethod ? (
            <p className="text-sm text-[#4A5568]">
              Payment Method:{' '}
              <span className="font-semibold text-[#2D3748]">{methodLabel(paymentMethod)}</span>
            </p>
          ) : null}

          {loggedAt ? (
            <p className="text-xs text-[#A0AEC0]">Logged: {formatReceiptDate(loggedAt)}</p>
          ) : null}

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">✅ Your payment has been logged.</p>
            <p className="mt-1 text-amber-800">The landlord will confirm your payment soon.</p>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-[#E88D5B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#d97a48]"
            >
              Done
            </button>
          </div>
        </>
      )}
    </div>
  )
}
