export default function DeletePropertyConfirmModal({ propertyName, deleting, onCancel, onConfirm }) {
  const label = propertyName?.trim() || 'this property'

  return (
    <div className="delete-confirm-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="delete-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
        aria-describedby="delete-confirm-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="delete-confirm-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
            <path
              d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </div>
        <h2 id="delete-confirm-title" className="delete-confirm-title">
          Delete Confirmation
        </h2>
        <p id="delete-confirm-desc" className="delete-confirm-desc">
          <strong>{label}</strong> will be removed permanently. Photos and listing details cannot be recovered.
        </p>
        <div className="delete-confirm-actions">
          <button type="button" className="delete-confirm-btn delete-confirm-btn--cancel" onClick={onCancel} disabled={deleting}>
            Cancel
          </button>
          <button
            type="button"
            className="delete-confirm-btn delete-confirm-btn--danger"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete property'}
          </button>
        </div>
      </div>
    </div>
  )
}
