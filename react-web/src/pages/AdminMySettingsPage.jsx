import DashboardShell from '../components/DashboardShell'
import UniversityCampusCrudSection from '../components/UniversityCampusCrudSection'
import { useAdminGuard } from '../hooks/useAdminGuard'

export default function AdminMySettingsPage() {
  const { user, loading: authLoading, error: authError, token } = useAdminGuard()

  return (
    <DashboardShell blend>
      <div className="admin-settings-page student-account-page-with-footer">
        <header className="admin-settings-header">
          <div className="admin-settings-header-copy">
            <p className="admin-settings-eyebrow">System settings</p>
            <h1 className="admin-settings-title">mySettings</h1>
            <p className="admin-settings-lead">
              Administrator tools grouped by topic. Manage university reference data and campus coordinates used across
              the platform.
            </p>
          </div>
        </header>

        {authLoading ? <div className="auth-toast">Verifying privileges…</div> : null}
        {authError ? <div className="auth-toast auth-toast-error">{authError}</div> : null}

        {!authLoading && !authError && user && token ? (
          <>
            <section className="admin-settings-section" aria-labelledby="admin-settings-about-heading">
              <h2 id="admin-settings-about-heading" className="admin-settings-section-title">
                About this page
              </h2>
              <p className="admin-settings-section-lead">
                Distance hints on landlord listings use the official coordinates you maintain here. Keep codes stable
                (for example UMT, UniSZA) so historical data stays meaningful.
              </p>
            </section>

            <section className="admin-settings-section admin-settings-section--accent" aria-labelledby="admin-uni-section-heading">
              <h2 id="admin-uni-section-heading" className="admin-settings-section-title">
                University locations
              </h2>
              <p className="admin-settings-section-lead">
                Interactive map of all pinned campuses, with a sortable list and full create / read / update / delete
                workflow underneath.
              </p>
              <UniversityCampusCrudSection token={token} />
            </section>
          </>
        ) : null}
      </div>
    </DashboardShell>
  )
}
