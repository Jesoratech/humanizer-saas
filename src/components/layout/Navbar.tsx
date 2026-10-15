import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { APP_CONFIG } from '../../shared/schemas';
import { UpgradeModal } from '../UpgradeModal';
import {
  PenLine,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Settings,
  User,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import './Navbar.css';

export function Navbar() {
  const { user, profile, usage, signOut, isAdmin, isPremium } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
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

  const requestsUsed = usage?.requestsUsed || profile?.requestsToday || 0;
  const requestsRemaining = isPremium ? 999999 : Math.max(0, 5 - requestsUsed);

  return (
    <>
      <header className={`navbar ${isLanding ? 'navbar-landing' : ''}`}>
        <div className="navbar-inner page-container">
          <Link to="/" className="navbar-brand" aria-label={`${APP_CONFIG.name} home`}>
            <div className="navbar-logo">
              <PenLine size={18} strokeWidth={2.5} />
            </div>
            <span className="navbar-name">{APP_CONFIG.name}</span>
            {isPremium ? (
              <span className="badge badge-brand navbar-badge">
                <Sparkles size={10} /> Pro
              </span>
            ) : (
              <span className="badge badge-subtle navbar-badge">Free</span>
            )}
          </Link>

          {/* Desktop nav */}
          <nav className="navbar-links" aria-label="Main navigation">
            {isLanding && (
              <>
                <a href="#features" className="navbar-link">Features</a>
                <a href="#how-it-works" className="navbar-link">How It Works</a>
                <a href="#pricing" className="navbar-link" onClick={(e) => { e.preventDefault(); setShowUpgradeModal(true); }}>
                  Pricing ($4/mo)
                </a>
              </>
            )}
            <Link
              to="/editor"
              className={`navbar-link ${location.pathname === '/editor' ? 'active' : ''}`}
            >
              Editor
            </Link>
            {user && (
              <Link
                to="/dashboard"
                className={`navbar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
              >
                Dashboard
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className={`navbar-link navbar-admin-link ${location.pathname === '/admin' ? 'active' : ''}`}
              >
                <Shield size={14} />
                Admin
              </Link>
            )}
          </nav>

          <div className="navbar-actions">
            {/* Quota counter for free users */}
            {!isPremium && (
              <button
                type="button"
                className="quota-indicator-pill"
                onClick={() => setShowUpgradeModal(true)}
                title="Click to upgrade for unlimited humanizations"
              >
                <Zap size={13} className="quota-icon" />
                <span>
                  {requestsRemaining}/5 left today
                </span>
              </button>
            )}

            {/* Upgrade CTA button */}
            {!isPremium && (
              <button
                type="button"
                className="btn btn-primary btn-sm upgrade-nav-btn"
                onClick={() => setShowUpgradeModal(true)}
              >
                <Sparkles size={13} />
                <span>Upgrade ($4/mo)</span>
              </button>
            )}

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
                      <div className="dropdown-tier-badge">
                        {isPremium ? 'Pro Unlimited' : `${requestsRemaining} of 5 daily left`}
                      </div>
                    </div>
                    <hr className="divider" style={{ margin: '4px 0' }} />
                    <Link
                      to="/editor"
                      className="navbar-dropdown-item"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <PenLine size={14} />
                      Editor
                    </Link>
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
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="navbar-dropdown-item text-brand font-medium"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Shield size={14} />
                        Admin Dashboard
                      </Link>
                    )}
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
                <Link to="/auth" className="btn btn-ghost btn-sm">
                  Sign in
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
                <a
                  href="#pricing"
                  className="navbar-mobile-link"
                  onClick={() => { setMobileOpen(false); setShowUpgradeModal(true); }}
                >
                  Pricing ($4/mo)
                </a>
              </>
            )}
            <Link to="/editor" className="navbar-mobile-link" onClick={() => setMobileOpen(false)}>Editor</Link>
            {user && (
              <>
                <Link to="/dashboard" className="navbar-mobile-link" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                <Link to="/settings" className="navbar-mobile-link" onClick={() => setMobileOpen(false)}>Settings</Link>
              </>
            )}
            {isAdmin && (
              <Link to="/admin" className="navbar-mobile-link text-brand" onClick={() => setMobileOpen(false)}>
                Admin Dashboard
              </Link>
            )}
            {!user && (
              <Link to="/auth" className="navbar-mobile-link" onClick={() => setMobileOpen(false)}>
                Sign in
              </Link>
            )}
            {!isPremium && (
              <div style={{ padding: '8px 16px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => { setMobileOpen(false); setShowUpgradeModal(true); }}
                >
                  <Sparkles size={16} /> Upgrade to Pro ($4/mo)
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="Upgrade to Humanly Pro"
      />
    </>
  );
}
