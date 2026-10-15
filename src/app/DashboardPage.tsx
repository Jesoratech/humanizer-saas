import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUsage } from '../client/api';
import type { UsageData } from '../shared/schemas';
import { UpgradeModal } from '../components/UpgradeModal';
import {
  PenLine,
  BarChart3,
  Settings,
  ArrowRight,
  Loader2,
  AlertCircle,
  Zap,
  Sparkles,
  Crown,
  Shield,
} from 'lucide-react';
import './DashboardPage.css';

export function DashboardPage() {
  const { user, profile, isPremium, isAdmin } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const data = await getUsage();
        setUsage(data);
      } catch {
        setError('Could not load usage data.');
      } finally {
        setLoading(false);
      }
    }
    fetchUsage();
  }, []);

  const isUnlimited = isPremium || (usage?.dailyLimit || 0) >= 10000;
  const requestsUsed = usage?.requestsUsed || profile?.requestsToday || 0;
  const requestsRemaining = isUnlimited ? 999999 : Math.max(0, 5 - requestsUsed);
  const usagePercent = !isUnlimited ? Math.min((requestsUsed / 5) * 100, 100) : 0;

  const meterClass = isUnlimited
    ? 'meter-fill-ok'
    : usagePercent >= 100
      ? 'meter-fill-full'
      : usagePercent >= 66
        ? 'meter-fill-warn'
        : 'meter-fill-ok';

  return (
    <>
      <div className="dashboard-page">
        <div className="page-container">
          <div className="dashboard-header">
            <div>
              <h1 className="dashboard-title">Dashboard</h1>
              <p className="dashboard-subtitle">
                Welcome back{user?.email ? `, ${user.email}` : ''}.
              </p>
            </div>
            <div className="dashboard-header-actions">
              {!isPremium && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowUpgradeModal(true)}
                >
                  <Sparkles size={16} />
                  Upgrade to Pro ($4/mo)
                </button>
              )}
              {isAdmin && (
                <Link to="/admin" className="btn btn-secondary">
                  <Shield size={16} />
                  Admin Console
                </Link>
              )}
              <Link to="/editor" className="btn btn-primary">
                Open editor
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="dashboard-loading">
              <Loader2 size={24} className="spinning" />
              <span>Loading dashboard...</span>
            </div>
          ) : error ? (
            <div className="dashboard-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          ) : (
            <div className="dashboard-grid">
              {/* Plan Card */}
              <div className="dashboard-card card">
                <div className="dashboard-card-header">
                  {isPremium ? <Crown size={16} className="text-brand" /> : <Zap size={16} />}
                  <span>Current plan</span>
                </div>
                <div className="dashboard-plan">
                  <span className="dashboard-plan-name">
                    {profile?.tier === 'premium_yearly'
                      ? 'Pro Annual ($30/yr)'
                      : profile?.tier === 'premium_monthly'
                        ? 'Pro Monthly ($4/mo)'
                        : isPremium
                          ? 'Lifetime VIP'
                          : 'Free Plan (5/day)'}
                  </span>
                  <span className={`badge ${isPremium ? 'badge-brand' : 'badge-subtle'}`}>
                    {isPremium ? 'Active Pro' : 'Free Quota'}
                  </span>
                </div>
                <p className="dashboard-plan-desc">
                  {isUnlimited
                    ? 'Unlimited daily humanizations · Up to 3,000 words per request · 0% AI detection guarantee'
                    : '5 free rewrites per day · Up to 800 words per request'}
                </p>
                {!isPremium && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 12, width: '100%' }}
                    onClick={() => setShowUpgradeModal(true)}
                  >
                    <Sparkles size={14} /> Upgrade for Unlimited Access ($4/mo)
                  </button>
                )}
              </div>

              {/* Usage Card */}
              <div className="dashboard-card card">
                <div className="dashboard-card-header">
                  <BarChart3 size={16} />
                  <span>Today&apos;s usage</span>
                </div>
                <div className="dashboard-usage-number">
                  <span className="dashboard-usage-value">{requestsUsed}</span>
                  <span className="dashboard-usage-total">
                    {isUnlimited ? ' rewrites used (Unlimited)' : '/ 5 rewrites used today'}
                  </span>
                </div>
                <div className="meter">
                  <div
                    className={`meter-fill ${meterClass}`}
                    style={{ width: `${isUnlimited ? 100 : usagePercent}%` }}
                  />
                </div>
                <div className="dashboard-usage-detail">
                  <span>
                    {isUnlimited ? 'Unlimited remaining today' : `${requestsRemaining} remaining today`}
                  </span>
                  <span>{(usage?.wordsUsed || profile?.totalWordsProcessed || 0).toLocaleString()} words processed</span>
                </div>
              </div>

              {/* Quick Links Card */}
              <div className="dashboard-card card">
                <div className="dashboard-card-header">
                  <Settings size={16} />
                  <span>Quick actions</span>
                </div>
                <div className="dashboard-actions-list">
                  <Link to="/editor" className="dashboard-action-item">
                    <PenLine size={16} />
                    <div>
                      <span className="dashboard-action-name">Start writing</span>
                      <span className="dashboard-action-desc">
                        Open the editor to humanize text
                      </span>
                    </div>
                    <ArrowRight size={14} className="dashboard-action-arrow" />
                  </Link>
                  <Link to="/settings" className="dashboard-action-item">
                    <Settings size={16} />
                    <div>
                      <span className="dashboard-action-name">Preferences</span>
                      <span className="dashboard-action-desc">
                        Change default tone and strength
                      </span>
                    </div>
                    <ArrowRight size={14} className="dashboard-action-arrow" />
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="dashboard-action-item">
                      <Shield size={16} />
                      <div>
                        <span className="dashboard-action-name">System Administration</span>
                        <span className="dashboard-action-desc">
                          Manage subscribers, quotas, and AI engine
                        </span>
                      </div>
                      <ArrowRight size={14} className="dashboard-action-arrow" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="Upgrade from Dashboard"
      />
    </>
  );
}
