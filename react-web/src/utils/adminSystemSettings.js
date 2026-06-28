const LS_KEY = 'mysewa_admin_system_settings'

export const DEFAULT_ADMIN_SYSTEM_SETTINGS = {
  siteName: 'MySewa',
  currency: 'RM',
  maxFileUpload: '8MB',
  maxPropertyImages: '10',
  maintenanceMode: false,
  contractDurationMonths: '12',
}

export function readAdminSystemSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { ...DEFAULT_ADMIN_SYSTEM_SETTINGS }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_ADMIN_SYSTEM_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_ADMIN_SYSTEM_SETTINGS }
  }
}

export function writeAdminSystemSettings(settings) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(settings))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mysewa-admin-settings-updated'))
    }
  } catch {
    /* quota */
  }
}
