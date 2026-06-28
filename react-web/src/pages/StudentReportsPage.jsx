import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudentLayout from '../components/StudentLayout'
import { useStudentGuard } from '../hooks/useStudentGuard'
import { useToast } from '../context/ToastContext'
import StudentReports from './dashboard/StudentReports'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024

export default function StudentReportsPage() {
  const navigate = useNavigate()
  const { user, loading, error } = useStudentGuard()
  const { pushToast } = useToast()

  const reportFileInputRef = useRef(null)
  const [myApplications, setMyApplications] = useState([])
  const [applicationsLoading, setApplicationsLoading] = useState(false)
  const [propertyName, setPropertyName] = useState('')

  const [myReports, setMyReports] = useState([])
  const [myReportsLoading, setMyReportsLoading] = useState(false)
  const [myReportsRefresh, setMyReportsRefresh] = useState(0)

  const [reportText, setReportText] = useState('')
  const [reportImage, setReportImage] = useState(null)
  const [reportImageName, setReportImageName] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [resolveSavingId, setResolveSavingId] = useState(null)

  const acceptedApplications = useMemo(
    () => myApplications.filter((a) => String(a.status || '').toLowerCase() === 'accepted' && a.propertyId != null),
    [myApplications],
  )

  const primaryApplication = useMemo(() => {
    if (!acceptedApplications.length) return null
    return [...acceptedApplications].sort((a, b) => {
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime()
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime()
      return tb - ta
    })[0]
  }, [acceptedApplications])

  const hasTenancy = Boolean(primaryApplication?.propertyId)

  useEffect(() => {
    if (!user?.id) return
    const token = localStorage.getItem('mysewa_token')
    if (!token) return
    let cancelled = false
    async function load() {
      setApplicationsLoading(true)
      try {
        const res = await fetch('/api/v1/applications/for-student', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.message || `Failed to load applications (${res.status})`)
        if (!cancelled) setMyApplications(Array.isArray(data.items) ? data.items : [])
      } catch (e) {
        if (!cancelled) {
          setMyApplications([])
          pushToast({ message: e.message || 'Could not load your applications.', type: 'error' })
        }
      } finally {
        if (!cancelled) setApplicationsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user?.id, pushToast])

  useEffect(() => {
    const pid = primaryApplication?.propertyId
    if (!pid) {
      setPropertyName('')
      return
    }
    let cancelled = false
    async function loadProp() {
      try {
        const res = await fetch(`/api/v1/properties/${encodeURIComponent(pid)}`)
        const data = await res.json().catch(() => ({}))
        if (!cancelled) {
          const item = data.item
          setPropertyName(item?.title || item?.name || '')
        }
      } catch {
        if (!cancelled) setPropertyName('')
      }
    }
    loadProp()
    return () => {
      cancelled = true
    }
  }, [primaryApplication?.propertyId])

  const loadMyReports = useCallback(async () => {
    const pid = primaryApplication?.propertyId
    const token = localStorage.getItem('mysewa_token')
    if (!pid || !token) {
      setMyReports([])
      return
    }
    setMyReportsLoading(true)
    try {
      const res = await fetch(`/api/v1/properties/${encodeURIComponent(pid)}/tenant-reports/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not load your reports (${res.status})`)
      setMyReports(Array.isArray(data.items) ? data.items : [])
    } catch (e) {
      setMyReports([])
      pushToast({ message: e.message || 'Could not load your reports.', type: 'error' })
    } finally {
      setMyReportsLoading(false)
    }
  }, [primaryApplication?.propertyId, myReportsRefresh, pushToast])

  useEffect(() => {
    void loadMyReports()
  }, [loadMyReports])

  useEffect(() => {
    function onVis() {
      if (document.visibilityState !== 'visible') return
      if (!primaryApplication?.propertyId) return
      setMyReportsRefresh((n) => n + 1)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [primaryApplication?.propertyId])

  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) {
      setReportImage(null)
      setReportImageName('')
      return
    }
    if (!file.type.startsWith('image/')) {
      pushToast({ message: 'Please choose a JPG or PNG image.', type: 'error' })
      e.target.value = ''
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      pushToast({ message: 'Image is too large (max 8 MB).', type: 'error' })
      e.target.value = ''
      return
    }
    setReportImage(file)
    setReportImageName(file.name)
  }

  async function submitReport(e) {
    e.preventDefault()
    const pid = primaryApplication?.propertyId
    if (!pid || !reportText.trim()) return
    if (reportText.trim().length < 10) {
      pushToast({ message: 'Please write at least 10 characters so your landlord understands the issue.', type: 'error' })
      return
    }
    const token = localStorage.getItem('mysewa_token')
    if (!token) {
      pushToast({ message: 'Sign in to submit a report.', type: 'error' })
      return
    }
    setReportSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('message', reportText.trim())
      if (reportImage) fd.append('image', reportImage)
      const res = await fetch(`/api/v1/properties/${encodeURIComponent(pid)}/tenant-reports`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not send report (${res.status})`)
      pushToast({ message: 'Report submitted. Your landlord will be notified.', type: 'success' })
      setReportText('')
      setReportImage(null)
      setReportImageName('')
      if (reportFileInputRef.current) reportFileInputRef.current.value = ''
      setMyReportsRefresh((n) => n + 1)
    } catch (err) {
      pushToast({ message: err.message || 'Could not submit report.', type: 'error' })
    } finally {
      setReportSubmitting(false)
    }
  }

  async function resolveStudentReport(reportId) {
    const pid = primaryApplication?.propertyId
    const token = localStorage.getItem('mysewa_token')
    if (!pid || !token || !reportId) return
    setResolveSavingId(reportId)
    try {
      const res = await fetch(
        `/api/v1/properties/${encodeURIComponent(pid)}/tenant-reports/${encodeURIComponent(reportId)}/resolve`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not resolve (${res.status})`)
      pushToast({ message: 'Marked as resolved — thanks for confirming the fix.', type: 'success' })
      setMyReportsRefresh((n) => n + 1)
    } catch (e) {
      pushToast({ message: e.message || 'Could not mark resolved.', type: 'error' })
    } finally {
      setResolveSavingId(null)
    }
  }

  if (loading || applicationsLoading) {
    return (
      <StudentLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA]">
          <p className="text-sm text-[#6B7280]">Loading…</p>
        </div>
      </StudentLayout>
    )
  }

  if (error) {
    return (
      <StudentLayout>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Error: {error}
          </div>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <StudentReports
        hasTenancy={hasTenancy}
        propertyName={propertyName}
        reports={myReports}
        reportsLoading={myReportsLoading}
        reportText={reportText}
        reportImageName={reportImageName}
        reportSubmitting={reportSubmitting}
        resolveSavingId={resolveSavingId}
        reportFileInputRef={reportFileInputRef}
        onReportTextChange={setReportText}
        onChooseFile={() => reportFileInputRef.current?.click()}
        onFileChange={onFileChange}
        onSubmitReport={submitReport}
        onResolveReport={resolveStudentReport}
        onBrowseListings={() => navigate('/properties')}
      />
    </StudentLayout>
  )
}
