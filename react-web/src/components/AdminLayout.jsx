import { useState } from 'react'
import AdminSidebar, { AdminMobileHeader } from './admin/AdminSidebar'

export default function AdminLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-[#1A1A2E]">
      <AdminMobileHeader
        menuOpen={mobileOpen}
        onOpenMenu={() => setMobileOpen(true)}
        onCloseMenu={() => setMobileOpen(false)}
      />

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 sm:hidden"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <AdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="min-h-screen pt-14 sm:ml-16 sm:pt-0 lg:ml-[260px]">{children}</main>
    </div>
  )
}
