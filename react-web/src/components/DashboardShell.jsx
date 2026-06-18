import TopNavBar from './TopNavBar'



export default function DashboardShell({ children, wide, properties, blend }) {

  let panelClass = 'dashboard-page-panel'

  if (wide) panelClass += ' dashboard-page-panel--wide'

  if (properties) panelClass += ' dashboard-page-panel--properties'

  if (blend) panelClass += ' dashboard-page-panel--blend'



  const panel = <div className={panelClass}>{children}</div>



  return (

    <main className="app-shell">

      <TopNavBar />

      <section className="content dashboard-page-content">{panel}</section>

    </main>

  )

}

