import { useState } from 'react'
import LandlordActionModalShell, { messageTextareaClassName } from './LandlordActionModalShell'

const MESSAGE_MAX = 500

function applicantName(app) {
  return app?.student?.fullName?.trim() || 'Applicant'
}

function propertyName(app) {
  return app?.propertyName || `Property #${app?.propertyId}`
}

export default function RejectModal({ application, saving = false, onClose, onConfirm }) {
  const [message, setMessage] = useState('')

  if (!application) return null

  function handleConfirm() {
    onConfirm?.({ message: message.trim() })
  }

  return (
    <LandlordActionModalShell
      titleId="reject-application-title"
      title="❌ Reject Application"
      onClose={onClose}
      disabled={saving}
    >
      <p className="mt-2 text-sm leading-relaxed text-[#718096]">
        You are about to reject{' '}
        <span className="font-semibold text-[#2D3748]">{applicantName(application)}</span> for{' '}
        <span className="font-semibold text-[#2D3748]">{propertyName(application)}</span>
      </p>

      <label className="mt-5 block text-sm font-medium text-[#2D3748]" htmlFor="reject-student-message">
        <span aria-hidden="true">📝 </span>
        Message to Student <span className="font-normal text-[#A0AEC0]">(Optional)</span>
      </label>
      <textarea
        id="reject-student-message"
        rows={4}
        maxLength={MESSAGE_MAX}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={saving}
        placeholder="Explain why you're rejecting this application..."
        className={messageTextareaClassName}
      />
      <p className="mt-1 text-right text-xs text-[#A0AEC0]">
        {message.length}/{MESSAGE_MAX}
      </p>

      <p className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
        <span aria-hidden="true">⚠️ </span>
        This action cannot be undone.
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
          className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Reject Application'}
        </button>
      </div>
    </LandlordActionModalShell>
  )
}
