function ErrorShell({ icon, title, message, children, className = '' }) {
  return (
    <div
      className={`mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-[#E2E8F0] bg-white px-8 py-12 text-center shadow-sm ${className}`}
      role="alert"
    >
      <p className="text-5xl leading-none" aria-hidden="true">
        {icon}
      </p>
      <h1 className="mt-5 text-xl font-bold text-[#2D3748]">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-[#A0AEC0]">{message}</p>
      {children ? <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{children}</div> : null}
    </div>
  )
}

function PrimaryButton({ children, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg bg-[#E88D5B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#D97747] ${className}`}
    >
      {children}
    </button>
  )
}

function OutlineButton({ children, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border border-[#E2E8F0] bg-white px-5 py-2.5 text-sm font-semibold text-[#2D3748] transition hover:bg-[#F7FAFC] ${className}`}
    >
      {children}
    </button>
  )
}

export default function PropertyNotFound({ onBack }) {
  return (
    <ErrorShell
      icon="🏠❌"
      title="Property Not Found"
      message="The property you're looking for doesn't exist or has been removed."
    >
      <PrimaryButton onClick={onBack}>← Back to My Properties</PrimaryButton>
    </ErrorShell>
  )
}

export { ErrorShell, PrimaryButton, OutlineButton }
