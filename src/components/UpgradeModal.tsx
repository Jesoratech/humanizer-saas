import { useState } from 'react';
import { PRICING_PLANS } from '../shared/schemas';
import { useAuth } from '../hooks/useAuth';
import {
  Sparkles,
  Check,
  X,
  ShieldCheck,
  Lock,
  ArrowRight,
  Loader2,
  Crown,
} from 'lucide-react';
import { toast } from 'sonner';
import './UpgradeModal.css';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

export function UpgradeModal({ isOpen, onClose, reason }: UpgradeModalProps) {
  const { upgradePlan, isPremium } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [upgrading, setUpgrading] = useState(false);

  if (!isOpen) return null;

  const currentPlan = billingCycle === 'yearly' ? PRICING_PLANS.yearly : PRICING_PLANS.monthly;

  const handleUpgrade = async () => {
    setUpgrading(true);
    const planId = billingCycle === 'yearly' ? 'premium_yearly' : 'premium_monthly';
    try {
      const ok = await upgradePlan(planId);
      if (ok) {
        toast.success(
          `🎉 Welcome to Humanly Pro! You now have unlimited daily humanizations and 3,000 words per request.`
        );
        onClose();
      }
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="upgrade-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="upgrade-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Glow backdrop aura */}
        <div className="upgrade-aura" />

        <button className="upgrade-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="upgrade-header">
          <div className="upgrade-icon-wrap">
            <Crown size={22} className="crown-icon" />
          </div>
          <span className="badge badge-brand upgrade-pill">
            <Sparkles size={12} />
            Humanly Pro
          </span>
          <h2 className="upgrade-title">
            {reason || 'Unlock Unlimited 0% AI Humanization'}
          </h2>
          <p className="upgrade-subtitle">
            Free plan includes 5 rewrites per day. Upgrade to Pro for unlimited rewrites, 3,000 words per request, and zero AI detection.
          </p>
        </div>

        {/* Billing cycle switch */}
        <div className="upgrade-toggle-wrap">
          <div className="upgrade-toggle">
            <button
              type="button"
              className={`toggle-option ${billingCycle === 'monthly' ? 'active' : ''}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly ($4/mo)
            </button>
            <button
              type="button"
              className={`toggle-option ${billingCycle === 'yearly' ? 'active' : ''}`}
              onClick={() => setBillingCycle('yearly')}
            >
              Annual ($30/yr)
              <span className="save-chip">Save 37%</span>
            </button>
          </div>
        </div>

        {/* Pricing display */}
        <div className="upgrade-price-box">
          <div className="price-amount-row">
            <span className="price-currency">$</span>
            <span className="price-number">
              {billingCycle === 'yearly' ? '30' : '4'}
            </span>
            <span className="price-period">
              {billingCycle === 'yearly' ? '/ year ($2.50/mo)' : '/ month'}
            </span>
          </div>
          <p className="price-guarantee">
            <ShieldCheck size={14} /> 7-day money-back guarantee · Cancel anytime with 1 click
          </p>
        </div>

        {/* Features checklist */}
        <ul className="upgrade-features-list">
          {currentPlan.features.map((feat, idx) => (
            <li key={idx} className="upgrade-feature-item">
              <span className="feature-check">
                <Check size={14} strokeWidth={2.5} />
              </span>
              <span className="feature-text">{feat}</span>
            </li>
          ))}
        </ul>

        {/* Action Button */}
        <div className="upgrade-actions">
          <button
            type="button"
            className="btn btn-primary btn-lg upgrade-cta-btn"
            onClick={handleUpgrade}
            disabled={upgrading || isPremium}
          >
            {upgrading ? (
              <>
                <Loader2 size={18} className="spinning" />
                <span>Activating Pro Access...</span>
              </>
            ) : isPremium ? (
              <>
                <Check size={18} />
                <span>You Already Have Pro Active!</span>
              </>
            ) : (
              <>
                <span>Upgrade to Pro — Instant Access</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
          <div className="upgrade-security-note">
            <Lock size={12} />
            <span>Bank-grade 256-bit encryption · Secure payment simulation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
