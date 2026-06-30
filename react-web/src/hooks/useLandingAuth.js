import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function dashboardPathForRole(role) {
  const r = String(role || '').toLowerCase()
  if (r === 'admin') return '/dashboard/admin'
  if (r === 'landlord') return '/dashboard/landlord'
  if (r === 'student') return '/dashboard/student'
  return '/dashboard'
}

export function useLandingAuth() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('mysewa_token')
    if (!token) {
      setUser(null)
      setLoading(false)
      return undefined
    }
    let cancelled = false
    async function loadMe() {
      try {
        const res = await fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) {
          if (!cancelled) setUser(null)
          return
        }
        const data = await res.json()
        if (!cancelled) setUser(data.user || null)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadMe()
    return () => {
      cancelled = true
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('mysewa_token')
    setUser(null)
    navigate('/')
  }, [navigate])

  const role = String(user?.role || '').toLowerCase()
  const dashboardPath = user ? dashboardPathForRole(user.role) : '/signin'

  return {
    user,
    loading,
    logout,
    dashboardPath,
    role,
    isLoggedIn: Boolean(user),
    isAdmin: role === 'admin',
    isStudent: role === 'student',
    isLandlord: role === 'landlord',
  }
}
