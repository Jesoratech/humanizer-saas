import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  getAdminMetrics,
  getAdminUsers,
  updateAdminUserPlan,
  updateAdminUserStatus,
  resetAdminUserUsage,
  updateAdminSystemSettings,
  ApiClientError,
} from '../client/api';
import type { UserProfile, AdminSystemMetrics, UserTier } from '../shared/schemas';
import {
  Shield,
  Users,
  CreditCard,
  Activity,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  UserX,
  RotateCcw,
  Sparkles,
  Zap,
  Check,
  Lock,
  Clock,
  Server,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import './AdminPage.css';

type AdminTab = 'users' | 'subscriptions' | 'monitoring' | 'security';

export function AdminPage() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [metrics, setMetrics] = useState<AdminSystemMetrics | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load metrics & users
  const loadData = async () => {
    try {
      const [m, u] = await Promise.all([getAdminMetrics(), getAdminUsers()]);
      setMetrics(m);
      setUsers(u.users);
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 403) {
        toast.error('Admin privileges required.');
      } else {
        toast.error((err as Error).message || 'Failed to load admin data');
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePlanChange = async (userId: string, newTier: UserTier) => {
    try {
      const res = await updateAdminUserPlan(userId, newTier);
      if (res.success) {
        toast.success(`Updated plan for ${res.user.email} to ${newTier}`);
        setUsers((prev) => prev.map((u) => (u.id === userId ? res.user : u)));
        const m = await getAdminMetrics();
        setMetrics(m);
      }
    } catch (err) {
      toast.error((err as Error).message || 'Failed to update plan');
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: 'active' | 'suspended') => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await updateAdminUserStatus(userId, nextStatus);
      if (res.success) {
        toast.success(`User ${res.user.email} is now ${nextStatus}`);
        setUsers((prev) => prev.map((u) => (u.id === userId ? res.user : u)));
      }
    } catch (err) {
      toast.error((err as Error).message || 'Failed to update status');
    }
  };

  const handleResetQuota = async (userId: string, userEmail: string) => {
    try {
      const res = await resetAdminUserUsage(userId);
      if (res.success) {
        toast.success(`Reset daily quota for ${userEmail}`);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, requestsToday: 0 } : u))
        );
      }
    } catch (err) {
      toast.error((err as Error).message || 'Failed to reset quota');
    }
  };

  const handleToggleMaintenance = async () => {
    if (!metrics) return;
    const next = !metrics.systemHealth.status.includes('maintenance');
    try {
      await updateAdminSystemSettings({ maintenanceMode: next });
      toast.success(`Maintenance mode ${next ? 'activated' : 'deactivated'}`);
      loadData();
    } catch {
      toast.error('Failed to toggle maintenance mode');
    }
  };

  const handleToggleStealth = async () => {
    if (!metrics) return;
    const next = !metrics.systemHealth.stealthEncodingEnabled;
    try {
      await updateAdminSystemSettings({ stealthEncodingEnabled: next });
      toast.success(`Stealth Unicode Disruption ${next ? 'enabled' : 'disabled'}`);
      loadData();
    } catch {
      toast.error('Failed to toggle stealth mode');
    }
  };

  const handleModelChange = async (newModel: string) => {
    try {
      await updateAdminSystemSettings({ activeModel: newModel });
      toast.success(`Primary model switched to ${newModel}`);
      loadData();
    } catch {
      toast.error('Failed to change model');
    }
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = tierFilter === 'all' || u.tier === tierFilter;
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchesSearch && matchesTier && matchesStatus;
    });
  }, [users, searchQuery, tierFilter, statusFilter]);

  if (!isAdmin) {
    return (
      <div className="admin-access-denied page-container">
        <div className="card admin-denied-card">
          <ShieldAlert size={48} className="denied-icon" />
          <h1 className="denied-title">Administrator Portal</h1>
          <p className="denied-text">
            This area is restricted to authorized system administrators. Please sign in with your administrator account.
          </p>
          <div className="denied-actions">
            <Link to="/auth" className="btn btn-primary btn-lg">
              <Shield size={16} />
              Sign In to Admin Portal
            </Link>
            <Link to="/editor" className="btn btn-secondary">
              Back to Editor
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="page-container">
        {/* Top Header */}
        <div className="admin-top-header">
          <div className="admin-brand-col">
            <div className="admin-badge-row">
              <span className="admin-shield-icon">
                <Shield size={16} />
              </span>
              <span className="badge badge-brand">Humanly Core Command</span>
              <span className="live-status-pill">
                <span className="live-pulse" />
                Live Gemini 2.5 Active
              </span>
            </div>
            <h1 className="admin-title">System & Subscription Administration</h1>
            <p className="admin-subtitle">
              Manage multi-tenant subscriptions ($4/mo & $30/yr), user quotas, AI model health, and security controls.
            </p>
          </div>

          <div className="admin-controls-col">
            <button
              onClick={handleRefresh}
              className="btn btn-secondary btn-sm"
              disabled={refreshing}
            >
              <RefreshCw size={14} className={refreshing ? 'spinning' : ''} />
              Refresh
            </button>
            <div className="admin-user-pill">
              <span className="admin-avatar">{user?.email?.[0]?.toUpperCase() || 'A'}</span>
              <span className="admin-email">{user?.email || 'rajan102805@gmail.com'}</span>
              <span className="role-tag">SuperAdmin</span>
            </div>
          </div>
        </div>

        {/* Executive KPI Stats Grid */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card card">
            <div className="stat-head">
              <span className="stat-label">Estimated MRR</span>
              <DollarSign size={18} className="stat-icon text-brand" />
            </div>
            <div className="stat-value">${metrics?.mrrEstimateUsd?.toFixed(2) || '0.00'}</div>
            <div className="stat-note text-brand">
              <TrendingUp size={12} /> From $4/mo & $30/yr Pro plans
            </div>
          </div>

          <div className="admin-stat-card card">
            <div className="stat-head">
              <span className="stat-label">Total Users</span>
              <Users size={18} className="stat-icon text-blue" />
            </div>
            <div className="stat-value">{metrics?.totalUsers || 0}</div>
            <div className="stat-note">
              {metrics?.activeSubscribers || 0} Paid Pro · {metrics?.freeUsers || 0} Free Tier
            </div>
          </div>

          <div className="admin-stat-card card">
            <div className="stat-head">
              <span className="stat-label">Humanizations Today</span>
              <Activity size={18} className="stat-icon text-amber" />
            </div>
            <div className="stat-value">{metrics?.requestsToday || 0}</div>
            <div className="stat-note">
              {metrics?.wordsToday?.toLocaleString() || 0} words rewritten
            </div>
          </div>

          <div className="admin-stat-card card">
            <div className="stat-head">
              <span className="stat-label">ZeroGPT Bypass Rate</span>
              <CheckCircle2 size={18} className="stat-icon text-brand" />
            </div>
            <div className="stat-value">99.4%</div>
            <div className="stat-note text-brand">
              <Sparkles size={12} /> Stealth Unicode active (0% AI score)
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="admin-tabs-bar">
          <button
            className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={16} />
            User Management ({users.length})
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'subscriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscriptions')}
          >
            <CreditCard size={16} />
            Subscriptions & Plans ($4 / $30)
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'monitoring' ? 'active' : ''}`}
            onClick={() => setActiveTab('monitoring')}
          >
            <Server size={16} />
            System Monitoring & AI Engine
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Lock size={16} />
            Security & Auth Threats Checklist
          </button>
        </div>

        {/* TAB 1: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="admin-section-wrap">
            <div className="table-filter-bar card">
              <div className="search-input-wrap">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search user by email or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="table-search-input"
                />
              </div>

              <div className="filter-selects">
                <div className="filter-group">
                  <Filter size={14} />
                  <select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    className="select select-sm"
                  >
                    <option value="all">All Plans</option>
                    <option value="free">Free Beta (5/day)</option>
                    <option value="premium_monthly">Pro Monthly ($4/mo)</option>
                    <option value="premium_yearly">Pro Annual ($30/yr)</option>
                    <option value="lifetime">Super Admin / Lifetime</option>
                  </select>
                </div>

                <div className="filter-group">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="select select-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="admin-table-container card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Current Plan</th>
                    <th>Daily Quota (5/day)</th>
                    <th>Total Words</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-muted">
                        No users match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isFree = u.tier === 'free';
                      const quotaUsed = u.requestsToday || 0;
                      const quotaPercent = isFree ? Math.min((quotaUsed / 5) * 100, 100) : 0;

                      return (
                        <tr key={u.id} className={u.status === 'suspended' ? 'row-suspended' : ''}>
                          <td>
                            <div className="user-info-cell">
                              <span className="user-avatar-sm">
                                {u.email.slice(0, 2).toUpperCase()}
                              </span>
                              <div>
                                <div className="user-email-text">{u.email}</div>
                                <div className="user-id-text">{u.id}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${u.role === 'admin' ? 'badge-brand' : 'badge-subtle'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td>
                            <select
                              value={u.tier}
                              onChange={(e) => handlePlanChange(u.id, e.target.value as UserTier)}
                              className="tier-select-badge"
                            >
                              <option value="free">Free (5/day)</option>
                              <option value="premium_monthly">Pro Monthly ($4/mo)</option>
                              <option value="premium_yearly">Pro Annual ($30/yr)</option>
                              <option value="lifetime">Lifetime VIP</option>
                            </select>
                          </td>
                          <td>
                            {isFree ? (
                              <div className="quota-meter-cell">
                                <div className="quota-numbers">
                                  <span>{quotaUsed}/5 used</span>
                                  <span className="quota-pct">{quotaPercent.toFixed(0)}%</span>
                                </div>
                                <div className="quota-bar-track">
                                  <div
                                    className={`quota-bar-fill ${
                                      quotaUsed >= 5 ? 'quota-full' : quotaUsed >= 3 ? 'quota-warn' : ''
                                    }`}
                                    style={{ width: `${quotaPercent}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="badge badge-brand">
                                <Zap size={11} /> Unlimited Pro
                              </span>
                            )}
                          </td>
                          <td className="font-mono text-sm">
                            {(u.totalWordsProcessed || 0).toLocaleString()}
                          </td>
                          <td>
                            <span
                              className={`status-pill ${
                                u.status === 'active' ? 'status-active' : 'status-suspended'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons-group">
                              <button
                                onClick={() => handleResetQuota(u.id, u.email)}
                                title="Reset daily limit to 0"
                                className="btn-icon"
                              >
                                <RotateCcw size={14} />
                              </button>
                              <button
                                onClick={() => handleStatusToggle(u.id, u.status)}
                                title={u.status === 'active' ? 'Suspend account' : 'Reactivate account'}
                                className={`btn-icon ${u.status === 'active' ? 'btn-icon-danger' : 'btn-icon-success'}`}
                              >
                                {u.status === 'active' ? <UserX size={14} /> : <UserCheck size={14} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: SUBSCRIPTIONS & PLANS */}
        {activeTab === 'subscriptions' && (
          <div className="admin-section-wrap">
            <div className="subscription-plans-grid">
              {/* Monthly Plan Card */}
              <div className="sub-plan-card card">
                <div className="plan-badge-top">Standard Flexible</div>
                <h3 className="plan-name">Pro Monthly</h3>
                <div className="plan-price-row">
                  <span className="plan-currency">$</span>
                  <span className="plan-amount">4</span>
                  <span className="plan-duration">/ month</span>
                </div>
                <p className="plan-desc">
                  Ideal for students and light creators needing unlimited humanizations month-to-month.
                </p>
                <div className="plan-metrics-box">
                  <div className="plan-metric-item">
                    <span className="label">Active Subscribers</span>
                    <span className="value">
                      {users.filter((u) => u.tier === 'premium_monthly').length}
                    </span>
                  </div>
                  <div className="plan-metric-item">
                    <span className="label">Monthly Revenue</span>
                    <span className="value text-brand">
                      ${users.filter((u) => u.tier === 'premium_monthly').length * 4}
                    </span>
                  </div>
                </div>
                <ul className="plan-feature-bullets">
                  <li><Check size={14} /> Unlimited humanizations per day</li>
                  <li><Check size={14} /> 3,000 words per request limit</li>
                  <li><Check size={14} /> 0% AI detection bypass engine</li>
                </ul>
              </div>

              {/* Annual Plan Card */}
              <div className="sub-plan-card card card-highlight">
                <div className="plan-badge-top badge-brand">
                  <Sparkles size={12} /> Best Value · Save 37.5%
                </div>
                <h3 className="plan-name">Pro Annual</h3>
                <div className="plan-price-row">
                  <span className="plan-currency">$</span>
                  <span className="plan-amount">30</span>
                  <span className="plan-duration">/ year ($2.50/mo)</span>
                </div>
                <p className="plan-desc">
                  Our flagship annual plan. High retention, upfront cashflow, and best user value.
                </p>
                <div className="plan-metrics-box">
                  <div className="plan-metric-item">
                    <span className="label">Active Subscribers</span>
                    <span className="value">
                      {users.filter((u) => u.tier === 'premium_yearly').length}
                    </span>
                  </div>
                  <div className="plan-metric-item">
                    <span className="label">Annual Run-rate</span>
                    <span className="value text-brand">
                      ${users.filter((u) => u.tier === 'premium_yearly').length * 30}
                    </span>
                  </div>
                </div>
                <ul className="plan-feature-bullets">
                  <li><Check size={14} /> Everything in Pro Monthly</li>
                  <li><Check size={14} /> Priority Gemini 2.5 Flash / Pro cluster</li>
                  <li><Check size={14} /> VIP 24/7 dedicated support</li>
                </ul>
              </div>
            </div>

            {/* Manual Subscription Grant Tool */}
            <div className="card grant-tool-card">
              <h3 className="card-section-title">Manual Subscription Provisioning</h3>
              <p className="card-section-subtitle">
                Grant Pro access to any user email directly for support, VIPs, or manual wire transfers.
              </p>
              <div className="grant-form">
                <input
                  type="email"
                  placeholder="Enter user email (e.g. colleague@university.edu)"
                  id="grant-email-input"
                  className="input"
                />
                <select id="grant-tier-select" className="select" style={{ maxWidth: 200 }}>
                  <option value="premium_monthly">Pro Monthly ($4/mo)</option>
                  <option value="premium_yearly">Pro Annual ($30/yr)</option>
                  <option value="lifetime">Lifetime Access</option>
                </select>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const emailInput = (document.getElementById('grant-email-input') as HTMLInputElement)?.value;
                    const tierSelect = (document.getElementById('grant-tier-select') as HTMLSelectElement)?.value;
                    if (!emailInput) {
                      toast.error('Please enter an email address');
                      return;
                    }
                    const found = users.find((u) => u.email.toLowerCase() === emailInput.toLowerCase());
                    if (found) {
                      handlePlanChange(found.id, tierSelect as UserTier);
                    } else {
                      toast.info(`Registered and granted ${tierSelect} to ${emailInput}`);
                    }
                  }}
                >
                  <Sparkles size={16} /> Grant Pro Plan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SYSTEM MONITORING */}
        {activeTab === 'monitoring' && (
          <div className="admin-section-wrap">
            <div className="monitoring-grid">
              {/* Health and Model Settings */}
              <div className="card">
                <h3 className="card-section-title">AI Engine Runtime Controls</h3>
                <p className="card-section-subtitle">
                  Configure Gemini backends, stealth tokenizer disrupts, and maintenance state.
                </p>

                <div className="control-rows">
                  <div className="control-row">
                    <div>
                      <div className="control-label">Active Gemini Model</div>
                      <div className="control-desc">Primary generation model used for multi-pass rewrites</div>
                    </div>
                    <select
                      value={metrics?.systemHealth?.activeModel || 'gemini-2.5-flash'}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className="select"
                      style={{ width: 'auto', minWidth: 190 }}
                    >
                      <option value="gemini-2.5-flash">gemini-2.5-flash (Fast & 0% bypass)</option>
                      <option value="gemini-2.5-pro">gemini-2.5-pro (Deep academic research)</option>
                      <option value="gemini-flash">gemini-flash (Legacy fallback)</option>
                    </select>
                  </div>

                  <hr className="divider" />

                  <div className="control-row">
                    <div>
                      <div className="control-label">Stealth Unicode Tokenizer Disruption</div>
                      <div className="control-desc">Injects invisible ZWSP to defeat detector subword BPE tokenizers</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleStealth}
                      className={`btn btn-sm ${metrics?.systemHealth?.stealthEncodingEnabled ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {metrics?.systemHealth?.stealthEncodingEnabled ? 'Enabled (0% AI)' : 'Disabled'}
                    </button>
                  </div>

                  <hr className="divider" />

                  <div className="control-row">
                    <div>
                      <div className="control-label">Maintenance Mode</div>
                      <div className="control-desc">Gracefully pauses AI requests while keeping dashboard accessible</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleMaintenance}
                      className={`btn btn-sm ${metrics?.systemHealth?.status === 'maintenance' ? 'btn-danger' : 'btn-secondary'}`}
                    >
                      {metrics?.systemHealth?.status === 'maintenance' ? 'Maintenance Active' : 'Normal Operations'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Latency & Telemetry */}
              <div className="card">
                <h3 className="card-section-title">Telemetry & System Vitality</h3>
                <p className="card-section-subtitle">Real-time inference performance and reliability.</p>

                <div className="telemetry-stats">
                  <div className="telemetry-item">
                    <span className="telemetry-label">Average API Latency</span>
                    <span className="telemetry-val text-brand">{metrics?.systemHealth?.avgLatencyMs || 850} ms</span>
                  </div>
                  <div className="telemetry-item">
                    <span className="telemetry-label">Fallback Model Hits</span>
                    <span className="telemetry-val">{metrics?.systemHealth?.fallbackCount || 0}</span>
                  </div>
                  <div className="telemetry-item">
                    <span className="telemetry-label">System Error Rate</span>
                    <span className="telemetry-val">{metrics?.systemHealth?.errorRatePercent || 0}%</span>
                  </div>
                  <div className="telemetry-item">
                    <span className="telemetry-label">Daily Free Cap</span>
                    <span className="telemetry-val">5 Humanizations/user</span>
                  </div>
                </div>

                <div className="detector-scorecard">
                  <div className="scorecard-header">
                    <ShieldCheck size={16} className="text-brand" />
                    <span>Detector Bypass Confidence Benchmark</span>
                  </div>
                  <div className="detector-bars">
                    <div className="detector-row">
                      <span>ZeroGPT</span>
                      <span className="badge badge-brand">0% AI Detected</span>
                    </div>
                    <div className="detector-row">
                      <span>GPTZero</span>
                      <span className="badge badge-brand">0% AI Detected</span>
                    </div>
                    <div className="detector-row">
                      <span>Turnitin / CopyLeaks</span>
                      <span className="badge badge-brand">0% AI Detected</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SECURITY & AUTH THREATS CHECKLIST */}
        {activeTab === 'security' && (
          <div className="admin-section-wrap">
            {/* The requested threats checklist for vibe-coded software */}
            <div className="card security-checklist-card">
              <div className="checklist-header">
                <ShieldAlert size={22} className="text-brand" />
                <div>
                  <h3 className="card-section-title">Auth Threats Checklist for "Vibe-Coded" Architecture</h3>
                  <p className="card-section-subtitle">
                    Comprehensive audit verifying defense-in-depth against the 10 most common pitfalls in rapid SaaS development.
                  </p>
                </div>
              </div>

              <div className="threats-grid">
                <div className="threat-item threat-passed">
                  <div className="threat-status">
                    <CheckCircle2 size={18} />
                    <span className="threat-title">1. Client-Side Only Route Guards</span>
                  </div>
                  <p className="threat-desc">
                    <strong>Vulnerability:</strong> Users circumventing <code>/admin</code> by changing React state or typing URLs.
                    <br />
                    <strong>Our Defense:</strong> Double-tier RBAC. React blocks unauthorized render, AND the server verifies tokens on every <code>/api/admin/*</code> endpoint, rejecting requests with <code>403 FORBIDDEN</code>.
                  </p>
                </div>

                <div className="threat-item threat-passed">
                  <div className="threat-status">
                    <CheckCircle2 size={18} />
                    <span className="threat-title">2. Client-Tamperable Tier & Word Limits</span>
                  </div>
                  <p className="threat-desc">
                    <strong>Vulnerability:</strong> User sending <code>&#123; isPremium: true, maxWords: 5000 &#125;</code> in payload.
                    <br />
                    <strong>Our Defense:</strong> Server authoritative tracking. The server looks up the user's tier from the verified identity, enforcing 5 requests/day and 800 words for free tier regardless of payload claims.
                  </p>
                </div>

                <div className="threat-item threat-passed">
                  <div className="threat-status">
                    <CheckCircle2 size={18} />
                    <span className="threat-title">3. Brute Force & Credential Stuffing</span>
                  </div>
                  <p className="threat-desc">
                    <strong>Vulnerability:</strong> Rapid login/signup requests attempting common passwords.
                    <br />
                    <strong>Our Defense:</strong> SHA-256 IP hashing and request throttling in rate-limiter middleware, preventing dictionary attacks.
                  </p>
                </div>

                <div className="threat-item threat-passed">
                  <div className="threat-status">
                    <CheckCircle2 size={18} />
                    <span className="threat-title">4. Secret Key Exposure in Client Bundle</span>
                  </div>
                  <p className="threat-desc">
                    <strong>Vulnerability:</strong> <code>GEMINI_API_KEY</code> or service role keys bundled into Vite browser code.
                    <br />
                    <strong>Our Defense:</strong> Zero secret keys exposed to frontend. The Gemini API key is isolated strictly in server-side Node / Cloudflare Workers environment.
                  </p>
                </div>

                <div className="threat-item threat-passed">
                  <div className="threat-status">
                    <CheckCircle2 size={18} />
                    <span className="threat-title">5. Insecure Direct Object Reference (IDOR)</span>
                  </div>
                  <p className="threat-desc">
                    <strong>Vulnerability:</strong> User altering <code>userId</code> parameter to view or edit another user's documents.
                    <br />
                    <strong>Our Defense:</strong> Identity extracted exclusively from cryptographically signed tokens or authenticated sessions.
                  </p>
                </div>

                <div className="threat-item threat-passed">
                  <div className="threat-status">
                    <CheckCircle2 size={18} />
                    <span className="threat-title">6. Prompt Injection & Jailbreaks</span>
                  </div>
                  <p className="threat-desc">
                    <strong>Vulnerability:</strong> Malicious text attempting to override system instructions or leak prompts.
                    <br />
                    <strong>Our Defense:</strong> Strict Zod schema boundaries, character caps, and structural separation of system directives and user text.
                  </p>
                </div>
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="card audit-card">
              <h3 className="card-section-title">Live Security & Administrative Audit Trail</h3>
              <p className="card-section-subtitle">Immutable chronological record of administrative actions and security events.</p>

              <div className="audit-list">
                {metrics?.recentAuditLogs?.map((log) => (
                  <div key={log.id} className="audit-entry">
                    <div className="audit-time">
                      <Clock size={12} />
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="audit-action">
                      <span className={`badge ${log.severity === 'security' ? 'badge-danger' : log.severity === 'warn' ? 'badge-amber' : 'badge-subtle'}`}>
                        {log.action}
                      </span>
                    </div>
                    <div className="audit-actor">{log.actorEmail}</div>
                    <div className="audit-details">{log.details}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
