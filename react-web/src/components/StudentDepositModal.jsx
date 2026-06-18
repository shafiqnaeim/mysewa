import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../context/ToastContext'
import { resolvedStudentDepositAmount } from '../utils/studentApplicationDeposit'

function formatRm(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  try {
    return `RM ${Number(amount).toFixed(2)}`
  } catch {
    return String(amount)
  }
}

export default function StudentDepositModal({ application, onClose, onCompleted }) {
  const { pushToast } = useToast()
  const [instructions, setInstructions] = useState(null)
  const [toyyib, setToyyib] = useState({ enabled: false, sandbox: true, setupHint: '' })
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('choose')

  const amount = resolvedStudentDepositAmount(application)

  const loadMeta = useCallback(async () => {
    try {
      const [iRes, tRes] = await Promise.all([
        fetch('/api/v1/payments/manual-instructions'),
        fetch('/api/v1/payments/toyyibpay/options'),
      ])
      const iData = await iRes.json().catch(() => ({}))
      const tData = await tRes.json().catch(() => ({}))
      if (iRes.ok) setInstructions(iData)
      else setInstructions(null)
      if (tRes.ok) {
        setToyyib({
          enabled: Boolean(tData.enabled),
          sandbox: Boolean(tData.sandbox),
          setupHint: typeof tData.setupHint === 'string' ? tData.setupHint : '',
        })
      }
    } catch {
      setInstructions(null)
    }
  }, [])

  useEffect(() => {
    loadMeta()
  }, [loadMeta])

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
      pushToast({ message: 'Deposit recorded for your application (prototype).', type: 'success' })
      if (typeof onCompleted === 'function') onCompleted(data.item)
      onClose()
    } catch (e) {
      pushToast({ message: e.message || 'Failed.', type: 'error' })
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
    } finally {
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
      pushToast({ message: 'Instant demo deposit saved (no real money).', type: 'success' })
      if (typeof onCompleted === 'function') onCompleted(data.item)
      onClose()
    } catch (e) {
      pushToast({ message: e.message || 'Failed.', type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const title = application?.propertyName || `Property #${application?.propertyId}`

  return (
    <div className="student-pay-modal-backdrop" role="presentation">
      <div className="student-pay-modal" role="dialog" aria-modal="true" aria-labelledby="student-pay-modal-title">
        <header className="student-pay-modal-head">
          <h2 id="student-pay-modal-title">Pay deposit</h2>
          <button type="button" className="student-pay-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <p className="student-pay-modal-sub">
          <strong>{title}</strong>
          <br />
          Amount: <strong>{formatRm(amount)}</strong> (prototype rules)
        </p>

        {tab === 'choose' ? (
          <>
            <div className="student-pay-modal-grid">
              <button type="button" className="student-pay-choice" disabled={busy} onClick={() => setTab('bank')}>
                Bank transfer
              </button>
              <button type="button" className="student-pay-choice" disabled={busy} onClick={() => setTab('qr')}>
                QR (DuitNow-style)
              </button>
              <button type="button" className="student-pay-choice" disabled={busy} onClick={() => setTab('cash')}>
                Cash
              </button>
              <button
                type="button"
                className="student-pay-choice student-pay-choice--accent"
                disabled={busy || !toyyib.enabled}
                onClick={() => startToyyib()}
                title={!toyyib.enabled ? 'Configure ToyyibPay on the API server' : 'Pay on ToyyibPay'}
              >
                ToyyibPay {toyyib.enabled ? (toyyib.sandbox ? '(sandbox)' : '') : '(not ready)'}
              </button>
            </div>
            {!toyyib.enabled ? (
              <p className="student-pay-toyyib-setup-hint" role="status">
                <strong>ToyyibPay testing:</strong> the button stays grey until the Spring API has all three:{' '}
                <code>TOYYIBPAY_ENABLED=true</code>, <code>TOYYIBPAY_USER_SECRET_KEY</code>, and{' '}
                <code>TOYYIBPAY_CATEGORY_CODE</code> (IDE run configuration or shell — not only a repo{' '}
                <code>.env</code> file). Then restart Spring.{' '}
                {toyyib.setupHint ? <span className="student-pay-toyyib-setup-detail">{toyyib.setupHint}</span> : null}{' '}
                See <code>docs/PAYMENTS.md</code> and <code>docs/WHERE-TO-PUT-TOYYIBPAY-KEYS.md</code>.
              </p>
            ) : null}
          </>
        ) : null}

        {tab === 'bank' && instructions ? (
          <div className="student-pay-panel">
            <p className="student-pay-panel-lead">Transfer the amount above, then confirm below.</p>
            <dl className="student-pay-dl">
              <div>
                <dt>Bank</dt>
                <dd>{instructions.bankName}</dd>
              </div>
              <div>
                <dt>Account no.</dt>
                <dd>
                  <code className="student-pay-code">{instructions.bankAccount}</code>{' '}
                  <button
                    type="button"
                    className="student-pay-mini"
                    onClick={() => {
                      navigator.clipboard?.writeText(String(instructions.bankAccount || ''))
                      pushToast({ message: 'Account number copied.', type: 'success' })
                    }}
                  >
                    Copy
                  </button>
                </dd>
              </div>
              <div>
                <dt>Account name</dt>
                <dd>{instructions.bankHolder}</dd>
              </div>
            </dl>
            <button type="button" className="signin-submit" disabled={busy} onClick={() => confirmManual('bank_transfer')}>
              I have made the transfer
            </button>
            <button type="button" className="student-pay-back" disabled={busy} onClick={() => setTab('choose')}>
              ← Back
            </button>
          </div>
        ) : null}

        {tab === 'qr' ? (
          <div className="student-pay-panel">
            <p className="student-pay-panel-lead">Scan the QR with your banking app (if configured), then confirm.</p>
            {instructions?.qrImageUrl ? (
              <div className="student-pay-qr-wrap">
                <img src={instructions.qrImageUrl} alt="Payment QR" className="student-pay-qr-img" />
              </div>
            ) : (
              <p className="student-dash-muted">
                No QR image URL configured yet. Set <code>PAYMENT_MANUAL_QR_URL</code> on the server, or use bank transfer.
              </p>
            )}
            <button type="button" className="signin-submit" disabled={busy} onClick={() => confirmManual('duitnow_qr')}>
              I have paid via QR
            </button>
            <button type="button" className="student-pay-back" disabled={busy} onClick={() => setTab('choose')}>
              ← Back
            </button>
          </div>
        ) : null}

        {tab === 'cash' ? (
          <div className="student-pay-panel">
            <p className="student-pay-panel-lead">
              Arrange to hand cash to the landlord for this deposit (prototype). Confirm when done.
            </p>
            <button type="button" className="signin-submit" disabled={busy} onClick={() => confirmManual('cash')}>
              I paid cash to the landlord
            </button>
            <button type="button" className="student-pay-back" disabled={busy} onClick={() => setTab('choose')}>
              ← Back
            </button>
          </div>
        ) : null}

        <footer className="student-pay-modal-foot">
          <button type="button" className="student-pay-foot-link" disabled={busy} onClick={instantDemo}>
            Skip — instant demo record (no payment)
          </button>
        </footer>
      </div>
    </div>
  )
}
