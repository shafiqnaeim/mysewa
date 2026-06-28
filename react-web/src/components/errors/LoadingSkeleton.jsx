const shimmerStyle = `
  @keyframes mysewa-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`

function ShimmerBlock({ className = '' }) {
  return (
    <div
      className={`rounded-lg bg-[length:200%_100%] bg-gradient-to-r from-[#EDF2F7] via-[#F7FAFC] to-[#EDF2F7] ${className}`}
      style={{ animation: 'mysewa-shimmer 1.6s ease-in-out infinite' }}
    />
  )
}

export function PropertyCardSkeleton({ className = '' }) {
  return (
    <article className={`overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm ${className}`}>
      <ShimmerBlock className="h-48 w-full rounded-none" />
      <div className="space-y-3 p-5">
        <ShimmerBlock className="h-5 w-3/4" />
        <ShimmerBlock className="h-4 w-full" />
        <ShimmerBlock className="h-4 w-2/3" />
        <div className="grid grid-cols-3 gap-2 pt-2">
          <ShimmerBlock className="h-14" />
          <ShimmerBlock className="h-14" />
          <ShimmerBlock className="h-14" />
        </div>
        <ShimmerBlock className="h-10 w-full" />
      </div>
    </article>
  )
}

export default function LoadingSkeleton({ variant = 'property-detail' }) {
  if (variant === 'property-card') {
    return (
      <>
        <style>{shimmerStyle}</style>
        <PropertyCardSkeleton />
      </>
    )
  }

  return (
    <>
      <style>{shimmerStyle}</style>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <ShimmerBlock className="h-4 w-72" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <ShimmerBlock className="h-8 w-80 max-w-full" />
        <div className="flex gap-2">
          <ShimmerBlock className="h-10 w-32" />
          <ShimmerBlock className="h-10 w-32" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
        <ShimmerBlock className="h-64 w-full rounded-none" />
        <div className="space-y-3 p-6">
          <ShimmerBlock className="h-9 w-48" />
          <ShimmerBlock className="h-4 w-full" />
          <ShimmerBlock className="h-4 w-5/6" />
          <ShimmerBlock className="h-16 w-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ShimmerBlock className="h-24" />
        <ShimmerBlock className="h-24" />
        <ShimmerBlock className="h-24" />
        <ShimmerBlock className="h-24" />
      </div>

      <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="flex gap-2">
          <ShimmerBlock className="h-10 w-24" />
          <ShimmerBlock className="h-10 w-24" />
          <ShimmerBlock className="h-10 w-24" />
        </div>
        <div className="mt-6 space-y-3">
          <ShimmerBlock className="h-4 w-full" />
          <ShimmerBlock className="h-4 w-full" />
          <ShimmerBlock className="h-4 w-3/4" />
        </div>
      </div>
    </div>
    </>
  )
}
