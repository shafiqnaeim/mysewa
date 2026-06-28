import { PrimaryButton } from './PropertyNotFound'
import { ErrorShell } from './PropertyNotFound'

export default function NetworkError({ onRetry, message }) {
  return (
    <ErrorShell
      icon="🌐❌"
      title="Connection Error"
      message={message || 'Unable to connect to the server. Please check your internet connection.'}
    >
      <PrimaryButton onClick={onRetry}>
        <span aria-hidden="true">🔄 </span>
        Retry
      </PrimaryButton>
    </ErrorShell>
  )
}
