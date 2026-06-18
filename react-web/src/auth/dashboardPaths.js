export function normalizeRole(role) {
  return String(role ?? '').trim().toLowerCase()
}

export function dashboardPathForRole(role) {
  const r = normalizeRole(role)
  if (r === 'admin') return '/admin'
  if (r === 'landlord') return '/dashboard/landlord'
  return '/dashboard/student'
}
