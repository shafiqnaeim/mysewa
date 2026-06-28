import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { useAdminGuard } from '../hooks/useAdminGuard'
import { useToast } from '../context/ToastContext'
import {
  addAdminNotification,
  audienceLabel,
  promoteDueScheduled,
  readAdminNotifications,
  writeAdminNotifications,
} from '../utils/adminNotificationsStorage'
import AdminNotifications from './dashboard/AdminNotifications'

const EMPTY_COMPOSE = {
  title: '',
  message: '',
  audience: 'all',
}

function resolveAudienceTotal(audience, counts) {
  if (!counts) return 0
  if (audience === 'students') return counts.students
  if (audience === 'landlords') return counts.landlords
  return counts.total
}

export default function AdminNotificationsPage() {
  const { loading, error, token } = useAdminGuard()
  const { pushToast } = useToast()

  const [compose, setCompose] = useState(EMPTY_COMPOSE)
  const [scheduleMode, setScheduleMode] = useState('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [sending, setSending] = useState(false)

  const [notifications, setNotifications] = useState([])
  const [listLoading, setListLoading] = useState(false)
  const [detailNotification, setDetailNotification] = useState(null)

  const [audienceCounts, setAudienceCounts] = useState(null)

  const loadAudienceCounts = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/v1/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return
      setAudienceCounts({
        total: Number(data.usersTotal) || 0,
        students: Number(data.usersStudents) || 0,
        landlords: Number(data.usersLandlords) || 0,
      })
    } catch {
      /* ignore */
    }
  }, [token])

  const refreshNotifications = useCallback(() => {
    setListLoading(true)
    try {
      let items = readAdminNotifications()
      const { items: promoted, changed } = promoteDueScheduled(items)
      if (changed) writeAdminNotifications(promoted)
      items = changed ? promoted : items
      setNotifications(
        items.map((row) => ({
          ...row,
          audienceLabel: audienceLabel(row.audience),
        })),
      )
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) {
      void loadAudienceCounts()
      refreshNotifications()
    }
  }, [token, loadAudienceCounts, refreshNotifications])

  useEffect(() => {
    const timer = window.setInterval(() => refreshNotifications(), 30000)
    return () => window.clearInterval(timer)
  }, [refreshNotifications])

  const displayNotifications = useMemo(() => notifications, [notifications])

  function handleComposeChange(key, value) {
    setCompose((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSend() {
    const title = compose.title.trim()
    const message = compose.message.trim()
    if (!title || !message) {
      pushToast({ message: 'Title and message are required.', type: 'error' })
      return
    }

    if (scheduleMode === 'later') {
      if (!scheduledAt) {
        pushToast({ message: 'Choose a schedule date and time.', type: 'error' })
        return
      }
      const due = new Date(scheduledAt).getTime()
      if (!Number.isFinite(due) || due <= Date.now()) {
        pushToast({ message: 'Schedule time must be in the future.', type: 'error' })
        return
      }
    }

    setSending(true)
    try {
      const audienceTotal = resolveAudienceTotal(compose.audience, audienceCounts)
      const isScheduled = scheduleMode === 'later'
      const row = addAdminNotification({
        title,
        message,
        audience: compose.audience,
        status: isScheduled ? 'scheduled' : 'sent',
        scheduledAt: isScheduled ? new Date(scheduledAt).toISOString() : null,
        sentAt: isScheduled ? null : new Date().toISOString(),
        audienceTotal,
        readCount: 0,
      })
      setCompose(EMPTY_COMPOSE)
      setScheduleMode('now')
      setScheduledAt('')
      refreshNotifications()
      pushToast({
        message: isScheduled ? `Notification scheduled for ${new Date(row.scheduledAt).toLocaleString()}.` : 'Notification sent.',
        type: 'success',
      })
    } catch (e) {
      pushToast({ message: e.message || 'Could not send notification.', type: 'error' })
    } finally {
      setSending(false)
    }
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
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <AdminNotifications
        compose={compose}
        scheduleMode={scheduleMode}
        scheduledAt={scheduledAt}
        sending={sending}
        notifications={displayNotifications}
        loading={listLoading}
        detailNotification={detailNotification}
        audienceCounts={audienceCounts}
        onComposeChange={handleComposeChange}
        onScheduleModeChange={setScheduleMode}
        onScheduledAtChange={setScheduledAt}
        onSend={handleSend}
        onView={(row) => setDetailNotification(row)}
        onCloseDetail={() => setDetailNotification(null)}
      />
    </AdminLayout>
  )
}
