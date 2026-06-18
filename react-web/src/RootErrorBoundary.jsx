import { Component } from 'react'

/**
 * Catches render errors so the tab is not an unexplained white screen.
 * Check the browser console (F12) for the full stack.
 */
export default class RootErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    const { error } = this.state
    if (error) {
      const msg = error?.message != null ? String(error.message) : String(error)
      return (
        <div
          className="root-error-boundary"
          style={{
            padding: '2rem',
            maxWidth: '42rem',
            margin: '0 auto',
            fontFamily: 'system-ui, Segoe UI, sans-serif',
            lineHeight: 1.5,
          }}
        >
          <h1 style={{ color: '#b91c1c', fontSize: '1.25rem', margin: '0 0 0.75rem' }}>MySewa hit an error</h1>
          <p style={{ margin: '0 0 1rem', color: '#334155' }}>
            The app could not render this view. Try a hard refresh (Ctrl+Shift+R). If it keeps happening, open the
            developer console (F12 → Console) and share the red error text.
          </p>
          <pre
            style={{
              background: '#f1f5f9',
              padding: '1rem',
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '0.85rem',
              color: '#0f172a',
            }}
          >
            {msg}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
