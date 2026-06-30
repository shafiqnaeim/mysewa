import { formatDateShort, formatRm, getDueDate, MONTH_FULL } from '../../utils/rentTrackerUtils'

function statusLabel(status) {
  switch (status) {
    case 'paid':
      return { text: 'Paid', className: 'bg-green-100 text-green-800' }
    case 'overdue':
      return { text: 'Overdue', className: 'bg-red-100 text-red-800' }
    case 'pending':
      return { text: 'Pending', className: 'bg-yellow-100 text-yellow-800' }
    case 'pending_confirmation':
      return { text: 'Pending Confirmation', className: 'bg-amber-100 text-amber-900' }
    case 'unavailable':
      return { text: 'Unavailable', className: 'bg-gray-100 text-gray-600' }
    default:
      return { text: 'Outside tenancy', className: 'bg-gray-100 text-gray-500' }
  }
}

function receiptHref(url) {
  if (!url) return ''
  const s = String(url).trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  return s.startsWith('/') ? s : `/${s}`
}

export default function RentTrackerMonthDetails({
  cell,
  year,
  monthlyRent,
  studentPaymentLog,
  role,
  onClose,
  onLandlordManage,
  onStudentPay,
  onContactLandlord,
  onViewReceipt,
}) {
  if (!cell) return null

  const status = statusLabel(cell.status)
  const amount =
    cell.amount != null && Number.isFinite(cell.amount)
      ? cell.amount
      : Number(monthlyRent) > 0
        ? Number(monthlyRent)
        : null
  const dueDate = cell.inLease && !cell.paid ? getDueDate(year, cell.month) : null
  const paidOn = cell.record?.recordedAt ? new Date(cell.record.recordedAt) : null
  const receiptUrl = studentPaymentLog?.receiptUrl || null

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-[#2D3748]">
            {MONTH_FULL[cell.month - 1]} {year}
          </h3>
          <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${status.className}`}>
            {status.text}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#A0AEC0] hover:bg-[#F7FAFC] hover:text-[#2D3748]"
          aria-label="Close month details"
        >
          ✕
        </button>
      </div>

      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between gap-4 border-b border-[#E2E8F0] pb-3">
          <dt className="text-[#A0AEC0]">Amount</dt>
          <dd className="font-bold text-[#2D3748]">{formatRm(amount)}</dd>
        </div>
        {cell.paid && paidOn ? (
          <div className="flex justify-between gap-4">
            <dt className="text-[#A0AEC0]">Paid on</dt>
            <dd className="font-medium text-[#2D3748]">{formatDateShort(paidOn)}</dd>
          </div>
        ) : null}
        {dueDate && !cell.paid && cell.status !== 'unavailable' ? (
          <div className="flex justify-between gap-4">
            <dt className="text-[#A0AEC0]">Due date</dt>
            <dd className="font-medium text-[#2D3748]">{formatDateShort(dueDate)}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {role === 'landlord' && cell.inLease ? (
          <>
            <button
              type="button"
              onClick={() => onLandlordManage?.('paid')}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#E88D5B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d97a48]"
            >
              <span aria-hidden="true">📤</span>
              Mark as Paid
            </button>
            <button
              type="button"
              onClick={() => onLandlordManage?.('unavailable')}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D3748] transition hover:bg-[#F7FAFC]"
            >
              <span aria-hidden="true">📤</span>
              Mark as Unavailable
            </button>
          </>
        ) : null}

        {role === 'student' && cell.inLease ? (
          <>
            {!cell.paid && cell.status !== 'unavailable' ? (
              <button
                type="button"
                onClick={onStudentPay}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#E88D5B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d97a48]"
              >
                <span aria-hidden="true">✅</span>
                Mark as Paid
              </button>
            ) : null}
            <button
              type="button"
              onClick={onContactLandlord}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D3748] transition hover:bg-[#F7FAFC]"
            >
              <span aria-hidden="true">💬</span>
              Contact Landlord
            </button>
          </>
        ) : null}

        {cell.paid ? (
          <button
            type="button"
            onClick={() => onViewReceipt?.()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D3748] transition hover:bg-[#F7FAFC]"
          >
            <span aria-hidden="true">📄</span>
            {role === 'student' ? 'Download Receipt' : 'View Receipt'}
          </button>
        ) : receiptUrl ? (
          <a
            href={receiptHref(receiptUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D3748] transition hover:bg-[#F7FAFC]"
          >
            <span aria-hidden="true">📎</span>
            View uploaded proof
          </a>
        ) : null}
      </div>
    </div>
  )
}
