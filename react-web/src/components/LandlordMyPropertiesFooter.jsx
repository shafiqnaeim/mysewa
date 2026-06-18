import { Link } from 'react-router-dom'

/** Shared footer for landlord My properties flows (list + rent tracker). */
export default function LandlordMyPropertiesFooter() {
  return (
    <footer className="student-account-page-footer" role="contentinfo">
      <div className="student-account-footer-main">
        <div className="student-account-footer-brand">
          <div className="student-account-footer-logo-row">
            <span className="student-account-footer-logo-text">MySewa</span>
          </div>
          <p className="student-account-footer-tagline">
            MySewa connects landlords with students near campus — list properties, stay visible in search, and keep your
            contact details current.
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
        <p className="student-account-footer-copyright">&copy; {new Date().getFullYear()} MySewa. All rights reserved.</p>
        <nav className="student-account-footer-legal-nav" aria-label="Legal" />
      </div>
    </footer>
  )
}
