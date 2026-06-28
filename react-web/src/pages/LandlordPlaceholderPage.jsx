import LandlordLayout from '../components/LandlordLayout'
import { useLandlordGuard } from '../hooks/useLandlordGuard'

export default function LandlordPlaceholderPage({ title, description }) {
  const { loading, error } = useLandlordGuard()

  if (loading) {
    return (
      <LandlordLayout>
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-[#A0AEC0]">Loading…</p>
        </div>
      </LandlordLayout>
    )
  }

  if (error) {
    return (
      <LandlordLayout>
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Error: {error}
          </div>
        </div>
      </LandlordLayout>
    )
  }

  return (
    <LandlordLayout>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold text-[#2D3748]">{title}</h1>
        <p className="mt-2 text-sm text-[#A0AEC0]">{description}</p>
        <div className="mt-8 rounded-xl border border-[#E2E8F0] bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-[#4A5568]">This section is coming soon.</p>
        </div>
      </div>
    </LandlordLayout>
  )
}
