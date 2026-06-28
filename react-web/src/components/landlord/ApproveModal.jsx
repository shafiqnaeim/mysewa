import { useState } from 'react'
import { formatDepositAmount, resolveApplicationDeposit } from '../../utils/propertyDeposit'
import LandlordActionModalShell, { messageTextareaClassName } from './LandlordActionModalShell'

const MESSAGE_MAX = 500

function applicantName(app) {
  return app?.student?.fullName?.trim() || 'Applicant'
}

function propertyName(app) {
  return app?.propertyName || `Property #${app?.propertyId}`
}

export default function ApproveModal({ application, saving = false, onClose, onConfirm }) {
  const [message, setMessage] = useState('')

  if (!application) return null

  const deposit = resolveApplicationDeposit(application)
  const depositLabel = deposit != null ? formatDepositAmount(deposit) : 'Not set on listing'

  function handleConfirm() {
    onConfirm?.({ message: message.trim(), depositAmount: deposit })
  }

  return (
    <LandlordActionModalShell
      titleId="approve-application-title"
      title="✅ Approve Application"
      onClose={onClose}
      disabled={saving}
    >
      <p className="mt-2 text-sm leading-relaxed text-[#718096]">
        You are about to approve{' '}
        <span className="font-semibold text-[#2D3748]">{applicantName(application)}</span> for{' '}
        <span className="font-semibold text-[#2D3748]">{propertyName(application)}</span>
      </p>

      <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">Deposit Amount</p>
        <p className="mt-1 text-xl font-bold text-[#2D3748]">{depositLabel}</p>
      </div>

      <label className="mt-5 block text-sm font-medium text-[#2D3748]" htmlFor="approve-student-message">
        <span aria-hidden="true">📝 </span>
        Message to Student <span className="font-normal text-[#A0AEC0]">(Optional)</span>
      </label>
      <textarea
        id="approve-student-message"
        rows={4}
        maxLength={MESSAGE_MAX}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={saving}
        placeholder="Welcome message to the student..."
        className={messageTextareaClassName}
      />
      <p className="mt-1 text-right text-xs text-[#A0AEC0]">
        {message.length}/{MESSAGE_MAX}
      </p>

      <p className="mt-4 rounded-lg border border-green-100 bg-green-50 px-3 py-2.5 text-sm text-green-800">
        <span aria-hidden="true">ℹ️ </span>
        The student will be notified to pay the deposit.
      </p>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#2D3748] transition hover:bg-[#F7FAFC] disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Approve Application'}
        </button>
      </div>
    </LandlordActionModalShell>
  )
}
