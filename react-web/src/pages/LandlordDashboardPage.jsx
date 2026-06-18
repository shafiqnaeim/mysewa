import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DashboardShell from '../components/DashboardShell'
import { useLandlordGuard } from '../hooks/useLandlordGuard'

export default function LandlordDashboardPage() {
  const navigate = useNavigate()
  const { user, loading, error } = useLandlordGuard()

  const firstName = useMemo(() => {
    const parts = String(user?.fullName || '').trim().split(/\s+/).filter(Boolean)
    return parts[0] || 'there'
  }, [user?.fullName])

  const pageReady = !loading && user

  return (
    <DashboardShell properties blend>
      <div className="my-properties-page-with-footer">
        <article className="my-properties-page landlord-dashboard-page">
          <header className="my-property-page-header" aria-labelledby="landlord-dash-title">
            <div className="my-property-page-header-main">
              <h1 id="landlord-dash-title" className="my-property-page-title">
                myDashboard
              </h1>
              <p className="my-property-page-lead">
                Hi, {firstName}. Manage what students see on Home and keep your profile up to date.
              </p>
            </div>
          </header>

          {loading ? <p className="my-property-loading">Loading your account…</p> : null}
          {!loading && error ? <div className="auth-toast auth-toast-error">Error: {error}</div> : null}

          {pageReady ? (
            <>
              <section className="my-property-list-section" aria-labelledby="landlord-listings-heading">
                <div className="my-property-list-head">
                  <h2 id="landlord-listings-heading" className="my-property-list-title">
                    Listings on Home
                  </h2>
                </div>
                <p className="landlord-dashboard-section-lead">
                  New and updated properties load on the public Home page for students to browse and search.
                </p>
                <div className="landlord-dashboard-shortcuts">
                  <button type="button" className="my-property-page-cta" onClick={() => navigate('/my-properties')}>
                    Open myProperty
                  </button>
                  <button type="button" className="my-property-page-cta" onClick={() => navigate('/')}>
                    View Home
                  </button>
                </div>
              </section>

              <section className="my-property-list-section" aria-labelledby="landlord-account-heading">
                <div className="my-property-list-head">
                  <h2 id="landlord-account-heading" className="my-property-list-title">
                    Account
                  </h2>
                </div>
                <p className="landlord-dashboard-section-lead">Profile, verification, and contact details.</p>
                <div className="landlord-dashboard-shortcuts">
                  <button type="button" className="my-property-page-cta" onClick={() => navigate('/dashboard/landlord/account')}>
                    Open myAccount
                  </button>
                </div>
              </section>
            </>
          ) : null}
        </article>

        <footer className="student-account-page-footer landlord-dashboard-footer-min" role="contentinfo">
          <div className="student-account-footer-legal">
            <p className="student-account-footer-copyright">
              &copy; {new Date().getFullYear()} MySewa. All rights reserved.
            </p>
            <Link className="student-account-footer-link" to="/">
              Home
            </Link>
          </div>
        </footer>
      </div>
    </DashboardShell>
  )
}
