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
import './LandingPage.css';

export function LandingPage() {
  return (
    <div className="landing">
      <HeroSection />
      <EditorPreview />
      <HowItWorks />
      <FeaturesSection />
      <BetaSection />
      <FAQSection />
      <PrivacySection />
      <CTASection />
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

function BetaSection() {
  return (
    <section className="beta section">
      <div className="page-container page-container-narrow">
        <div className="beta-card card">
          <div className="beta-badge badge badge-brand">Free Beta</div>
          <h2 className="beta-title">Try it free during beta</h2>
          <p className="beta-description">
            {APP_CONFIG.name} is in early access. You get 3 rewrites per day with up to 800 words
            each — enough to try it on real writing and decide if it helps.
          </p>
          <div className="beta-limits">
            <div className="beta-limit">
              <span className="beta-limit-value">3</span>
              <span className="beta-limit-label">Daily rewrites</span>
            </div>
            <div className="beta-limit">
              <span className="beta-limit-value">800</span>
              <span className="beta-limit-label">Max words</span>
            </div>
            <div className="beta-limit">
              <span className="beta-limit-value">$0</span>
              <span className="beta-limit-label">No credit card</span>
            </div>
          </div>
          <Link to="/auth/signup" className="btn btn-primary btn-lg">
            Create free account
          </Link>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    {
      q: 'What does this tool actually do?',
      a: `${APP_CONFIG.name} improves the clarity, flow, and naturalness of your writing. It fixes awkward phrasing, reduces unnecessary repetition, and makes text read more smoothly — while preserving your meaning and facts.`,
    },
    {
      q: 'Does it guarantee my text will pass AI detectors?',
      a: 'No. This tool is not designed to defeat AI detectors. It focuses on making your writing genuinely clearer and more natural. We do not make claims about detector outcomes.',
    },
    {
      q: 'Will it change the meaning of my text?',
      a: 'The tool is designed to preserve meaning, facts, citations, URLs, numbers, and technical terms. You always see a side-by-side comparison so you can verify nothing important changed.',
    },
    {
      q: 'Is my text stored or used for training?',
      a: 'We do not store your drafts by default. We do not use your text to train models. However, your text is sent to a third-party AI service for processing. See our privacy information for full details about data handling.',
    },
    {
      q: 'What are the beta limits?',
      a: 'During the free beta, each account gets 3 rewrites per day with a maximum of 800 words per request. These limits may change as we gather usage data.',
    },
    {
      q: 'Will there be a paid plan?',
      a: 'We plan to offer paid plans with higher limits in the future. During beta, everything is free. We will provide advance notice before any pricing changes.',
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

function CTASection() {
  return (
    <section className="cta section">
      <div className="page-container page-container-narrow" style={{ textAlign: 'center' }}>
        <h2 className="cta-title">Ready to write more naturally?</h2>
        <p className="cta-description">
          Open the editor and try it on a real draft. No sign-up required to explore.
        </p>
        <Link to="/editor" className="btn btn-primary btn-lg">
          Open the editor
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}
