import { APP_CONFIG } from '../shared/schemas';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PrivacyPage() {
  return (
    <div className="page-container page-container-narrow" style={{ padding: 'var(--space-12) var(--space-4)' }}>
      <Link to="/" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-6)' }}>
        <ArrowLeft size={16} />
        Back to home
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <div className="feature-icon" style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)' }}>
          <Shield size={18} />
        </div>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, margin: 0 }}>Privacy Policy</h1>
      </div>
      <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-8)' }}>
        Last updated: October 2026 • Beta Version
      </p>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', lineHeight: 'var(--leading-relaxed)' }}>
        <section>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>1. Our Privacy Philosophy</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            {APP_CONFIG.name} is built with a zero-retention philosophy for user text. We do not use your submitted writing to train models, and we do not store drafts in our persistent database during this beta.
          </p>
        </section>

        <hr className="divider" />

        <section>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>2. How Your Writing Is Processed</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
            When you submit text for rewriting:
          </p>
          <ul style={{ paddingLeft: 'var(--space-5)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            <li>Your text is transmitted securely via HTTPS to our stateless API proxy.</li>
            <li>The text is forwarded directly to the Google Gemini API to produce the revised version.</li>
            <li>Once the rewrite is returned to your browser, your text is discarded from server memory.</li>
            <li>We do not write the content of your draft to any database or long-term storage logs.</li>
          </ul>
        </section>

        <hr className="divider" />

        <section>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>3. Information We Collect</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
            To enforce rate limits and prevent abuse during our free beta, we collect minimal operational metadata:
          </p>
          <ul style={{ paddingLeft: 'var(--space-5)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            <li><strong>Account details:</strong> Email address and authentication tokens via Supabase Auth when you sign up.</li>
            <li><strong>Usage metrics:</strong> Daily request count and word volume totals (e.g., "3 requests used today"). Never the text itself.</li>
            <li><strong>Anonymous IP hashes:</strong> Cryptographic hashes of client IP addresses to meter non-authenticated requests without storing raw IPs.</li>
          </ul>
        </section>

        <hr className="divider" />

        <section>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>4. Third-Party Services</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            We rely on enterprise cloud infrastructure providers including Supabase (authentication and database) and Google Cloud / Gemini API (language models). Each provider adheres to strict industry compliance and data protection standards.
          </p>
        </section>

        <hr className="divider" />

        <section>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>5. Contact Us</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            If you have questions about our data practices or wish to request data deletion, please contact us at <a href="mailto:feedback@humanly.app" style={{ color: 'var(--color-brand-600)', textDecoration: 'underline' }}>feedback@humanly.app</a>.
          </p>
        </section>
      </div>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="page-container page-container-narrow" style={{ padding: 'var(--space-12) var(--space-4)' }}>
      <Link to="/" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-6)' }}>
        <ArrowLeft size={16} />
        Back to home
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, margin: 0 }}>Terms of Service</h1>
      </div>
      <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-8)' }}>
        Last updated: October 2026 • Beta Version
      </p>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', lineHeight: 'var(--leading-relaxed)' }}>
        <section>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>1. Acceptance of Terms</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            By accessing or using {APP_CONFIG.name}, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.
          </p>
        </section>

        <hr className="divider" />

        <section>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>2. Beta Service Status</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            {APP_CONFIG.name} is currently provided as a free public beta. Features, rate limits, and service availability are subject to change without notice. The service is provided "as is" and "as available" without warranties of any kind.
          </p>
        </section>

        <hr className="divider" />

        <section>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>3. Acceptable Use Policy</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
            You agree not to use the service to submit or process:
          </p>
          <ul style={{ paddingLeft: 'var(--space-5)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            <li>Unlawful, harassing, defamatory, or harmful content.</li>
            <li>Content that infringes any intellectual property or confidentiality obligations.</li>
            <li>Malicious code, exploits, or automated abusive traffic bypassing rate limits.</li>
            <li>Sensitive personally identifiable information (PII), payment card information, or protected health data.</li>
          </ul>
        </section>

        <hr className="divider" />

        <section>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>4. Ownership and Intellectual Property</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            You retain full ownership of all original text you provide. Subject to your compliance with these terms, you own the rewritten output generated by the service for your drafts.
          </p>
        </section>

        <hr className="divider" />

        <section>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>5. Limitation of Liability</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            Under no circumstances shall {APP_CONFIG.name} or its operators be liable for indirect, incidental, or consequential damages resulting from your use of or inability to use the service.
          </p>
        </section>
      </div>
    </div>
  );
}
