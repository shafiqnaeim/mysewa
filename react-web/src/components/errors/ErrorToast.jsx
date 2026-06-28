import { useEffect } from 'react'

export default function ErrorToast({
  message = 'Something went wrong.',
  onClose,
  duration = 5000,
  className = '',
}) {
  useEffect(() => {
    if (!onClose || duration <= 0) return undefined
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!message) return null

  return (
    <div
      className={`fixed right-4 top-4 z-[100] flex max-w-sm items-start gap-3 rounded-xl border border-[#FC8181]/40 bg-white px-4 py-3 shadow-lg ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <span className="text-lg leading-none text-[#E53E3E]" aria-hidden="true">
        ❌
      </span>
      <p className="flex-1 text-sm font-medium text-[#2D3748]">{message}</p>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-1.5 py-0.5 text-sm text-[#A0AEC0] transition hover:bg-[#F7FAFC] hover:text-[#4A5568]"
          aria-label="Dismiss error"
        >
          ✕
        </button>
      ) : null}
    </div>
  )
}
