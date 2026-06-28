import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { useAdminGuard } from '../hooks/useAdminGuard'
import { useToast } from '../context/ToastContext'
import AdminLogs, { formatLogTimestamp } from './dashboard/AdminLogs'

const PAGE_SIZE = 15
const LS_HIDE_BEFORE = 'mysewa_admin_logs_hide_before'
const OLD_LOG_DAYS = 90

function readHideBefore() {
  try {
    return localStorage.getItem(LS_HIDE_BEFORE) || ''
  } catch {
    return ''
  }
}

function writeHideBefore(iso) {
  try {
    if (iso) localStorage.setItem(LS_HIDE_BEFORE, iso)
    else localStorage.removeItem(LS_HIDE_BEFORE)
  } catch {
    /* ignore */
  }
}

function escapeCsv(value) {
  const s = String(value ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 5000)
}

function normalizeLog(row) {
  return {
    id: row.id,
    timestamp: row.timestamp,
    timestampDisplay: formatLogTimestamp(row.timestamp),
    user: row.user || 'System',
    event: row.event || '—',
    details: row.details || '—',
    ipAddress: row.ipAddress || '—',
    eventType: String(row.eventType || 'system').toLowerCase(),
    level: String(row.level || 'info').toLowerCase(),
  }
}

export default function AdminLogsPage() {
  const { loading, error, token } = useAdminGuard()
  const { pushToast } = useToast()

  const [allLogs, setAllLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [hideBefore, setHideBefore] = useState(() => readHideBefore())
  const [clearing, setClearing] = useState(false)

  const [eventType, setEventType] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState({ eventType: 'all', dateFrom: '', dateTo: '', search: '' })
  const [filtersApplied, setFiltersApplied] = useState(false)
  const [page, setPage] = useState(0)

  const loadLogs = useCallback(async () => {
    if (!token) return
    setLogsLoading(true)
    try {
      const res = await fetch('/api/v1/admin/logs', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Failed to load logs (${res.status})`)
      const items = Array.isArray(data.items) ? data.items.map(normalizeLog) : []
      setAllLogs(items)
    } catch (e) {
      setAllLogs([])
      pushToast({ message: e.message || 'Could not load logs.', type: 'error' })
    } finally {
      setLogsLoading(false)
    }
  }, [token, pushToast])

  useEffect(() => {
    if (token) void loadLogs()
  }, [token, loadLogs])

  const visibleLogs = useMemo(() => {
    if (!hideBefore) return allLogs
    const cutoff = new Date(hideBefore).getTime()
    if (!Number.isFinite(cutoff)) return allLogs
    return allLogs.filter((row) => new Date(row.timestamp).getTime() >= cutoff)
  }, [allLogs, hideBefore])

  const filteredLogs = useMemo(() => {
    let rows = visibleLogs
    const { eventType: et, dateFrom: from, dateTo: to, search: q } = applied

    if (et !== 'all') {
      rows = rows.filter((row) => row.eventType === et)
    }
    if (from) {
      const start = new Date(`${from}T00:00:00`).getTime()
      rows = rows.filter((row) => new Date(row.timestamp).getTime() >= start)
    }
    if (to) {
      const end = new Date(`${to}T23:59:59`).getTime()
      rows = rows.filter((row) => new Date(row.timestamp).getTime() <= end)
    }
    const needle = q.trim().toLowerCase()
    if (needle) {
      rows = rows.filter((row) => {
        const hay = `${row.user} ${row.event} ${row.details}`.toLowerCase()
        return hay.includes(needle)
      })
    }
    return rows
  }, [visibleLogs, applied])

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE))

  const pageLogs = useMemo(() => {
    const start = page * PAGE_SIZE
    return filteredLogs.slice(start, start + PAGE_SIZE)
  }, [filteredLogs, page])

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1))
  }, [page, totalPages])

  function handleApplyFilters() {
    setApplied({ eventType, dateFrom, dateTo, search })
    setFiltersApplied(true)
    setPage(0)
  }

  function handleResetFilters() {
    setEventType('all')
    setDateFrom('')
    setDateTo('')
    setSearch('')
    setApplied({ eventType: 'all', dateFrom: '', dateTo: '', search: '' })
    setFiltersApplied(false)
    setPage(0)
  }

  function exportRows() {
    return filteredLogs
  }

  function handleExportCsv() {
    const rows = exportRows()
    const header = ['Timestamp', 'User', 'Event', 'Details', 'IP Address', 'Level', 'Type']
    const lines = [header.join(',')]
    rows.forEach((row) => {
      lines.push(
        [
          row.timestampDisplay,
          row.user,
          row.event,
          row.details,
          row.ipAddress,
          row.level,
          row.eventType,
        ]
          .map(escapeCsv)
          .join(','),
      )
    })
    downloadBlob(lines.join('\n'), `mysewa-logs-${Date.now()}.csv`, 'text/csv;charset=utf-8')
    pushToast({ message: 'CSV export downloaded.', type: 'success' })
  }

  function handleExportPdf() {
    const rows = exportRows()
    const body = rows
      .map(
        (row) =>
          `<tr><td>${row.timestampDisplay}</td><td>${row.user}</td><td>${row.event}</td><td>${row.details}</td><td>${row.ipAddress}</td><td>${row.level}</td></tr>`,
      )
      .join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>MySewa Logs</title>
<style>body{font-family:Arial,sans-serif;padding:24px}table{width:100%;border-collapse:collapse;font-size:11px}
th,td{border:1px solid #e2e8f0;padding:6px;text-align:left}th{background:#fafafa}</style></head>
<body><h1>MySewa System Logs</h1><p>${rows.length} entries</p>
<table><thead><tr><th>Timestamp</th><th>User</th><th>Event</th><th>Details</th><th>IP</th><th>Level</th></tr></thead>
<tbody>${body}</tbody></table></body></html>`
    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) {
      pushToast({ message: 'Allow pop-ups to export PDF.', type: 'error' })
      return
    }
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    pushToast({ message: 'PDF export opened in print dialog.', type: 'info' })
  }

  function handleClearOldLogs() {
    const ok = window.confirm(
      `Hide log entries older than ${OLD_LOG_DAYS} days from this view? This does not delete database records.`,
    )
    if (!ok) return
    setClearing(true)
    const cutoff = new Date(Date.now() - OLD_LOG_DAYS * 86400000).toISOString()
    writeHideBefore(cutoff)
    setHideBefore(cutoff)
    setClearing(false)
    pushToast({ message: `Logs before ${formatLogTimestamp(cutoff)} hidden.`, type: 'success' })
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA]">
          <p className="text-sm text-[#6B7280]">Verifying privileges…</p>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <AdminLogs
        logs={pageLogs}
        loading={logsLoading}
        eventType={eventType}
        dateFrom={dateFrom}
        dateTo={dateTo}
        search={search}
        appliedFilters={filtersApplied}
        page={page}
        totalPages={totalPages}
        filteredTotal={filteredLogs.length}
        pageSize={PAGE_SIZE}
        onEventTypeChange={setEventType}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onSearchChange={setSearch}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
        onPageChange={setPage}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
        onClearOldLogs={handleClearOldLogs}
        clearing={clearing}
      />
    </AdminLayout>
  )
}
