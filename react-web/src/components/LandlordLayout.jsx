import { useState } from 'react'
import Sidebar, { LandlordMobileHeader } from './landlord/Sidebar'

export default function LandlordLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-[#2D3748]">
      <LandlordMobileHeader
        menuOpen={mobileOpen}
        onOpenMenu={() => setMobileOpen(true)}
        onCloseMenu={() => setMobileOpen(false)}
      />

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="min-h-screen pt-14 lg:ml-[260px] lg:pt-0">{children}</main>
    </div>
  )
}
