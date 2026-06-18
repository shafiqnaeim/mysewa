import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import TopNavBar from '../components/TopNavBar'
import { dashboardPathForRole } from '../auth/dashboardPaths'

export default function DashboardRouterPage() {
  const [pending, setPending] = useState(true)
  const [target, setTarget] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('mysewa_token')
    if (!token) {
      setTarget('/signin')
      setPending(false)
      return
    }
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/v1/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const raw = await res.text()
        let data = {}
        try {
          data = raw ? JSON.parse(raw) : {}
        } catch {
          data = {}
        }
        if (!res.ok) throw new Error()
        const user = data.user
        const path = dashboardPathForRole(user?.role)
        if (!cancelled) setTarget(path)
      } catch {
        localStorage.removeItem('mysewa_token')
        if (!cancelled) setTarget('/signin')
      } finally {
        if (!cancelled) setPending(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (pending) {
    return (
      <div className="app-shell">
        <TopNavBar />
        <main className="auth-simple-page auth-simple-page--in-shell">
          <section className="auth-simple-card dashboard-card">
            <div className="auth-toast">Routing to your dashboard…</div>
          </section>
        </main>
      </div>
    )
  }

  return <Navigate to={target || '/signin'} replace />
}
