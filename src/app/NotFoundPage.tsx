import { Link } from 'react-router-dom';
import { Home, PenLine } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-16) var(--space-4)',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-4xl)',
          fontWeight: 700,
          color: 'var(--color-brand-600)',
          marginBottom: 'var(--space-2)',
        }}
      >
        404
      </span>
      <h1
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-2)',
        }}
      >
        Page Not Found
      </h1>
      <p
        style={{
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--text-base)',
          maxWidth: 420,
          marginBottom: 'var(--space-6)',
        }}
      >
        The page you are looking for does not exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Link to="/" className="btn btn-secondary">
          <Home size={16} />
          Go home
        </Link>
        <Link to="/editor" className="btn btn-primary">
          <PenLine size={16} />
          Open editor
        </Link>
      </div>
    </div>
  );
}
