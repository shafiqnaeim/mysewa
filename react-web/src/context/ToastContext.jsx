import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

let toastId = 0

function ToastIcon({ type }) {
  if (type === 'error') {
    return (
      <span className="mysewa-toast-icon mysewa-toast-icon--error" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 7v6M12 17h.01" />
        </svg>
      </span>
    )
  }
  if (type === 'info') {
    return (
      <span className="mysewa-toast-icon mysewa-toast-icon--info" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      </span>
    )
  }
  return (
    <span className="mysewa-toast-icon mysewa-toast-icon--success" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  )
}

function ToastItem({ toast, onDismiss }) {
  return (
    <div className={`mysewa-toast mysewa-toast--${toast.type}`} role="status">
      <ToastIcon type={toast.type} />
      <p className="mysewa-toast-message">{toast.message}</p>
      <button type="button" className="mysewa-toast-close" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const dismiss = useCallback((id) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const pushToast = useCallback(
    ({ message, type = 'success', duration = 5200 }) => {
      const text = String(message || '').trim()
      if (!text) return null

      const id = ++toastId
      setToasts((list) => [...list, { id, message: text, type }])

      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration)
        timersRef.current.set(id, timer)
      }
      return id
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ pushToast, dismiss }}>
      {children}
      <div className="mysewa-toast-stack" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
