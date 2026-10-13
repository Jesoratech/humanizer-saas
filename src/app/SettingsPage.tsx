import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import {
  TONES,
  TONE_LABELS,
  STRENGTHS,
  STRENGTH_LABELS,
  type Tone,
  type Strength,
} from '../shared/schemas';
import { User, Shield, PenLine, Trash2, ExternalLink } from 'lucide-react';
import './SettingsPage.css';

export function SettingsPage() {
  const { user } = useAuth();
  const [defaultTone, setDefaultTone] = useState<Tone>('professional');
  const [defaultStrength, setDefaultStrength] = useState<Strength>('balanced');

  return (
    <div className="settings-page">
      <div className="page-container page-container-narrow">
        <h1 className="settings-title">Settings</h1>

        {/* Account */}
        <section className="settings-section">
          <div className="settings-section-header">
            <User size={16} />
            <h2>Account</h2>
          </div>
          <div className="card">
            <div className="settings-row">
              <span className="settings-label">Email</span>
              <span className="settings-value">{user?.email || 'Not signed in'}</span>
            </div>
            <hr className="divider" />
            <div className="settings-row">
              <span className="settings-label">Plan</span>
              <div className="settings-value">
                <span className="badge badge-brand">Free Beta</span>
              </div>
            </div>
            <hr className="divider" />
            <div className="settings-row">
              <span className="settings-label">Member since</span>
              <span className="settings-value">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString()
                  : '—'}
              </span>
            </div>
          </div>
        </section>

        {/* Writing Preferences */}
        <section className="settings-section">
          <div className="settings-section-header">
            <PenLine size={16} />
            <h2>Writing preferences</h2>
          </div>
          <div className="card">
            <div className="settings-row">
              <div>
                <span className="settings-label">Default tone</span>
                <span className="help-text">Applied when you open the editor</span>
              </div>
              <select
                className="select"
                value={defaultTone}
                onChange={(e) => setDefaultTone(e.target.value as Tone)}
                style={{ width: 'auto', minWidth: 160 }}
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>{TONE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <hr className="divider" />
            <div className="settings-row">
              <div>
                <span className="settings-label">Default editing strength</span>
                <span className="help-text">How much the editor changes your text</span>
              </div>
              <select
                className="select"
                value={defaultStrength}
                onChange={(e) => setDefaultStrength(e.target.value as Strength)}
                style={{ width: 'auto', minWidth: 160 }}
              >
                {STRENGTHS.map((s) => (
                  <option key={s} value={s}>{STRENGTH_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="settings-section">
          <div className="settings-section-header">
            <Shield size={16} />
            <h2>Privacy &amp; data</h2>
          </div>
          <div className="card">
            <div className="settings-row">
              <div>
                <span className="settings-label">Data handling</span>
                <span className="help-text">
                  Your text is sent to Google's Gemini API for processing. Drafts
                  are not stored by this application. See our privacy policy for
                  details about third-party data handling.
                </span>
              </div>
              <Link to="/privacy" className="btn btn-ghost btn-sm">
                <ExternalLink size={14} />
                Privacy policy
              </Link>
            </div>
            <hr className="divider" />
            <div className="settings-row">
              <div>
                <span className="settings-label">Draft history</span>
                <span className="help-text">
                  Draft history is not enabled in the current beta. Your rewrites
                  are not saved on our servers.
                </span>
              </div>
              <span className="badge badge-amber">Not available</span>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="settings-section">
          <div className="settings-section-header settings-section-danger">
            <Trash2 size={16} />
            <h2>Danger zone</h2>
          </div>
          <div className="card settings-danger-card">
            <div className="settings-row">
              <div>
                <span className="settings-label">Delete account</span>
                <span className="help-text">
                  During the beta, contact us to request account deletion. This
                  will remove all your data permanently.
                </span>
              </div>
              <a href="mailto:feedback@humanly.app" className="btn btn-danger btn-sm">
                Request deletion
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
