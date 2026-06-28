import { useCallback, useEffect, useState } from 'react'
import {
  canPayDeposit,
  getApplicationDisplayKey,
  getApplicationDisplayLabel,
} from '../../utils/applicationDisplayStatus'
import { formatYmdForDisplay, leaseSpanDays } from '../../utils/bookingDates'
import { formatPropertyLocationLine, listPropertyImageUrls } from '../../utils/propertyDisplay'
import { formatDepositAmount, isDepositPaid, resolveApplicationDeposit } from '../../utils/propertyDeposit'
import { getBookingDecisionHeadline, getDisplayLandlordMessage } from '../../utils/landlordBookingMessage'

function formatApplicationWhen(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return String(iso)
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(iso)
  }
}

function formatMoveDate(value) {
  if (!value) return '—'
  const raw = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return formatYmdForDisplay(raw.slice(0, 10))
  }
  try {
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return raw
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return raw
  }
}

function formatDurationDays(app) {
  const moveIn = app.preferredMoveIn
  const moveOut = app.leaseEnd || app.leaseEndDate || app.lease_end
  if (app.leaseDays != null && Number(app.leaseDays) > 0) {
    const days = Number(app.leaseDays)
    return `${days} day${days === 1 ? '' : 's'}`
  }
  const span = leaseSpanDays(moveIn, moveOut)
  if (span != null && span > 0) {
    return `${span} day${span === 1 ? '' : 's'}`
  }
  if (app.leaseMonths != null) {
    const months = Number(app.leaseMonths)
    return `${months} month${months === 1 ? '' : 's'}`
  }
  return '—'
}

function getStatusBadgeStyle(app) {
  const key = getApplicationDisplayKey(app)
  const rawStatus = String(app?.status || '').toLowerCase()

  if (rawStatus === 'cancelled') {
    return { label: 'CANCELLED', className: 'bg-gray-100 text-gray-800' }
  }

  switch (key) {
    case 'confirmed':
    case 'active':
      return { label: getApplicationDisplayLabel(app), className: 'bg-green-100 text-green-800' }
    case 'rejected':
      return { label: 'REJECTED', className: 'bg-red-100 text-red-800' }
    case 'completed':
      return { label: 'COMPLETED', className: 'bg-blue-100 text-blue-800' }
    case 'pending_payment':
      return { label: 'PENDING PAYMENT', className: 'bg-yellow-100 text-yellow-800' }
    default:
      return { label: 'PENDING', className: 'bg-yellow-100 text-yellow-800' }
  }
}

function StatCard({ icon, label, children }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 text-center">
      <p className="text-xs font-semibold text-gray-500 sm:text-sm">
        <span aria-hidden="true">{icon} </span>
        {label}
      </p>
      <div className="mt-1.5 text-sm font-bold text-[#2D3748] sm:text-base">{children}</div>
    </div>
  )
}

function Thumbnail({ src, loading }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="h-20 w-20 shrink-0 rounded-xl border border-[#E2E8F0] object-cover"
      />
    )
  }
  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-gradient-to-br from-[#EDF2F7] to-[#E2E8F0] text-lg text-[#A0AEC0]">
      {loading ? '…' : '🏠'}
    </div>
  )
}

function LandlordMessageBlock({ application }) {
  const headline = getBookingDecisionHeadline(application)
  const message = getDisplayLandlordMessage(application)

  if (!headline || !message) return null

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h3 className="text-base font-semibold text-[#2D3748] sm:text-lg">
        <span aria-hidden="true">📝 </span>
        Landlord&apos;s Message
      </h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#744210] sm:text-base">
        &ldquo;{message}&rdquo;
      </p>
    </section>
  )
}

export default function StudentBookingDetailModal({ application, onClose, onPayDeposit }) {
  const [property, setProperty] = useState(application?.property || null)
  const [loading, setLoading] = useState(false)

  const handleClose = useCallback(() => {
    onClose?.()
  }, [onClose])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    if (application?.property) {
      setProperty(application.property)
      return
    }
    if (!application?.propertyId) return

    const token = localStorage.getItem('mysewa_token')
    let cancelled = false

    async function loadProperty() {
      setLoading(true)
      try {
        const res = await fetch(`/api/v1/properties/${encodeURIComponent(application.propertyId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const data = await res.json().catch(() => ({}))
        if (!cancelled && res.ok) setProperty(data.item || data)
      } catch {
        if (!cancelled) setProperty(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProperty()
    return () => {
      cancelled = true
    }
  }, [application?.property, application?.propertyId])

  if (!application) return null

  const images = property ? listPropertyImageUrls(property) : []
  const cover = images[0]
  const propertyName =
    application.propertyName || property?.name || `Property #${application.propertyId}`
  const location = property
    ? formatPropertyLocationLine(property)
    : application.propertyAddress || application.propertyCity || '—'
  const moveOut = application.leaseEnd || application.leaseEndDate || application.lease_end
  const statusBadge = getStatusBadgeStyle(application)
  const depositFormatted = formatDepositAmount(resolveApplicationDeposit(application))
  const paid = isDepositPaid(application)
  const showPayDeposit = canPayDeposit(application)

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-detail-title"
      onClick={handleClose}
    >
      <div
        className="relative my-auto flex w-full max-h-[min(90vh,720px)] max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-gray-200 px-5 py-4 sm:px-6">
          <div className="flex gap-4 pr-8">
            <Thumbnail src={cover} loading={loading} />
            <div className="min-w-0 flex-1">
              <h2 id="booking-detail-title" className="text-lg font-bold text-[#2D3748] sm:text-xl">
                <span aria-hidden="true">🏠 </span>
                {propertyName}
              </h2>
              <p className="mt-1 text-sm text-[#718096]">
                <span aria-hidden="true">📍 </span>
                {location}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-lg text-[#A0AEC0] transition hover:bg-[#F7FAFC] hover:text-[#2D3748]"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard icon="📅" label="Move In">
                {formatMoveDate(application.preferredMoveIn)}
              </StatCard>
              <StatCard icon="📅" label="Move Out">
                {formatMoveDate(moveOut)}
              </StatCard>
              <StatCard icon="⏱" label="Duration">
                {formatDurationDays(application)}
              </StatCard>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard icon="💰" label="Deposit">
                <div>{depositFormatted}</div>
                <div className={`mt-1 text-xs font-semibold ${paid ? 'text-green-600' : 'text-amber-600'}`}>
                  {paid ? '✅ Paid' : '⏳ Unpaid'}
                </div>
              </StatCard>
              <StatCard icon="📋" label="Status">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold leading-snug ${statusBadge.className}`}
                >
                  {statusBadge.label}
                </span>
              </StatCard>
              <StatCard icon="📅" label="Applied">
                {formatApplicationWhen(application.createdAt)}
              </StatCard>
            </div>

            <LandlordMessageBlock application={application} />

            {property?.description ? (
              <section className="border-t border-gray-200 pt-4">
                <h3 className="text-base font-semibold text-[#2D3748] sm:text-lg">
                  <span aria-hidden="true">🏠 </span>
                  About this Property
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
                  {property.description}
                </p>
              </section>
            ) : null}
          </div>
        </div>

        <footer className="shrink-0 flex flex-col-reverse gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-5 py-2.5 text-sm font-semibold text-[#2D3748] transition hover:bg-[#F7FAFC] sm:flex-none sm:min-w-[120px]"
          >
            Close
          </button>
          {showPayDeposit && onPayDeposit ? (
            <button
              type="button"
              onClick={() => onPayDeposit(application)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#E88D5B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d97a48] sm:flex-none sm:min-w-[160px]"
            >
              <span aria-hidden="true">💳</span>
              Pay Deposit
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  )
}
