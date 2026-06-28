import TopNavBar from './TopNavBar'
import StudentAccountSiteFooter from './StudentAccountSiteFooter'

export default function DashboardShell({ children, wide, properties, blend, showFooter = true }) {
  let panelClass = 'dashboard-page-panel'

  if (wide) panelClass += ' dashboard-page-panel--wide'
  if (properties) panelClass += ' dashboard-page-panel--properties'
  if (blend) panelClass += ' dashboard-page-panel--blend'

  return (
    <main className="app-shell">
      <TopNavBar />
      <section className="content dashboard-page-content">
        <div className="site-page-with-footer">
          <div className={panelClass}>{children}</div>
          {showFooter ? <StudentAccountSiteFooter /> : null}
        </div>
      </section>
    </main>
  )
}
