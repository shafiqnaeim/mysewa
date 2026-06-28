import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardPathForRole, normalizeRole } from '../auth/dashboardPaths'

/** Load /me, require admin; redirects otherwise. */
export function useAdminGuard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [token, setToken] = useState('')

  const loadMe = useCallback(async () => {
    const localToken = localStorage.getItem('mysewa_token')
    if (!localToken) {
      navigate('/signin')
      return
    }
    setToken(localToken)
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${localToken}` },
      })
      const raw = await res.text()
      let data = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {
        data = {}
      }
      if (!res.ok) throw new Error(data.message || `Failed to load profile (HTTP ${res.status})`)
      const u = data.user || null
      if (u) {
        const role = normalizeRole(u.role)
        if (role !== 'admin') {
          navigate(dashboardPathForRole(role), { replace: true })
          return
        }
        setUser(u)
      }
    } catch (e) {
      localStorage.removeItem('mysewa_token')
      setError(e.message || 'Your session has expired.')
      navigate('/signin')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    loadMe()
    return undefined
  }, [loadMe])

  return { user, loading, error, token, reloadUser: loadMe }
}
