import { ErrorShell, PrimaryButton } from './PropertyNotFound'

export default function UnauthorizedError({ onGoBack, message }) {
  return (
    <ErrorShell
      icon="🔒"
      title="Access Denied"
      message={message || "You don't have permission to view this property."}
    >
      <PrimaryButton onClick={onGoBack}>← Go Back</PrimaryButton>
    </ErrorShell>
  )
}
