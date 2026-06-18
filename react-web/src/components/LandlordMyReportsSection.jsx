import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../context/ToastContext'

function imagePublicUrl(url) {
  if (!url) return ''
  const s = String(url).trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  return s.startsWith('/') ? s : `/${s}`
}

function reportStatusBadgeClass(status) {
  const s = String(status || 'pending').toLowerCase()
  if (s === 'resolved') return 'landlord-myreports-status landlord-myreports-status--resolved'
  if (s === 'received') return 'landlord-myreports-status landlord-myreports-status--received'
  return 'landlord-myreports-status landlord-myreports-status--pending'
}

function reportStatusLabel(status) {
  const s = String(status || 'pending').toLowerCase()
  if (s === 'resolved') return 'Resolved'
  if (s === 'received') return 'Received'
  return 'Pending'
}

/**
 * Aggregates tenant reports from all landlord properties (myProperty hub).
 */
export default function LandlordMyReportsSection({ token, properties, refreshKey = 0 }) {
  const { pushToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([])
  const [receiveSavingId, setReceiveSavingId] = useState(null)

  const load = useCallback(async () => {
    if (!token || !Array.isArray(properties) || properties.length === 0) {
      setRows([])
      return
    }
    setLoading(true)
    try {
      const chunks = await Promise.all(
        properties.map(async (p) => {
          const id = p?.id
          if (id == null || !Number.isFinite(Number(id))) return []
          try {
            const res = await fetch(`/api/v1/properties/${encodeURIComponent(id)}/tenant-reports`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) return []
            const data = await res.json().catch(() => ({}))
            const items = Array.isArray(data.items) ? data.items : []
            const name = p.name?.trim() || `Property #${id}`
            return items.map((it) => ({
              ...it,
              propertyId: Number(id),
              propertyName: name,
            }))
          } catch {
            return []
          }
        }),
      )
      const merged = chunks.flat()
      merged.sort((a, b) => {
        const ta = new Date(a.createdAt || 0).getTime()
        const tb = new Date(b.createdAt || 0).getTime()
        return tb - ta
      })
      setRows(merged)
    } catch (e) {
      setRows([])
      pushToast({ message: e.message || 'Could not load tenant reports.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [token, properties, pushToast, refreshKey])

  useEffect(() => {
    void load()
  }, [load])

  async function receiveReport(r) {
    if (!token || !r?.id || !r?.propertyId) return
    setReceiveSavingId(r.id)
    try {
      const res = await fetch(
        `/api/v1/properties/${encodeURIComponent(r.propertyId)}/tenant-reports/${encodeURIComponent(r.id)}/receive`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not update (${res.status})`)
      pushToast({ message: 'Marked as received — you can arrange repairs.', type: 'success' })
      await load()
    } catch (e) {
      pushToast({ message: e.message || 'Could not update report.', type: 'error' })
    } finally {
      setReceiveSavingId(null)
    }
  }

  if (!token) {
    return <p className="landlord-myreports-muted">Sign in to load reports.</p>
  }

  if (!Array.isArray(properties) || properties.length === 0) {
    return (
      <p className="landlord-myreports-muted">
        Add a listing first — tenant reports from accepted students appear here.
      </p>
    )
  }

  if (loading) {
    return <p className="my-property-loading">Loading reports…</p>
  }

  if (!rows.length) {
    return (
      <div className="student-dash-card student-rental-empty my-property-empty-state">
        <p>No tenant reports yet.</p>
        <p className="student-dash-muted">
          When an accepted tenant sends a report (with optional photo) from their <strong>myProperty</strong> page, it
          appears here under <strong>myReports</strong>.
        </p>
      </div>
    )
  }

  return (
    <ul className="landlord-myreports-list">
      {rows.map((r) => {
        const st = String(r.status || 'pending').toLowerCase()
        const showReceive = st === 'pending'
        const busyReceive = receiveSavingId === r.id
        return (
          <li key={`${r.propertyId}-${r.id}`} className="landlord-myreports-card">
            <div className="landlord-myreports-card-top">
              <p className="landlord-myreports-property">{r.propertyName}</p>
              <span className={reportStatusBadgeClass(r.status)}>{reportStatusLabel(r.status)}</span>
            </div>
            {r.createdAt ? (
              <p className="landlord-myreports-date landlord-myreports-date--block">
                Submitted {new Date(r.createdAt).toLocaleString()}
              </p>
            ) : null}
            <p className="landlord-myreports-student">
              <span className="landlord-myreports-student-label">From</span>{' '}
              <strong>{r.studentDisplayName || 'Student'}</strong>
              {r.applicationId != null ? (
                <>
                  {' '}
                  <span className="landlord-myreports-student-label">· Application</span> #{r.applicationId}
                </>
              ) : null}
            </p>
            <p className="landlord-myreports-message">{r.message}</p>
            {r.imageUrl ? (
              <a
                href={imagePublicUrl(r.imageUrl)}
                target="_blank"
                rel="noreferrer"
                className="landlord-myreports-img-link"
              >
                <img src={imagePublicUrl(r.imageUrl)} alt="" className="landlord-myreports-thumb" />
                <span className="landlord-myreports-img-caption">Open full image</span>
              </a>
            ) : null}
            {showReceive ? (
              <div className="landlord-myreports-actions">
                <button
                  type="button"
                  className="landlord-application-status-btn landlord-application-status-btn--accept"
                  disabled={busyReceive}
                  onClick={() => receiveReport(r)}
                >
                  {busyReceive ? 'Saving…' : 'Receive'}
                </button>
                <p className="landlord-myreports-action-hint">
                  Tap <strong>Receive</strong> when you have seen this report and will send someone to repair (or take
                  action). The tenant can then mark it resolved when the work is done.
                </p>
              </div>
            ) : st === 'received' ? (
              <p className="landlord-myreports-action-hint landlord-myreports-action-hint--muted">
                Received{r.receivedAt ? ` · ${new Date(r.receivedAt).toLocaleString()}` : ''}. Waiting for the tenant to
                mark <strong>Resolved</strong> after repair.
              </p>
            ) : (
              <p className="landlord-myreports-action-hint landlord-myreports-action-hint--muted">
                Resolved{r.resolvedAt ? ` · ${new Date(r.resolvedAt).toLocaleString()}` : ''}.
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
