import { APP_CONFIG } from '../../shared/schemas';
import { Link } from 'react-router-dom';
import './Footer.css';

const CURRENT_YEAR = new Date().getFullYear();

export function Footer() {

  return (
    <footer className="footer">
      <div className="page-container">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="footer-name">{APP_CONFIG.name}</span>
            <span className="footer-copy">
              © {CURRENT_YEAR} {APP_CONFIG.name}. All rights reserved.
            </span>
          </div>
          <nav className="footer-links" aria-label="Footer navigation">
            <Link to="/privacy" className="footer-link">Privacy Policy</Link>
            <Link to="/terms" className="footer-link">Terms of Service</Link>
            <a
              href="mailto:feedback@humanly.app"
              className="footer-link"
            >
              Contact
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
