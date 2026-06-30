import { useToast } from '../context/ToastContext'
import {
  downloadRentReceipt,
  formatConfirmedDateTime,
  formatReceiptAmount,
  formatReceiptDate,
  paymentMethodLabel,
} from '../utils/ReceiptGenerator'

function DetailRow({ icon, label, value, highlight }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#FBD5B0]/40 py-2.5 last:border-0">
      <span className="shrink-0 text-sm text-[#718096]">
        {icon ? <span aria-hidden="true">{icon} </span> : null}
        {label}
      </span>
      <span
        className={[
          'text-right text-sm font-semibold',
          highlight === 'amount' ? 'text-[#E88D5B]' : '',
          highlight === 'status' ? 'text-green-700' : '',
          !highlight ? 'text-[#2D3748]' : '',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  )
}

/** Card preview of a payment receipt (used inside modal). */
export function ReceiptCard({ receipt }) {
  if (!receipt) return null

  const isPaid = String(receipt.status || 'paid').toLowerCase() === 'paid'

  return (
    <article className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
      <header className="bg-[#2D3748] px-6 py-5 text-white">
        <p className="text-2xl font-bold text-[#E88D5B]">
          <span aria-hidden="true">🏠 </span>
          MySewa
        </p>
        <p className="mt-1 text-xs tracking-wide text-[#CBD5E0]">House Rental System for Students</p>
      </header>

      <div className="px-6 py-5">
        <h2 className="border-b border-[#E2E8F0] pb-3 text-center text-base font-bold tracking-wide text-[#2D3748]">
          <span aria-hidden="true">🧾 </span>
          PAYMENT RECEIPT
        </h2>

        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[#A0AEC0]">Receipt #</dt>
            <dd className="font-mono font-semibold text-[#2D3748]">{receipt.receiptNumber}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#A0AEC0]">Date</dt>
            <dd className="font-medium text-[#2D3748]">{formatReceiptDate(receipt.paymentDate)}</dd>
          </div>
        </dl>

        <div className="mt-5 space-y-2 text-sm text-[#4A5568]">
          <p>
            <span className="font-semibold text-[#2D3748]">Student:</span>{' '}
            {receipt.studentName || '—'}
          </p>
          <p>
            <span className="font-semibold text-[#2D3748]">Property:</span>{' '}
            {receipt.propertyName || '—'}
          </p>
          {receipt.propertyAddress ? (
            <p>
              <span className="font-semibold text-[#2D3748]">Address:</span> {receipt.propertyAddress}
            </p>
          ) : null}
        </div>

        <div className="mt-5 rounded-xl border border-[#FBD5B0] bg-[#FFF7F3] px-4 py-3">
          <DetailRow
            icon="💰"
            label="Amount"
            value={formatReceiptAmount(receipt.amount)}
            highlight="amount"
          />
          <DetailRow icon="📅" label="Month" value={receipt.monthLabel || '—'} />
          <DetailRow
            icon="💳"
            label="Method"
            value={paymentMethodLabel(receipt.paymentMethod)}
          />
          <DetailRow
            icon="✅"
            label="Status"
            value={isPaid ? 'PAID' : 'PENDING'}
            highlight={isPaid ? 'status' : undefined}
          />
          <DetailRow icon="🏠" label="Landlord" value={receipt.landlordName || '—'} />
        </div>

        <p className="mt-4 text-xs text-[#718096]">
          Confirmed on: {formatConfirmedDateTime(receipt.confirmedAt)}
        </p>

        <footer className="mt-5 border-t border-dashed border-[#E2E8F0] pt-4 text-center text-sm">
          <p className="font-semibold text-[#E88D5B]">Thank you for using MySewa! 🏠</p>
          <p className="mt-1 text-xs text-[#A0AEC0]">
            © {new Date().getFullYear()} MySewa. All rights reserved.
          </p>
        </footer>
      </div>
    </article>
  )
}

/**
 * Modal to view and download a MySewa payment receipt.
 */
export default function ReceiptModal({ receipt, onClose }) {
  const { pushToast } = useToast()

  if (!receipt) return null

  function handleDownload() {
    try {
      downloadRentReceipt(receipt)
      pushToast({ message: 'Receipt downloaded.', type: 'success' })
    } catch (e) {
      pushToast({ message: e.message || 'Could not download receipt.', type: 'error' })
    }
  }

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-[#2D3748]/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-[#F7FAFC] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-5 py-4">
          <h2 id="receipt-modal-title" className="text-lg font-bold text-[#2D3748]">
            Payment Receipt
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#A0AEC0] hover:bg-[#F7FAFC] hover:text-[#2D3748]"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <ReceiptCard receipt={receipt} />
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-[#E2E8F0] bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#718096] hover:bg-[#F7FAFC]"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2D3748] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1A202C]"
          >
            <span aria-hidden="true">📥</span>
            Download Receipt
          </button>
        </div>
      </div>
    </div>
  )
}
