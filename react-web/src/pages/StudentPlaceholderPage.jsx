import { useLocation } from 'react-router-dom'
import StudentLayout from '../components/StudentLayout'
import { useStudentGuard } from '../hooks/useStudentGuard'

const PAGE_META = {
  '/dashboard/student/bookings': {
    title: 'My Bookings',
    description: 'Track your rental applications and booking status.',
  },
  '/dashboard/student/payments': {
    title: 'Payments',
    description: 'View deposit and rent payment history.',
  },
  '/dashboard/student/reviews': {
    title: 'Reviews',
    description: 'Read and write reviews for your rentals.',
  },
  '/dashboard/student/saved': {
    title: 'Saved Properties',
    description: 'Properties you have saved for later.',
  },
  '/dashboard/student/reports': {
    title: 'Reports',
    description: 'Submit and track maintenance or issue reports.',
  },
  '/dashboard/student/verification': {
    title: 'Verification',
    description: 'Complete student identity verification.',
  },
}

export default function StudentPlaceholderPage() {
  const location = useLocation()
  const { loading, error } = useStudentGuard()
  const meta = PAGE_META[location.pathname] || { title: 'Student', description: '' }

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-[#6B7280]">Loading…</p>
        </div>
      </StudentLayout>
    )
  }

  if (error) {
    return (
      <StudentLayout>
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Error: {error}
          </div>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">{meta.title}</h1>
        <p className="mt-2 text-sm text-[#6B7280]">{meta.description}</p>
        <div className="mt-8 rounded-xl border border-[#E2E8F0] bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-[#4B5563]">This section is coming soon.</p>
        </div>
      </div>
    </StudentLayout>
  )
}
