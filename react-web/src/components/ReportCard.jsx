import { motion } from 'framer-motion'
import {
  categoryLabel,
  formatTimestamp,
  photoPublicUrl,
  statusBadgeClass,
  statusLabel,
} from '../services/maintenanceReportService'

export default function ReportCard({
  report,
  role = 'student',
  saving = false,
  onAcknowledge,
  onUpdateStatus,
  onResolve,
  notesDraft = '',
  onNotesChange,
  index = 0,
}) {
  const status = String(report.status || 'PENDING').toUpperCase()
  const canResolve = role === 'student' && (status === 'ACKNOWLEDGED' || status === 'IN_PROGRESS')
  const canAcknowledge = role === 'landlord' && status === 'PENDING'
  const canMarkInProgress = role === 'landlord' && status === 'ACKNOWLEDGED'
  const canMarkResolvedLandlord = role === 'landlord' && (status === 'ACKNOWLEDGED' || status === 'IN_PROGRESS')

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(status)}`}>
              {statusLabel(status)}
            </span>
            <span className="rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-xs font-medium text-[#4B5563]">
              {categoryLabel(report.category)}
            </span>
          </div>
          <h3 className="mt-2 text-base font-bold text-[#2D3748]">
            <span aria-hidden="true">🏠 </span>
            {report.propertyName || `Property #${report.propertyId}`}
          </h3>
          {role === 'landlord' && report.studentDisplayName ? (
            <p className="mt-1 text-xs text-[#718096]">From: {report.studentDisplayName}</p>
          ) : null}
          <p className="mt-3 text-sm leading-relaxed text-[#4A5568]">{report.description}</p>
          {report.photoUrl ? (
            <a
              href={photoPublicUrl(report.photoUrl)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block"
            >
              <img
                src={photoPublicUrl(report.photoUrl)}
                alt="Report attachment"
                className="max-h-40 rounded-lg border border-[#E2E8F0] object-cover"
              />
            </a>
          ) : null}
        </div>
      </div>

      <dl className="mt-4 grid gap-2 text-xs text-[#718096] sm:grid-cols-3">
        <div>
          <dt className="font-semibold text-[#4A5568]">Submitted</dt>
          <dd>{formatTimestamp(report.submittedAt || report.createdAt)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-[#4A5568]">Acknowledged</dt>
          <dd>{formatTimestamp(report.acknowledgedAt)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-[#4A5568]">Resolved</dt>
          <dd>{formatTimestamp(report.resolvedAt)}</dd>
        </div>
      </dl>

      {report.landlordNotes ? (
        <div className="mt-4 rounded-xl border border-[#E2E8F0] bg-[#F9FAFB] p-3">
          <p className="text-xs font-semibold text-[#4A5568]">Landlord notes</p>
          <p className="mt-1 text-sm text-[#4A5568]">{report.landlordNotes}</p>
        </div>
      ) : null}

      {role === 'landlord' && (canAcknowledge || canMarkInProgress || canMarkResolvedLandlord) ? (
        <div className="mt-4 space-y-3 border-t border-[#E2E8F0] pt-4">
          <label className="block text-xs font-semibold text-[#4A5568]" htmlFor={`notes-${report.id}`}>
            Notes (worker, schedule, etc.)
          </label>
          <textarea
            id={`notes-${report.id}`}
            rows={2}
            value={notesDraft}
            onChange={(e) => onNotesChange?.(report.id, e.target.value)}
            disabled={saving}
            placeholder="e.g. Plumber scheduled for Tuesday 2pm"
            className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#E88D5B] focus:ring-2 focus:ring-[#E88D5B]/20"
          />
          <div className="flex flex-wrap gap-2">
            {canAcknowledge ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => onAcknowledge?.(report)}
                className="rounded-lg bg-[#2D3748] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1A202C] disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Acknowledge'}
              </button>
            ) : null}
            {canMarkInProgress ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => onUpdateStatus?.(report, 'IN_PROGRESS')}
                className="rounded-lg bg-[#E88D5B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D67A4A] disabled:opacity-50"
              >
                Mark In Progress
              </button>
            ) : null}
            {canMarkResolvedLandlord ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => onUpdateStatus?.(report, 'RESOLVED')}
                className="rounded-lg border border-[#10B981] bg-white px-4 py-2 text-sm font-semibold text-[#10B981] hover:bg-[#ECFDF5] disabled:opacity-50"
              >
                Mark Resolved
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {canResolve ? (
        <button
          type="button"
          disabled={saving}
          onClick={() => onResolve?.(report)}
          className="mt-4 rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-white hover:bg-[#059669] disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Mark as Resolved'}
        </button>
      ) : null}
    </motion.article>
  )
}
