import { jsPDF } from 'jspdf'

import { MONTH_FULL } from './rentTrackerUtils'

const BRAND_NAVY = [45, 55, 72]
const BRAND_ORANGE = [232, 141, 91]
const TEXT_MUTED = [160, 174, 192]
const TEXT_BODY = [74, 85, 104]
const TEXT_DARK = [45, 55, 72]
const BORDER = [226, 232, 240]
const GREEN = [22, 163, 74]

export function generateReceiptNumber({ year, paymentLogId, bookingId, month, kind } = {}) {
  const y = Number(year) || new Date().getFullYear()
  if (kind === 'deposit' && bookingId != null) {
    return `RCP-${y}-D${String(bookingId).padStart(4, '0')}`
  }
  if (paymentLogId != null) {
    return `RCP-${y}-${String(paymentLogId).padStart(4, '0')}`
  }
  const id = bookingId != null ? String(bookingId) : '0'
  const m = String(Number(month) || 1).padStart(2, '0')
  return `RCP-${y}-${id}${m}`
}

export function formatReceiptDate(value) {
  const d = value instanceof Date ? value : value ? new Date(value) : new Date()
  if (Number.isNaN(d.getTime())) {
    return new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatConfirmedDateTime(value) {
  const d = value instanceof Date ? value : value ? new Date(value) : new Date()
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatReceiptAmount(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '—'
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function paymentMethodLabel(code) {
  switch (String(code || '').toLowerCase()) {
    case 'cash':
      return 'Cash'
    case 'bank_transfer':
      return 'Bank Transfer'
    case 'duitnow_qr':
      return 'QR Code (DuitNow)'
    case 'toyyibpay':
    case 'toyyibpay_link':
      return 'ToyyibPay'
    case 'rent_auto':
    case 'mysewa':
    case 'online':
      return 'MySewa'
    default:
      return code ? String(code).replace(/_/g, ' ') : '—'
  }
}

function receiptFilename(receiptNumber) {
  const safe = String(receiptNumber || 'receipt').replace(/[^\w-]+/g, '_')
  return `receipt_${safe}.pdf`
}

/** Build receipt payload for a confirmed deposit payment. */
export function buildDepositReceiptData({
  application,
  propertyDetail,
  propertyAddress,
  studentName,
  landlordName,
}) {
  const year = new Date().getFullYear()
  const bookingId = application?.id
  const raw =
    application?.landlordDepositAmount ??
    application?.landlord_deposit_amount ??
    application?.depositAmountSuggested
  const amount = Number(raw)
  const paidAt = application?.updatedAt || application?.createdAt || new Date().toISOString()
  const address =
    propertyAddress ||
    propertyDetail?.location ||
    [propertyDetail?.city, propertyDetail?.state].filter(Boolean).join(', ') ||
    ''

  return {
    receiptNumber: generateReceiptNumber({ year, bookingId, kind: 'deposit' }),
    paymentDate: paidAt,
    confirmedAt: paidAt,
    studentName: studentName || application?.studentName || '—',
    propertyName: propertyDetail?.name || application?.propertyName || '—',
    propertyAddress: address,
    monthLabel: 'Security Deposit',
    amount: Number.isFinite(amount) ? amount : null,
    paymentMethod: 'MySewa',
    landlordName: landlordName || propertyDetail?.landlordName || '—',
    status: 'paid',
    bookingId,
    year,
  }
}

/** Build receipt payload for a confirmed rent month. */
export function buildRentReceiptData({
  bookingId,
  year,
  month,
  amount,
  paymentMethod,
  paymentLogId,
  studentName,
  propertyName,
  propertyAddress,
  landlordName,
  recordedAt,
  loggedAt,
}) {
  const monthNum = Number(month)
  const monthLabel =
    monthNum >= 1 && monthNum <= 12 ? `${MONTH_FULL[monthNum - 1]} ${year}` : `${year}`
  const confirmedAt = recordedAt || loggedAt || new Date().toISOString()

  return {
    receiptNumber: generateReceiptNumber({ year, month: monthNum, paymentLogId, bookingId }),
    paymentDate: confirmedAt,
    confirmedAt,
    studentName,
    propertyName,
    propertyAddress,
    monthLabel,
    amount,
    paymentMethod,
    landlordName,
    status: 'paid',
    bookingId,
    year,
    month: monthNum,
    paymentLogId,
  }
}

/**
 * Generates and downloads a professional MySewa payment receipt PDF.
 */
export function downloadRentReceipt(receipt) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentW = pageW - margin * 2
  let y = margin

  const receiptNo =
    receipt.receiptNumber ||
    generateReceiptNumber({
      year: receipt.year,
      month: receipt.month,
      paymentLogId: receipt.paymentLogId,
      bookingId: receipt.bookingId,
    })
  const receiptDate = formatReceiptDate(receipt.paymentDate)
  const confirmedLine = formatConfirmedDateTime(receipt.confirmedAt)
  const isPaid = String(receipt.status || 'paid').toLowerCase() === 'paid'

  doc.setFillColor(...BRAND_NAVY)
  doc.rect(0, 0, pageW, 44, 'F')
  doc.setTextColor(...BRAND_ORANGE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.text('MySewa', margin, 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(203, 213, 224)
  doc.text('House Rental System for Students', margin, 27)

  y = 54
  doc.setTextColor(...TEXT_DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('PAYMENT RECEIPT', margin, y)
  y += 5
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.4)
  doc.line(margin, y, margin + contentW, y)
  y += 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...TEXT_BODY)
  doc.text(`Receipt #: ${receiptNo}`, margin, y)
  doc.text(`Date: ${receiptDate}`, margin, y + 6)
  y += 16

  const partyLines = [
    ['Student:', receipt.studentName || '—'],
    ['Property:', receipt.propertyName || '—'],
  ]
  if (receipt.propertyAddress) {
    partyLines.push(['Address:', receipt.propertyAddress])
  }

  for (const [label, value] of partyLines) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TEXT_DARK)
    doc.text(label, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TEXT_BODY)
    const wrapped = doc.splitTextToSize(String(value), contentW - 30)
    doc.text(wrapped, margin + 26, y)
    y += Math.max(6, wrapped.length * 5)
  }
  y += 4

  const tableX = margin
  const tableW = contentW
  const rowH = 9
  const detailRows = [
    ['Amount', formatReceiptAmount(receipt.amount)],
    ['Month', receipt.monthLabel || '—'],
    ['Method', paymentMethodLabel(receipt.paymentMethod)],
    ['Status', isPaid ? 'PAID' : 'PENDING'],
    ['Landlord', receipt.landlordName || '—'],
  ]
  const tableH = detailRows.length * rowH + 6

  doc.setFillColor(255, 247, 243)
  doc.setDrawColor(...BRAND_ORANGE)
  doc.setLineWidth(0.3)
  doc.roundedRect(tableX, y, tableW, tableH, 2, 2, 'FD')

  let rowY = y + 8
  for (const [label, value] of detailRows) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_MUTED)
    doc.text(label, tableX + 6, rowY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    if (label === 'Status' && isPaid) {
      doc.setTextColor(...GREEN)
      doc.text(value, tableX + 38, rowY)
    } else if (label === 'Amount') {
      doc.setTextColor(...BRAND_ORANGE)
      doc.text(String(value), tableX + 38, rowY)
    } else {
      doc.setTextColor(...TEXT_DARK)
      doc.text(String(value), tableX + 38, rowY)
    }
    rowY += rowH
  }
  y += tableH + 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_BODY)
  doc.text(`Confirmed on: ${confirmedLine}`, margin, y)
  y += 12

  doc.setDrawColor(...BORDER)
  doc.line(margin, y, margin + contentW, y)
  y += 8
  doc.setFontSize(10)
  doc.setTextColor(...BRAND_ORANGE)
  doc.text('Thank you for using MySewa!', margin, y)
  y += 6
  doc.setFontSize(8)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(`© ${new Date().getFullYear()} MySewa. All rights reserved.`, margin, y)

  doc.save(receiptFilename(receiptNo))
  return true
}
