import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { APP_CONFIG } from '../../shared/schemas';
import {
  PenLine,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Settings,
  User,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import './Navbar.css';

export function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isLanding = location.pathname === '/';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setUserMenuOpen(false);
  };

  return (
    <header className={`navbar ${isLanding ? 'navbar-landing' : ''}`}>
      <div className="navbar-inner page-container">
        <Link to="/" className="navbar-brand" aria-label={`${APP_CONFIG.name} home`}>
          <div className="navbar-logo">
            <PenLine size={18} strokeWidth={2.5} />
          </div>
          <span className="navbar-name">{APP_CONFIG.name}</span>
          <span className="badge badge-brand navbar-badge">Beta</span>
        </Link>

        {/* Desktop nav */}
        <nav className="navbar-links" aria-label="Main navigation">
          {isLanding && (
            <>
              <a href="#features" className="navbar-link">Features</a>
              <a href="#how-it-works" className="navbar-link">How It Works</a>
              <a href="#faq" className="navbar-link">FAQ</a>
            </>
          )}
          {!isLanding && user && (
            <>
              <Link
                to="/editor"
                className={`navbar-link ${location.pathname === '/editor' ? 'active' : ''}`}
              >
                Editor
              </Link>
              <Link
                to="/dashboard"
                className={`navbar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
              >
                Dashboard
              </Link>
            </>
          )}
        </nav>

        <div className="navbar-actions">
          {user ? (
            <div className="navbar-user" ref={userMenuRef}>
              <button
                className="navbar-avatar"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                aria-label="Account menu"
              >
                <User size={16} />
              </button>
              {userMenuOpen && (
                <div className="navbar-dropdown" role="menu">
                  <div className="navbar-dropdown-email">
                    {user.email}
                  </div>
                  <hr className="divider" style={{ margin: '4px 0' }} />
                  <Link
                    to="/dashboard"
                    className="navbar-dropdown-item"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <LayoutDashboard size={14} />
                    Dashboard
                  </Link>
                  <Link
                    to="/settings"
                    className="navbar-dropdown-item"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings size={14} />
                    Settings
                  </Link>
                  <hr className="divider" style={{ margin: '4px 0' }} />
                  <button
                    className="navbar-dropdown-item navbar-dropdown-danger"
                    role="menuitem"
                    onClick={handleSignOut}
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/auth/signin" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
              <Link to="/editor" className="btn btn-primary btn-sm">
                Try the editor
              </Link>
            </>
          )}

          {/* Mobile toggle */}
          <button
            className="navbar-mobile-toggle btn btn-ghost btn-icon btn-sm"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="navbar-mobile">
          {isLanding && (
            <>
              <a href="#features" className="navbar-mobile-link" onClick={() => setMobileOpen(false)}>Features</a>
              <a href="#how-it-works" className="navbar-mobile-link" onClick={() => setMobileOpen(false)}>How It Works</a>
              <a href="#faq" className="navbar-mobile-link" onClick={() => setMobileOpen(false)}>FAQ</a>
            </>
          )}
          {user && (
            <>
              <Link to="/editor" className="navbar-mobile-link" onClick={() => setMobileOpen(false)}>Editor</Link>
              <Link to="/dashboard" className="navbar-mobile-link" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <Link to="/settings" className="navbar-mobile-link" onClick={() => setMobileOpen(false)}>Settings</Link>
            </>
          )}
          {!user && (
            <>
              <Link to="/auth/signin" className="navbar-mobile-link" onClick={() => setMobileOpen(false)}>Sign in</Link>
              <Link to="/editor" className="btn btn-primary" style={{ margin: '8px 16px' }} onClick={() => setMobileOpen(false)}>
                Try the editor
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
