import { useEffect, useState } from 'react'
import LandlordLayout from '../components/LandlordLayout'
import { useLandlordGuard } from '../hooks/useLandlordGuard'
import { useToast } from '../context/ToastContext'
import Payments from './dashboard/Payments'

function depositAmount(app) {
  const raw = app.landlordDepositAmount ?? app.depositAmountSuggested
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

function studentName(app) {
  return app.student?.fullName?.trim() || 'Student'
}

function buildDepositPayments(applications) {
  const rows = []
  for (const app of applications) {
    const amount = depositAmount(app)
    if (amount <= 0) continue

    if (app.depositPaid) {
      rows.push({
        id: `deposit-${app.id}`,
        date: app.updatedAt || app.createdAt,
        student: studentName(app),
        property: app.propertyName || `Property #${app.propertyId}`,
        amount,
        type: 'Deposit',
        status: 'paid',
      })
    } else if (String(app.status || '').toLowerCase() === 'accepted') {
      rows.push({
        id: `deposit-pending-${app.id}`,
        date: app.updatedAt || app.createdAt,
        student: studentName(app),
        property: app.propertyName || `Property #${app.propertyId}`,
        amount,
        type: 'Deposit',
        status: 'pending',
      })
    }
  }
  return rows
}

function rentRowsFromCalendar(app, calendar, year) {
  const records = Array.isArray(calendar.rentMonthRecords) ? calendar.rentMonthRecords : []
  const student = calendar.studentName || studentName(app)
  const property = calendar.propertyName || app.propertyName || `Property #${app.propertyId}`
  const rows = []

  for (const record of records) {
    const state = String(record.monthState || '').toLowerCase()
    if (state === 'unavailable') continue
    const amount = Number(record.amount)
    if (!Number.isFinite(amount) || amount <= 0) continue

    const month = Number(record.month)
    const date = Number.isFinite(month) ? new Date(year, month - 1, 1).toISOString() : app.updatedAt

    rows.push({
      id: `rent-${app.id}-${year}-${record.month}`,
      date,
      student,
      property,
      amount,
      type: 'Rent',
      status: state === 'paid' || state === 'completed' ? 'paid' : 'pending',
    })
  }

  return rows
}

export default function LandlordPaymentsPage() {
  const { user, loading: authLoading, error: authError } = useLandlordGuard()
  const { pushToast } = useToast()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authError) pushToast({ message: authError, type: 'error', duration: 7000 })
  }, [authError, pushToast])

  useEffect(() => {
    if (!user?.id) return
    const token = localStorage.getItem('mysewa_token')
    if (!token) return

    let cancelled = false

    async function loadPayments() {
      setLoading(true)
      try {
        const res = await fetch('/api/v1/applications/for-landlord', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.message || `Failed to load payments (HTTP ${res.status})`)

        const applications = Array.isArray(data.items) ? data.items : []
        const rows = buildDepositPayments(applications)

        const accepted = applications.filter((a) => String(a.status || '').toLowerCase() === 'accepted')
        const year = new Date().getFullYear()

        await Promise.all(
          accepted.map(async (app) => {
            try {
              const calRes = await fetch(
                `/api/v1/applications/${encodeURIComponent(app.id)}/rent-months?year=${year}`,
                { headers: { Authorization: `Bearer ${token}` } },
              )
              const calendar = await calRes.json().catch(() => ({}))
              if (!calRes.ok) return
              rows.push(...rentRowsFromCalendar(app, calendar, year))
            } catch {
              /* skip rent rows for this app */
            }
          }),
        )

        if (!cancelled) setPayments(rows)
      } catch (e) {
        if (!cancelled) {
          setPayments([])
          pushToast({ message: e.message || 'Unable to load payments.', type: 'error' })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPayments()
    return () => {
      cancelled = true
    }
  }, [user?.id, pushToast])

  if (authLoading) {
    return (
      <LandlordLayout>
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-[#A0AEC0]">Loading payments…</p>
        </div>
      </LandlordLayout>
    )
  }

  if (authError) {
    return (
      <LandlordLayout>
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Error: {authError}
          </div>
        </div>
      </LandlordLayout>
    )
  }

  return (
    <LandlordLayout>
      <Payments payments={payments} loading={loading} />
    </LandlordLayout>
  )
}
