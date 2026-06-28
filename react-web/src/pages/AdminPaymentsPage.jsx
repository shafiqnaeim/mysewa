import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { useAdminGuard } from '../hooks/useAdminGuard'
import { useToast } from '../context/ToastContext'
import AdminPayments, { formatDate, formatMoney } from './dashboard/AdminPayments'

function normalizeStats(raw) {
  return {
    totalRevenue: Number(raw?.totalRevenue) || 0,
    thisMonth: Number(raw?.thisMonth) || 0,
    pending: Number(raw?.pending) || 0,
  }
}

function normalizePayment(row) {
  return {
    id: row.id,
    transactionId: row.transactionId,
    applicationId: row.applicationId,
    date: row.date,
    student: row.student || '—',
    property: row.property || '—',
    amount: Number(row.amount) || 0,
    type: row.type || 'Payment',
    status: String(row.status || 'pending').toLowerCase(),
    currency: row.currency || 'MYR',
    externalRef: row.externalRef || '',
  }
}

function escapeCsv(value) {
  const s = String(value ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function buildCsv(payments) {
  const headers = ['Date', 'Student', 'Property', 'Amount', 'Type', 'Status']
  const lines = [headers.join(',')]
  payments.forEach((row) => {
    lines.push(
      [
        formatDate(row.date),
        row.student,
        row.property,
        formatMoney(row.amount),
        row.type,
        row.status,
      ]
        .map(escapeCsv)
        .join(','),
    )
  })
  return lines.join('\n')
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

function buildPrintableHtml(payments, stats) {
  const rows = payments
    .map(
      (row) => `
      <tr>
        <td>${formatDate(row.date)}</td>
        <td>${row.student}</td>
        <td>${row.property}</td>
        <td>${formatMoney(row.amount)}</td>
        <td>${row.type}</td>
        <td>${row.status}</td>
      </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>MySewa Payments Export</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a2e; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    p { margin: 4px 0 16px; color: #6b7280; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
    th { background: #fafafa; }
  </style>
</head>
<body>
  <h1>MySewa — Platform Payments</h1>
  <p>Total Revenue: ${formatMoney(stats.totalRevenue)} · This Month: ${formatMoney(stats.thisMonth)} · Pending: ${formatMoney(stats.pending)}</p>
  <table>
    <thead>
      <tr><th>Date</th><th>Student</th><th>Property</th><th>Amount</th><th>Type</th><th>Status</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`
}

export default function AdminPaymentsPage() {
  const { loading, error, token } = useAdminGuard()
  const { pushToast } = useToast()

  const [payments, setPayments] = useState([])
  const [stats, setStats] = useState({ totalRevenue: 0, thisMonth: 0, pending: 0 })
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [detailPayment, setDetailPayment] = useState(null)

  const loadPayments = useCallback(async () => {
    if (!token) return
    setPaymentsLoading(true)
    try {
      const res = await fetch('/api/v1/admin/payments', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Failed to load payments (${res.status})`)
      const items = Array.isArray(data.items) ? data.items.map(normalizePayment) : []
      setPayments(items)
      setStats(normalizeStats(data.stats))
    } catch (e) {
      setPayments([])
      setStats({ totalRevenue: 0, thisMonth: 0, pending: 0 })
      pushToast({ message: e.message || 'Could not load payments.', type: 'error' })
    } finally {
      setPaymentsLoading(false)
    }
  }, [token, pushToast])

  useEffect(() => {
    if (token) void loadPayments()
  }, [token, loadPayments])

  const sortedPayments = useMemo(() => {
    return [...payments].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  }, [payments])

  function handleExportCsv() {
    if (!sortedPayments.length) return
    downloadBlob(buildCsv(sortedPayments), `mysewa-payments-${Date.now()}.csv`, 'text/csv;charset=utf-8')
    pushToast({ message: 'CSV export downloaded.', type: 'success' })
  }

  function handleExportPdf() {
    if (!sortedPayments.length) return
    const html = buildPrintableHtml(sortedPayments, stats)
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
      <AdminPayments
        stats={stats}
        payments={sortedPayments}
        loading={paymentsLoading}
        detailPayment={detailPayment}
        onViewPayment={setDetailPayment}
        onCloseDetail={() => setDetailPayment(null)}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
      />
    </AdminLayout>
  )
}
