import { Link } from 'react-router-dom'

/**
 * Shared footer for Home (landing) and student account — same markup as My Account.
 */
export default function StudentAccountSiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="student-account-page-footer" role="contentinfo">
      <div className="student-account-page-footer-wrap">
        <div className="student-account-footer-main">
          <div className="student-account-footer-brand">
            <div className="student-account-footer-logo-row">
              <span className="student-account-footer-logo-text">MySewa</span>
            </div>
            <p className="student-account-footer-tagline">
              MySewa helps students find trusted rentals near campus — search listings, manage applications, and keep
              your tenancy details in one place.
            </p>
          </div>
          <div className="student-account-footer-nav">
            <div className="student-account-footer-col">
              <h3 className="student-account-footer-col-title">Contact us</h3>
              <ul className="student-account-footer-links">
                <li>
                  <Link className="student-account-footer-link" to="/">
                    Customer support
                  </Link>
                </li>
              </ul>
            </div>
            <div className="student-account-footer-col">
              <h3 className="student-account-footer-col-title">About</h3>
              <ul className="student-account-footer-links">
                <li>
                  <Link className="student-account-footer-link" to="/">
                    About MySewa
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="student-account-footer-divider" aria-hidden="true" />
        <div className="student-account-footer-legal">
          <p className="student-account-footer-copyright">© {year} MySewa. All rights reserved.</p>
          <nav className="student-account-footer-legal-nav" aria-label="Legal" />
        </div>
      </div>
    </footer>
  )
}
