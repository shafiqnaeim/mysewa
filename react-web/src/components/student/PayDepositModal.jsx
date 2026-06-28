import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import {
  canViewLandlordPaymentDetails,
  getApplicationDisplayLabel,
} from '../../utils/applicationDisplayStatus'
import {
  filterDepositPaymentMethods,
  formatWhatsappLink,
  hasLandlordBankDetails,
  hasLandlordQrDetails,
  PAYMENT_DETAILS_UNAVAILABLE_MESSAGE,
  resolveDepositQrUrl,
} from '../../utils/depositPaymentDisplay'
import { formatPropertyLocationLine } from '../../utils/propertyDisplay'
import { formatDepositAmount } from '../../utils/propertyDeposit'
import { resolvedStudentDepositAmount } from '../../utils/studentApplicationDeposit'
import {
  fetchBookingDepositInstructions,
  fetchProperty,
  fetchToyyibPayOptions,
  mapPropertyPaymentDetails,
} from '../../services/bookingService'

const PAYMENT_METHODS = [
  {
    id: 'bank_transfer',
    icon: '🏦',
    name: 'Bank Transfer',
    description: 'Pay via online banking',
    channel: 'bank_transfer',
  },
  {
    id: 'duitnow_qr',
    icon: '📱',
    name: 'QR Code (DuitNow)',
    description: 'Scan with any banking app',
    channel: 'duitnow_qr',
  },
  {
    id: 'cash',
    icon: '💵',
    name: 'Cash Deposit',
    description: 'Pay in cash at any bank counter',
    channel: 'cash',
  },
  {
    id: 'toyyibpay',
    icon: '🔗',
    name: 'ToyyibPay',
    description: 'Secure online payment',
    channel: null,
  },
]

function formatDurationLines(app) {
  if (!app) return { primary: '—', secondary: null }
  const days =
    app.leaseDays != null && Number(app.leaseDays) > 0
      ? `${Number(app.leaseDays)} day${Number(app.leaseDays) === 1 ? '' : 's'}`
      : null
  const months =
    app.leaseMonths != null
      ? `${Number(app.leaseMonths)} month${Number(app.leaseMonths) === 1 ? '' : 's'}`
      : null

  if (days && months) return { primary: days, secondary: months }
  if (days) return { primary: days, secondary: null }
  if (months) return { primary: months, secondary: null }
  return { primary: '—', secondary: null }
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function SummaryStat({ icon, label, children }) {
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

function PaymentMethodCard({ method, selected, disabled, onSelect }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(method.id)}
      className={`flex h-full min-h-[72px] items-start gap-3 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? 'border-[#E88D5B] bg-[#FFFAF0] shadow-sm'
          : 'border-[#E2E8F0] bg-white hover:border-[#E88D5B]/50 hover:bg-[#FFFAF0]/50'
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? 'border-[#E88D5B] bg-[#E88D5B]' : 'border-[#CBD5E0] bg-white'
        }`}
        aria-hidden="true"
      >
        {selected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
      </span>
      <span className="text-xl" aria-hidden="true">
        {method.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[#2D3748] sm:text-base">{method.name}</span>
        <span className="mt-1 block text-sm leading-snug text-[#A0AEC0]">{method.description}</span>
      </span>
    </button>
  )
}

function CopyDetailRow({ label, value, mono, onCopy }) {
  if (!value) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 flex items-start justify-between gap-2">
        <span className={`min-w-0 flex-1 break-words text-sm font-bold text-[#2D3748] ${mono ? 'font-mono' : ''}`}>
          {value}
        </span>
        <button
          type="button"
          onClick={() => onCopy(value, label)}
          className="shrink-0 rounded-md border border-[#E2E8F0] px-2 py-1 text-xs font-semibold text-[#4A5568] transition hover:bg-[#F7FAFC]"
        >
          Copy
        </button>
      </dd>
    </div>
  )
}

function PaymentUnavailableNotice() {
  return (
    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[#744210]">
      {PAYMENT_DETAILS_UNAVAILABLE_MESSAGE}
    </p>
  )
}

export default function PayDepositModal({ application, onClose, onCompleted, onSuccessDone }) {
  const { pushToast } = useToast()
  const [instructions, setInstructions] = useState(null)
  const [loadingPayment, setLoadingPayment] = useState(true)
  const [toyyib, setToyyib] = useState({ enabled: false, sandbox: true, setupHint: '' })
  const [property, setProperty] = useState(application?.property ?? null)
  const [busy, setBusy] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState('bank_transfer')
  const [phase, setPhase] = useState('form')

  const amount = resolvedStudentDepositAmount(application)
  const amountLabel = formatDepositAmount(amount)
  const propertyName = application?.propertyName || property?.name || `Property #${application?.propertyId}`
  const address =
    (property && formatPropertyLocationLine(property) !== 'Location not set'
      ? formatPropertyLocationLine(property)
      : null) ||
    application?.propertyAddress ||
    property?.location ||
    property?.city ||
    'Address not available'
  const statusLabel = getApplicationDisplayLabel(application) || 'Pending Payment'
  const duration = formatDurationLines(application)
  const mayViewPaymentDetails = canViewLandlordPaymentDetails(application)
  const bankDetailsReady = hasLandlordBankDetails(instructions)
  const qrDetailsReady = hasLandlordQrDetails(instructions)

  const copyToClipboard = useCallback(
    async (text, label) => {
      try {
        await navigator.clipboard.writeText(String(text))
        pushToast({ message: `${label} copied.`, type: 'success' })
      } catch {
        pushToast({ message: 'Could not copy to clipboard.', type: 'error' })
      }
    },
    [pushToast]
  )

  useEffect(() => {
    let cancelled = false

    async function loadPaymentData() {
      setLoadingPayment(true)
      const token = localStorage.getItem('mysewa_token')

      try {
        const toyyibData = await fetchToyyibPayOptions()
        if (!cancelled) {
          setToyyib({
            enabled: Boolean(toyyibData.enabled),
            sandbox: Boolean(toyyibData.sandbox),
            setupHint: typeof toyyibData.setupHint === 'string' ? toyyibData.setupHint : '',
          })
        }

        if (!mayViewPaymentDetails) {
          if (!cancelled) setInstructions(null)
          return
        }

        let prop = application?.property || null
        if (!prop && application?.propertyId && token) {
          try {
            prop = await fetchProperty(application.propertyId, token)
            if (!cancelled) setProperty(prop)
          } catch {
            if (!cancelled) setProperty(null)
          }
        } else if (prop && !cancelled) {
          setProperty(prop)
        }

        if (application?.id && token) {
          try {
            const data = await fetchBookingDepositInstructions(application.id, token)
            if (!cancelled) {
              setInstructions(data)
              return
            }
          } catch {
            // Fall back to property record below.
          }
        }

        if (prop && !cancelled) {
          setInstructions(mapPropertyPaymentDetails(prop, application))
        } else if (!cancelled) {
          setInstructions(null)
        }
      } catch {
        if (!cancelled) setInstructions(null)
      } finally {
        if (!cancelled) setLoadingPayment(false)
      }
    }

    loadPaymentData()
    return () => {
      cancelled = true
    }
  }, [
    application?.id,
    application?.property,
    application?.propertyId,
    application?.status,
    mayViewPaymentDetails,
  ])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && !busy) onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const availableMethods = useMemo(() => {
    const channels = instructions?.allowedChannels || []
    const filtered = filterDepositPaymentMethods(PAYMENT_METHODS, channels)
    if (!toyyib.enabled) {
      return filtered.filter((method) => method.id !== 'toyyibpay')
    }
    return filtered
  }, [instructions?.allowedChannels, toyyib.enabled])

  const qrImageUrl = useMemo(() => resolveDepositQrUrl(instructions), [instructions])
  const whatsappLink = useMemo(
    () => formatWhatsappLink(instructions?.whatsappNumber || property?.whatsappNumber),
    [instructions?.whatsappNumber, property?.whatsappNumber]
  )

  useEffect(() => {
    if (!availableMethods.length) return
    if (!availableMethods.some((method) => method.id === selectedMethod)) {
      setSelectedMethod(availableMethods[0].id)
    }
  }, [availableMethods, selectedMethod])

  async function confirmManual(channel) {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !application?.id) return
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/applications/${application.id}/deposit/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ channel }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not record (${res.status})`)
      if (typeof onCompleted === 'function') onCompleted(data.item)
      setPhase('success')
    } catch (e) {
      pushToast({ message: e.message || 'Payment could not be recorded.', type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function startToyyib() {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !application?.id) return
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/applications/${application.id}/deposit/toyyibpay`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `ToyyibPay (${res.status})`)
      const url = data.payUrl
      if (!url) throw new Error('No payment URL returned.')
      window.location.href = url
    } catch (e) {
      pushToast({ message: e.message || 'ToyyibPay could not start.', type: 'error' })
      setBusy(false)
    }
  }

  async function instantDemo() {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !application?.id) return
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/applications/${application.id}/mock-pay-deposit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Demo (${res.status})`)
      if (typeof onCompleted === 'function') onCompleted(data.item)
      setPhase('success')
    } catch (e) {
      pushToast({ message: e.message || 'Demo payment failed.', type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  function handleConfirm() {
    if (!selectedMethod) {
      pushToast({ message: 'Please select a payment method.', type: 'info' })
      return
    }
    if (selectedMethod === 'toyyibpay') {
      if (!toyyib.enabled) {
        pushToast({ message: 'ToyyibPay is not configured on the server yet.', type: 'info' })
        return
      }
      startToyyib()
      return
    }
    const method = PAYMENT_METHODS.find((m) => m.id === selectedMethod)
    if (method?.channel) confirmManual(method.channel)
  }

  function handleSuccessDone() {
    if (typeof onSuccessDone === 'function') {
      onSuccessDone()
    } else {
      onClose?.()
    }
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget && !busy) onClose?.()
  }

  const toyyibDisabled = !toyyib.enabled

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        className="relative my-auto flex w-full max-h-[min(90vh,720px)] max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-deposit-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-lg text-[#A0AEC0] transition hover:bg-[#F7FAFC] hover:text-[#2D3748]"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
        >
          ✕
        </button>

        {phase === 'success' ? (
          <div className="px-5 py-6 text-center sm:px-6">
            <p className="text-5xl" aria-hidden="true">
              ✅
            </p>
            <h2 id="student-deposit-modal-title" className="mt-4 text-2xl font-bold text-[#2D3748]">
              Payment Successful!
            </h2>
            <p className="mt-3 text-sm text-[#4A5568]">
              Your deposit of <strong>{amountLabel}</strong> has been paid.
            </p>
            <button
              type="button"
              onClick={handleSuccessDone}
              className="mt-8 w-full rounded-lg bg-[#E88D5B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d97a48]"
            >
              Go to My Bookings
            </button>
          </div>
        ) : (
          <>
            <header className="shrink-0 border-b border-gray-200 px-5 py-4 pr-10 sm:px-6">
              <h2 id="student-deposit-modal-title" className="text-lg font-bold text-[#2D3748] sm:text-xl">
                <span aria-hidden="true">💳 </span>
                Pay Deposit
              </h2>
              <p className="mt-3 text-base font-bold text-[#2D3748]">
                <span aria-hidden="true">🏠 </span>
                {propertyName}
              </p>
              <p className="mt-1 text-sm text-[#718096]">
                <span aria-hidden="true">📍 </span>
                {address}
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SummaryStat icon="💰" label="Amount">
                  <span className="font-bold">{amountLabel}</span>
                </SummaryStat>
                <SummaryStat icon="⏱" label="Duration">
                  <div className="font-bold">{duration.primary}</div>
                  {duration.secondary ? (
                    <div className="mt-1 text-sm font-semibold text-gray-500">{duration.secondary}</div>
                  ) : null}
                </SummaryStat>
                <SummaryStat icon="📋" label="Status">
                  <span className="inline-flex rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-bold text-yellow-800">
                    {statusLabel}
                  </span>
                </SummaryStat>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            <section className="flex flex-col gap-4">
              {!mayViewPaymentDetails ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[#744210]">
                  Payment details are only available after your booking is approved.
                </p>
              ) : null}

              {mayViewPaymentDetails ? (
              <div>
                <h3 className="text-base font-semibold text-[#2D3748] sm:text-lg">Select Payment Method</h3>
                {loadingPayment ? (
                  <p className="mt-3 text-sm text-[#718096]">Loading landlord payment details…</p>
                ) : availableMethods.length ? (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {availableMethods.map((method) => (
                  <PaymentMethodCard
                    key={method.id}
                    method={method}
                    selected={selectedMethod === method.id}
                    disabled={busy || (method.id === 'toyyibpay' && toyyibDisabled)}
                    onSelect={setSelectedMethod}
                  />
                ))}
                </div>
                ) : (
                  <PaymentUnavailableNotice />
                )}
              </div>
              ) : null}

              {mayViewPaymentDetails && instructions?.paymentDueDate ? (
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-[#2D3748]">Rent due date: </span>
                  {instructions.paymentDueDate}
                </p>
              ) : null}

              {mayViewPaymentDetails && selectedMethod === 'toyyibpay' && toyyibDisabled ? (
                <p className="mt-2 text-xs text-[#A0AEC0]">
                  ToyyibPay is not configured on the server. Use bank transfer, QR, or cash for now.
                </p>
              ) : null}

              {mayViewPaymentDetails && selectedMethod === 'bank_transfer' ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h4 className="text-base font-semibold text-[#2D3748] sm:text-lg">Bank transfer details</h4>
                  {bankDetailsReady ? (
                    <>
                      <p className="mt-2 text-sm text-gray-600">
                        Use your landlord&apos;s bank account below. Transfer the exact deposit amount, then confirm in
                        MySewa.
                      </p>
                      <div className="mt-3 flex flex-col gap-3">
                        <CopyDetailRow label="Amount to transfer" value={amountLabel} onCopy={copyToClipboard} />
                        <CopyDetailRow label="Bank" value={instructions?.bankName} onCopy={copyToClipboard} />
                        <CopyDetailRow
                          label="Account number"
                          value={instructions?.bankAccount}
                          mono
                          onCopy={copyToClipboard}
                        />
                        <CopyDetailRow
                          label="Landlord name"
                          value={instructions?.landlordName}
                          onCopy={copyToClipboard}
                        />
                        <CopyDetailRow
                          label="Landlord phone"
                          value={instructions?.contactPhone}
                          onCopy={copyToClipboard}
                        />
                      </div>
                    </>
                  ) : (
                    <PaymentUnavailableNotice />
                  )}
                  {whatsappLink ? (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#25D366] hover:underline"
                    >
                      <span aria-hidden="true">💬</span>
                      Message landlord on WhatsApp
                    </a>
                  ) : null}
                </div>
              ) : null}

              {mayViewPaymentDetails && selectedMethod === 'duitnow_qr' ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h4 className="text-base font-semibold text-[#2D3748] sm:text-lg">Scan to pay (DuitNow)</h4>
                  {qrDetailsReady ? (
                    <>
                      <p className="mt-2 text-sm text-gray-600">
                        Transfer <strong className="font-bold text-[#2D3748]">{amountLabel}</strong> using the QR code
                        below.
                      </p>
                      <div className="mt-3 flex justify-center">
                        <img
                          src={qrImageUrl}
                          alt="DuitNow payment QR code"
                          className="h-40 w-40 rounded-lg border border-[#E2E8F0] bg-white object-contain p-2"
                        />
                      </div>
                    </>
                  ) : (
                    <PaymentUnavailableNotice />
                  )}
                  {bankDetailsReady ? (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Or pay via bank</p>
                      <p className="mt-2 text-sm text-gray-600">
                        <span className="font-semibold text-[#2D3748]">{instructions.bankName}</span>
                        {' · '}
                        <span className="font-mono font-bold text-[#2D3748]">{instructions.bankAccount}</span>
                        {instructions.landlordName ? (
                          <>
                            {' '}
                            · <span className="font-semibold text-[#2D3748]">{instructions.landlordName}</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {mayViewPaymentDetails && selectedMethod === 'cash' ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 sm:text-base">
                  Pay <strong className="font-bold text-[#2D3748]">{amountLabel}</strong> in cash at any bank counter
                  or directly to your landlord, then confirm below.
                  {instructions?.contactPhone ? (
                    <p className="mt-2">
                      Landlord phone:{' '}
                      <strong className="font-bold text-[#2D3748]">{instructions.contactPhone}</strong>
                    </p>
                  ) : null}
                  {whatsappLink ? (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-2 font-semibold text-[#25D366] hover:underline"
                    >
                      <span aria-hidden="true">💬</span>
                      WhatsApp landlord
                    </a>
                  ) : null}
                </div>
              ) : null}
            </section>
            </div>

            <footer className="shrink-0 border-t border-gray-200 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={onClose}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-5 py-2.5 text-sm font-semibold text-[#2D3748] transition hover:bg-[#F7FAFC] disabled:opacity-60 sm:order-1 sm:flex-none sm:min-w-[120px]"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={busy || !selectedMethod || (selectedMethod === 'toyyibpay' && toyyibDisabled)}
                  onClick={handleConfirm}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#E88D5B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d97a48] disabled:cursor-not-allowed disabled:opacity-60 sm:order-2 sm:flex-none sm:min-w-[180px]"
                >
                  {busy ? (
                    <>
                      <Spinner />
                      Processing…
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true">💳</span>
                      Confirm Payment
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={instantDemo}
                className="mt-3 w-full text-center text-xs text-gray-400 transition hover:text-gray-500 disabled:opacity-60"
              >
                Skip — Demo Mode
              </button>

              <p className="mt-2 text-center text-xs text-[#A0AEC0]">
                <span aria-hidden="true">🔒 </span>
                Your payment is secure. No card details are stored.
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
