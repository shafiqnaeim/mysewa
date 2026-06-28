import { PrimaryButton, OutlineButton } from './PropertyNotFound'

export default function EmptyState({
  icon = '📭',
  title = 'Nothing here yet',
  message = '',
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-xl border border-dashed border-[#E2E8F0] bg-[#F7FAFC] px-6 py-10 text-center ${className}`}
    >
      <p className="text-4xl" aria-hidden="true">
        {icon}
      </p>
      <h2 className="mt-4 text-lg font-semibold text-[#2D3748]">{title}</h2>
      {message ? <p className="mt-2 max-w-md text-sm leading-relaxed text-[#A0AEC0]">{message}</p> : null}
      {actionLabel && onAction ? (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <PrimaryButton onClick={onAction}>{actionLabel}</PrimaryButton>
          {secondaryLabel && onSecondary ? (
            <OutlineButton onClick={onSecondary}>{secondaryLabel}</OutlineButton>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
