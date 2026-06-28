import { useMemo } from 'react'

function IconStar({ filled = true, className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.5} aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292Z" />
    </svg>
  )
}

function StarRow({ count, size = 'h-4 w-4' }) {
  const rating = Math.min(5, Math.max(0, Number(count) || 0))
  return (
    <span className="inline-flex gap-0.5 text-[#ED8936]">
      {Array.from({ length: 5 }, (_, i) => (
        <IconStar key={i} filled={i < rating} className={size} />
      ))}
    </span>
  )
}

export function formatRelativeTime(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    const diffMs = Date.now() - d.getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
    const years = Math.floor(months / 12)
    return `${years} year${years === 1 ? '' : 's'} ago`
  } catch {
    return '—'
  }
}

export function computeReviewStats(reviews) {
  const list = Array.isArray(reviews) ? reviews : []
  const count = list.length
  if (!count) return { average: 0, count: 0 }
  const sum = list.reduce((acc, r) => acc + (Number(r.rating) || 0), 0)
  return { average: sum / count, count }
}

function ReviewCard({ review }) {
  return (
    <article className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm transition hover:shadow-md">
      <StarRow count={review.rating} />
      <p className="mt-4 text-sm italic leading-relaxed text-[#4A5568]">&ldquo;{review.comment}&rdquo;</p>
      <p className="mt-4 text-sm font-semibold text-[#2D3748]">{review.student}</p>
      <p className="mt-1 text-sm text-[#A0AEC0]">{review.property}</p>
      <p className="mt-2 text-xs text-[#A0AEC0]">{formatRelativeTime(review.createdAt)}</p>
    </article>
  )
}

export default function Reviews({ reviews = [], loading = false }) {
  const stats = useMemo(() => computeReviewStats(reviews), [reviews])

  const sorted = useMemo(() => {
    return [...reviews].sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime()
      const db = new Date(b.createdAt || 0).getTime()
      return db - da
    })
  }, [reviews])

  return (
    <div className="min-h-[calc(100vh-4.5rem)] w-full bg-[#FAFAFA] font-sans text-[#2D3748] lg:min-h-screen">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#2D3748]">Reviews</h1>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-[#4A5568]">
            <span>Average Rating:</span>
            <span className="inline-flex items-center gap-1 font-semibold text-[#2D3748]">
              {stats.count ? stats.average.toFixed(1) : '0.0'}
              <IconStar className="h-4 w-4 text-[#ED8936]" />
            </span>
            <span className="text-[#A0AEC0]">({stats.count} review{stats.count === 1 ? '' : 's'})</span>
          </p>
        </header>

        {loading ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-sm text-[#A0AEC0]">Loading reviews…</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-sm font-medium text-[#2D3748]">No reviews yet</p>
            <p className="mt-2 text-sm text-[#A0AEC0]">
              Reviews from students will appear here after they rate your properties.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
