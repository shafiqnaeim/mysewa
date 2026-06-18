/** Turn API upload paths into URLs the browser can load (dev proxies /uploads to Spring). */
export function resolveMediaUrl(path) {
  if (!path) return ''
  const raw = String(path).trim()
  if (!raw) return ''
  if (raw.startsWith('blob:') || raw.startsWith('data:') || /^https?:\/\//i.test(raw)) {
    return raw
  }
  if (raw.startsWith('/')) return raw
  return `/${raw.replace(/^\/+/, '')}`
}
