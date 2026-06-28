import { ErrorShell, OutlineButton, PrimaryButton } from './PropertyNotFound'

export default function DeleteError({ onRetry, onCancel, message }) {
  return (
    <ErrorShell
      icon="🗑️❌"
      title="Delete Failed"
      message={message || 'Unable to delete this property. Please try again.'}
    >
      <PrimaryButton onClick={onRetry}>
        <span aria-hidden="true">🔄 </span>
        Retry
      </PrimaryButton>
      <OutlineButton onClick={onCancel}>Cancel</OutlineButton>
    </ErrorShell>
  )
}
