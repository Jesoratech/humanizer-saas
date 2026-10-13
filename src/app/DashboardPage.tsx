import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUsage } from '../client/api';
import type { UsageData } from '../shared/schemas';
import { APP_CONFIG } from '../shared/schemas';
import {
  PenLine,
  BarChart3,
  Settings,
  ArrowRight,
  Loader2,
  AlertCircle,
  Calendar,
  Zap,
} from 'lucide-react';
import './DashboardPage.css';

export function DashboardPage() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const usagePercent = usage
    ? Math.min((usage.requestsUsed / usage.dailyLimit) * 100, 100)
    : 0;

  const meterClass =
    usagePercent >= 100
      ? 'meter-fill-full'
      : usagePercent >= 66
        ? 'meter-fill-warn'
        : 'meter-fill-ok';

  return (
    <div className="dashboard-page">
      <div className="page-container">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-subtitle">
              Welcome back{user?.email ? `, ${user.email}` : ''}.
            </p>
          </div>
          <Link to="/editor" className="btn btn-primary">
            Open editor
            <ArrowRight size={16} />
          </Link>
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
                <Zap size={16} />
                <span>Current plan</span>
              </div>
              <div className="dashboard-plan">
                <span className="dashboard-plan-name">Free Beta</span>
                <span className="badge badge-brand">Active</span>
              </div>
              <p className="dashboard-plan-desc">
                {APP_CONFIG.betaDailyRequestsDefault} rewrites per day · Up
                to {APP_CONFIG.maxWordsDefault} words per request
              </p>
            </div>

            {/* Usage Card */}
            <div className="dashboard-card card">
              <div className="dashboard-card-header">
                <BarChart3 size={16} />
                <span>Today&apos;s usage</span>
              </div>
              {usage && (
                <>
                  <div className="dashboard-usage-number">
                    <span className="dashboard-usage-value">
                      {usage.requestsUsed}
                    </span>
                    <span className="dashboard-usage-total">
                      / {usage.dailyLimit} rewrites used
                    </span>
                  </div>
                  <div className="meter">
                    <div
                      className={`meter-fill ${meterClass}`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                  <div className="dashboard-usage-detail">
                    <span>{usage.requestsRemaining} remaining today</span>
                    <span>{usage.wordsUsed} words processed</span>
                  </div>
                </>
              )}
            </div>

            {/* Quick Actions */}
            <div className="dashboard-card card">
              <div className="dashboard-card-header">
                <PenLine size={16} />
                <span>Quick actions</span>
              </div>
              <div className="dashboard-actions">
                <Link to="/editor" className="dashboard-action-item">
                  <PenLine size={16} />
                  <span>New rewrite</span>
                  <ArrowRight size={14} />
                </Link>
                <Link to="/settings" className="dashboard-action-item">
                  <Settings size={16} />
                  <span>Settings</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Info Card */}
            <div className="dashboard-card card">
              <div className="dashboard-card-header">
                <Calendar size={16} />
                <span>Beta information</span>
              </div>
              <p className="dashboard-info-text">
                Usage resets daily at midnight UTC. During the free beta, all
                features are available within the daily limits. We'll notify
                you before any changes to pricing or limits.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
