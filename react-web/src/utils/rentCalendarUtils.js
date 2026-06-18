/** Parse `YYYY-MM-DD` as local calendar date (avoids UTC shift). */
export function parseYMDLocal(s) {
  if (!s || typeof s !== 'string') return null
  const p = s.trim().slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return dt
}

/** @returns {{ moveIn: Date, moveOut: Date, minY: number, maxY: number } | null} */
export function parseLeaseRange(preferredMoveIn, leaseEndRaw) {
  const moveIn = parseYMDLocal(preferredMoveIn)
  const moveOut = parseYMDLocal(leaseEndRaw)
  if (!moveIn || !moveOut || moveOut < moveIn) return null
  return {
    moveIn,
    moveOut,
    minY: moveIn.getFullYear(),
    maxY: moveOut.getFullYear(),
  }
}

export function monthOverlapsLease(y, month1to12, lease) {
  if (!lease) return false
  const { moveIn, moveOut } = lease
  const start = new Date(y, month1to12 - 1, 1)
  const end = new Date(y, month1to12, 0)
  return end >= moveIn && start <= moveOut
}

export function formatDateShort(d) {
  if (!d || Number.isNaN(d.getTime())) return '—'
  try {
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}
