import { useEffect } from 'react'

export default function LandlordActionModalShell({
  titleId,
  title,
  children,
  onClose,
  disabled = false,
}) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e) {
      if (e.key === 'Escape' && !disabled) onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, disabled])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={disabled ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={disabled}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-lg text-[#A0AEC0] transition hover:bg-[#F7FAFC] hover:text-[#2D3748] disabled:opacity-50"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 id={titleId} className="pr-8 text-lg font-bold text-[#2D3748]">
          {title}
        </h2>

        {children}
      </div>
    </div>
  )
}

export const messageTextareaClassName =
  'mt-2 w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#2D3748] placeholder:text-[#A0AEC0] focus:border-[#E88D5B] focus:outline-none focus:ring-2 focus:ring-[#E88D5B] disabled:opacity-60'
