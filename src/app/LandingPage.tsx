import { Link } from 'react-router-dom';
import { APP_CONFIG } from '../shared/schemas';
import {
  ArrowRight,
  PenLine,
  Shield,
  Sliders,
  Eye,
  FileText,
  Zap,
  ChevronDown,
  ChevronUp,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { UpgradeModal } from '../components/UpgradeModal';
import './LandingPage.css';

export function LandingPage() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  return (
    <div className="landing">
      <HeroSection />
      <EditorPreview />
      <HowItWorks />
      <FeaturesSection />
      <PricingSection onOpenUpgrade={() => setShowUpgradeModal(true)} />
      <FAQSection />
      <PrivacySection />
      <CTASection onOpenUpgrade={() => setShowUpgradeModal(true)} />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="Upgrade to Humanly Pro"
      />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="hero section">
      <div className="page-container hero-container">
        <div className="hero-eyebrow">
          <Sparkles size={14} />
          <span>Free beta — no credit card required</span>
        </div>
        <h1 className="hero-title">
          Write naturally.<br />
          <span className="hero-title-accent">Sound like you.</span>
        </h1>
        <p className="hero-description">
          {APP_CONFIG.description}
        </p>
        <div className="hero-actions">
          <Link to="/editor" className="btn btn-primary btn-lg">
            Open the editor
            <ArrowRight size={18} />
          </Link>
          <a href="#how-it-works" className="btn btn-secondary btn-lg">
            See how it works
          </a>
        </div>
        <p className="hero-note">
          No sign-up required to explore. Create an account to save your usage.
        </p>
      </div>
    </section>
  );
}

function EditorPreview() {
  return (
    <section className="editor-preview section-sm">
      <div className="page-container">
        <div className="preview-window">
          <div className="preview-toolbar">
            <div className="preview-dots">
              <span className="preview-dot" />
              <span className="preview-dot" />
              <span className="preview-dot" />
            </div>
            <span className="preview-toolbar-title">{APP_CONFIG.name} Editor</span>
            <div style={{ width: 48 }} />
          </div>
          <div className="preview-body">
            <div className="preview-controls">
              <div className="preview-control-group">
                <span className="preview-label">Style</span>
                <span className="preview-chip preview-chip-active">Professional</span>
                <span className="preview-chip">Academic</span>
                <span className="preview-chip">Conversational</span>
              </div>
              <div className="preview-control-group">
                <span className="preview-label">Strength</span>
                <span className="preview-chip">Light</span>
                <span className="preview-chip preview-chip-active">Balanced</span>
                <span className="preview-chip">Strong</span>
              </div>
            </div>
            <div className="preview-panels">
              <div className="preview-panel">
                <div className="preview-panel-header">
                  <span className="preview-panel-label">Original</span>
                  <span className="preview-wordcount">42 words</span>
                </div>
                <p className="preview-text preview-text-original">
                  The implementation of the new system was done in order to make sure that
                  all the processes that were previously being handled manually could be
                  automated. This was necessary because of the fact that manual processing
                  was causing a lot of errors.
                </p>
              </div>
              <div className="preview-panel">
                <div className="preview-panel-header">
                  <span className="preview-panel-label preview-panel-label-revised">Revised</span>
                  <span className="preview-wordcount">28 words</span>
                </div>
                <p className="preview-text preview-text-revised">
                  We implemented the new system to automate processes that were previously
                  handled manually. Manual processing had introduced too many errors to
                  sustain.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Paste your draft',
      description: 'Drop in any text — an email, report, essay, or blog post. Up to 800 words per request.',
      icon: FileText,
    },
    {
      number: '02',
      title: 'Choose your style',
      description: 'Select tone, audience, and editing strength. Each option produces a measurably different result.',
      icon: Sliders,
    },
    {
      number: '03',
      title: 'Review and refine',
      description: 'Compare original and revised text side by side. Copy, edit, or rewrite again until it feels right.',
      icon: Eye,
    },
  ];

  return (
    <section id="how-it-works" className="how-it-works section">
      <div className="page-container">
        <div className="section-header">
          <h2 className="section-title">How it works</h2>
          <p className="section-subtitle">
            Three steps to clearer, more natural writing.
          </p>
        </div>
        <div className="steps-grid">
          {steps.map((step) => (
            <div key={step.number} className="step-card">
              <div className="step-number">{step.number}</div>
              <div className="step-icon">
                <step.icon size={22} strokeWidth={1.5} />
              </div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: Sliders,
      title: 'Meaningful control',
      description:
        'Six writing styles, three editing strengths, five audience types. Each combination produces distinct, tested results — not just relabeled outputs.',
    },
    {
      icon: Shield,
      title: 'Meaning preservation',
      description:
        'Facts, citations, URLs, numbers, and technical terms are protected. Your arguments stay intact. Nothing is invented or fabricated.',
    },
    {
      icon: Eye,
      title: 'Side-by-side comparison',
      description:
        'See exactly what changed. Original and revised text are displayed together with word counts so you stay in control.',
    },
    {
      icon: Lock,
      title: 'Privacy-conscious',
      description:
        'Drafts are not stored by default. No text is logged. No writing samples are collected. Clear disclosure about third-party processing.',
    },
    {
      icon: Zap,
      title: 'No unnecessary changes',
      description:
        "Good writing stays good. Light edits stay light. The tool doesn't rewrite for the sake of rewriting.",
    },
    {
      icon: PenLine,
      title: 'Your voice, refined',
      description:
        'Not a generic rewriter. The editor respects your intended tone and structure while smoothing rough edges.',
    },
  ];

  return (
    <section id="features" className="features section">
      <div className="page-container">
        <div className="section-header">
          <h2 className="section-title">Built for real writing</h2>
          <p className="section-subtitle">
            Every feature exists to make your writing clearer and more natural, not to trick
            a detector.
          </p>
        </div>
        <div className="features-grid">
          {features.map((feature, i) => (
            <div key={i} className="feature-card card">
              <div className="feature-icon-wrap">
                <feature.icon size={20} strokeWidth={1.5} />
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ onOpenUpgrade }: { onOpenUpgrade: () => void }) {
  return (
    <section id="pricing" className="pricing section">
      <div className="page-container">
        <div className="section-header">
          <div className="hero-eyebrow" style={{ margin: '0 auto 12px' }}>
            <Sparkles size={14} />
            <span>Simple, Transparent Pricing</span>
          </div>
          <h2 className="section-title">Invest in writing that actually sounds like you</h2>
          <p className="section-subtitle">
            Start for free with 5 rewrites every day, or upgrade to Pro for unlimited volume and guaranteed 0% AI detection.
          </p>
        </div>

        <div className="landing-pricing-grid">
          {/* Free Tier */}
          <div className="pricing-card card">
            <div className="pricing-tier-tag">Free Starter</div>
            <h3 className="pricing-tier-title">Free Plan</h3>
            <div className="pricing-price-row">
              <span className="price-symbol">$</span>
              <span className="price-val">0</span>
              <span className="price-duration">/ forever</span>
            </div>
            <p className="pricing-summary">
              Great for trying out research-informed humanization on short essays and emails.
            </p>
            <ul className="pricing-feature-list">
              <li>✓ <strong>5 humanizations per day</strong></li>
              <li>✓ Up to 800 words per request</li>
              <li>✓ Standard writing tones & strengths</li>
              <li>✓ Side-by-side comparison view</li>
              <li>✓ Free forever, no credit card required</li>
            </ul>
            <Link to="/editor" className="btn btn-secondary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
              Start writing free
            </Link>
          </div>

          {/* Pro Monthly */}
          <div className="pricing-card card">
            <div className="pricing-tier-tag badge-brand">Most Flexible</div>
            <h3 className="pricing-tier-title">Pro Monthly</h3>
            <div className="pricing-price-row">
              <span className="price-symbol">$</span>
              <span className="price-val">4</span>
              <span className="price-duration">/ month</span>
            </div>
            <p className="pricing-summary">
              Full power for students, bloggers, and professionals with unlimited humanization.
            </p>
            <ul className="pricing-feature-list">
              <li>✓ <strong>Unlimited humanizations</strong> (no 5/day cap)</li>
              <li>✓ <strong>3,000 words</strong> per single request</li>
              <li>✓ <strong>0% AI detection guarantee</strong> (Stealth Engine)</li>
              <li>✓ High-speed Gemini 2.5 Flash / Pro processing</li>
              <li>✓ All 6 writing tones & 3 rewrite strengths</li>
              <li>✓ Cancel anytime with 1 click</li>
            </ul>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={onOpenUpgrade}
            >
              Get Pro Monthly ($4/mo)
            </button>
          </div>

          {/* Pro Annual */}
          <div className="pricing-card card pricing-card-featured">
            <div className="pricing-popular-banner">
              <Sparkles size={12} /> Save 37.5% — Most Popular
            </div>
            <div className="pricing-tier-tag badge-brand">Best Value</div>
            <h3 className="pricing-tier-title">Pro Annual</h3>
            <div className="pricing-price-row">
              <span className="price-symbol">$</span>
              <span className="price-val">30</span>
              <span className="price-duration">/ year ($2.50/mo)</span>
            </div>
            <p className="pricing-summary">
              The ultimate package for high-volume content creators and academic researchers.
            </p>
            <ul className="pricing-feature-list">
              <li>✓ <strong>Everything in Pro Monthly</strong></li>
              <li>✓ <strong>Save 37.5%</strong> over monthly billing</li>
              <li>✓ VIP Gemini 2.5 cluster priority queue</li>
              <li>✓ Custom Author Intent & Voice Presets</li>
              <li>✓ 7-day money-back satisfaction guarantee</li>
              <li>✓ Priority 24/7 technical assistance</li>
            </ul>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center', boxShadow: '0 4px 16px rgba(45, 113, 89, 0.4)' }}
              onClick={onOpenUpgrade}
            >
              Get Pro Annual ($30/yr)
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    {
      q: 'What does Humanly actually do?',
      a: `${APP_CONFIG.name} eliminates robotic AI patterns, uniform cadence, and predictable transitions while preserving 100% of your facts, arguments, citations, and intent. It makes text read like a natural human scholar or professional.`,
    },
    {
      q: 'How does it guarantee 0% AI detection on ZeroGPT and GPTZero?',
      a: 'We combine multi-pass deep structural rewriting with extreme burstiness variance and our proprietary Stealth Unicode Tokenizer Disruption engine. This breaks the predictable n-gram tokenization used by AI detectors, yielding 0% AI scores.',
    },
    {
      q: 'What are the free limits?',
      a: 'Every user receives 5 free humanizations per day with a limit of 800 words per request. Daily limits reset at midnight UTC.',
    },
    {
      q: 'How much does Pro cost?',
      a: 'Pro is just $4 per month (billed monthly) or $30 per year (just $2.50/month, saving 37.5%). Both plans unlock unlimited humanizations, up to 3,000 words per request, and 0% AI detection guarantee.',
    },
    {
      q: 'Will it alter my citations or technical numbers?',
      a: 'No. Our pipeline extracts and protects citations, URLs, numbers, formulas, and technical terminology so your factual integrity remains 100% intact.',
    },
  ];

  return (
    <section id="faq" className="faq section">
      <div className="page-container page-container-narrow">
        <div className="section-header">
          <h2 className="section-title">Frequently asked questions</h2>
        </div>
        <div className="faq-list">
          {faqs.map((faq, i) => (
            <FAQItem key={i} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`faq-item ${open ? 'faq-item-open' : ''}`}>
      <button
        className="faq-question"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{question}</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && <p className="faq-answer">{answer}</p>}
    </div>
  );
}

function PrivacySection() {
  return (
    <section className="privacy-section section-sm">
      <div className="page-container page-container-narrow">
        <div className="privacy-card card-subtle">
          <Lock size={20} className="privacy-icon" />
          <h3 className="privacy-title">Your privacy matters</h3>
          <p className="privacy-text">
            We don't store your drafts. We don't log your text. We don't use your writing
            for model training. Your text is processed by a third-party AI service — we
            explain exactly how in our{' '}
            <Link to="/privacy">privacy policy</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}

function CTASection({ onOpenUpgrade }: { onOpenUpgrade?: () => void }) {
  return (
    <section className="cta section">
      <div className="page-container page-container-narrow" style={{ textAlign: 'center' }}>
        <h2 className="cta-title">Ready to write with 100% human authenticity?</h2>
        <p className="cta-description">
          Open the editor now with 5 free daily rewrites, or unlock unlimited humanization for just $4/month.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/editor" className="btn btn-primary btn-lg">
            Open the editor
            <ArrowRight size={18} />
          </Link>
          {onOpenUpgrade && (
            <button type="button" className="btn btn-secondary btn-lg" onClick={onOpenUpgrade}>
              <Sparkles size={16} /> Upgrade to Pro ($4/mo)
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
