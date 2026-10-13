import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { humanizeText, submitFeedback, ApiClientError } from '../client/api';
import {
  countWords,
  countCharacters,
  TONES,
  TONE_LABELS,
  TONE_DESCRIPTIONS,
  STRENGTHS,
  STRENGTH_LABELS,
  STRENGTH_DESCRIPTIONS,
  AUDIENCES,
  AUDIENCE_LABELS,
  APP_CONFIG,
  type Tone,
  type Strength,
  type Audience,
  type PromptVersion,
  type HumanizeResponse,
} from '../shared/schemas';
import {
  Copy,
  Check,
  RefreshCw,
  Trash2,
  ArrowRight,
  AlertCircle,
  Loader2,
  MessageSquare,
  Info,
  ToggleLeft,
  ToggleRight,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Star,
  ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import './EditorPage.css';

export function EditorPage() {
  const { user } = useAuth();

  // Input state
  const [sourceText, setSourceText] = useState('');
  const [tone, setTone] = useState<Tone>('professional');
  const [strength, setStrength] = useState<Strength>('balanced');
  const [audience, setAudience] = useState<Audience>('general');
  const [preserveStructure, setPreserveStructure] = useState(true);

  // Author Intent & Advanced Voice state
  const [showIntentDrawer, setShowIntentDrawer] = useState(false);
  const [userIntent, setUserIntent] = useState('');
  const [protectedTermsInput, setProtectedTermsInput] = useState('');
  const [promptVersion, setPromptVersion] = useState<PromptVersion>('v2');

  // Output state
  const [result, setResult] = useState<HumanizeResponse | null>(null);
  const [editedResult, setEditedResult] = useState('');

  // UI & Feedback state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const wordCount = countWords(sourceText);
  const charCount = countCharacters(sourceText);
  const maxWords = APP_CONFIG.maxWordsDefault;
  const isOverLimit = wordCount > maxWords;

  const resultText = editedResult || result?.rewrittenText || '';
  const resultWordCount = countWords(resultText);

  const canSubmit = sourceText.trim().length > 0 && !isOverLimit && !loading;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setError(null);
    setLoading(true);
    setResult(null);
    setEditedResult('');
    setFeedbackRating(null);

    abortRef.current = new AbortController();

    // Parse comma-separated protected terms
    const protectedTerms = protectedTermsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      const response = await humanizeText(
        {
          text: sourceText,
          tone,
          audience,
          strength,
          preserveStructure,
          userIntent: userIntent.trim() || undefined,
          protectedTerms: protectedTerms,
          promptVersion,
        },
        abortRef.current.signal
      );

      setResult(response);
      setEditedResult(response.rewrittenText);

      if (response.warnings.length > 0) {
        toast.warning('Rewrite complete with items to review.');
      } else {
        toast.success('Rewrite complete.');
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 429) {
          setError('Daily limit reached. Your rewrites reset at midnight UTC.');
        } else if (err.status === 401) {
          setError('Please sign in to use the editor.');
        } else if (err.status === 503 || err.status === 502) {
          setError('The writing service is temporarily unavailable. Please try again.');
        } else {
          setError(err.message);
        }
      } else if ((err as Error).name === 'AbortError') {
        // User cancelled
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [canSubmit, sourceText, tone, audience, strength, preserveStructure, userIntent, protectedTermsInput, promptVersion]);

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [resultText]);

  const handleClear = () => {
    if (sourceText.trim() && !window.confirm('Clear the editor? This cannot be undone.')) {
      return;
    }
    setSourceText('');
    setResult(null);
    setEditedResult('');
    setError(null);
    setFeedbackRating(null);
  };

  const handleFeedback = async (rating: number) => {
    setFeedbackRating(rating);
    try {
      await submitFeedback({
        rating,
        category: 'quality',
        comment: `User rated rewrite ${rating}/5 stars using prompt ${promptVersion}`,
      });
      toast.success('Thank you for your feedback!');
    } catch {
      // Ignored
    }
  };

  return (
    <div className="editor-page">
      <div className="editor-header">
        <div className="page-container">
          <div className="editor-header-inner">
            <div>
              <h1 className="editor-title">Editor</h1>
              <p className="editor-subtitle">
                Paste your text, customize your style and intent, and receive an authentic human rewrite.
              </p>
            </div>
            {!user && (
              <div className="editor-auth-prompt">
                <Info size={14} />
                <span>
                  <Link to="/auth/signin">Sign in</Link> to save your usage and receive free daily rewrites.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="editor-body page-container">
        {/* Primary Controls */}
        <div className="editor-controls">
          <div className="control-group">
            <label htmlFor="tone-select" className="label">
              Tone &amp; Voice
            </label>
            <select
              id="tone-select"
              className="select"
              value={tone}
              onChange={(e) => setTone(e.target.value as Tone)}
              disabled={loading}
            >
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {TONE_LABELS[t]}
                </option>
              ))}
            </select>
            <span className="help-text">{TONE_DESCRIPTIONS[tone]}</span>
          </div>

          <div className="control-group">
            <label className="label">Editing strength</label>
            <div className="strength-group">
              {STRENGTHS.map((s) => (
                <button
                  key={s}
                  className={`strength-btn ${strength === s ? 'strength-btn-active' : ''}`}
                  onClick={() => setStrength(s)}
                  disabled={loading}
                  title={STRENGTH_DESCRIPTIONS[s]}
                  type="button"
                >
                  {STRENGTH_LABELS[s]}
                </button>
              ))}
            </div>
            <span className="help-text">{STRENGTH_DESCRIPTIONS[strength]}</span>
          </div>

          <div className="control-group">
            <label htmlFor="audience-select" className="label">
              Audience
            </label>
            <select
              id="audience-select"
              className="select"
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience)}
              disabled={loading}
            >
              {AUDIENCES.map((a) => (
                <option key={a} value={a}>
                  {AUDIENCE_LABELS[a]}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <button
              className="preserve-toggle"
              onClick={() => setPreserveStructure(!preserveStructure)}
              disabled={loading}
              type="button"
            >
              {preserveStructure ? (
                <ToggleRight size={20} className="toggle-on" />
              ) : (
                <ToggleLeft size={20} className="toggle-off" />
              )}
              <span className="label" style={{ marginBottom: 0 }}>
                Preserve paragraphs
              </span>
            </button>
          </div>
        </div>

        {/* Expandable Voice & Intent Drawer */}
        <button
          type="button"
          className="intent-toggle-btn"
          onClick={() => setShowIntentDrawer(!showIntentDrawer)}
        >
          <SlidersHorizontal size={14} />
          <span>Author intent &amp; key terms</span>
          {showIntentDrawer ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showIntentDrawer && (
          <div className="intent-card">
            <div>
              <label htmlFor="user-intent-input" className="label">
                What do you want this passage to communicate?
              </label>
              <input
                id="user-intent-input"
                type="text"
                className="intent-input"
                placeholder="e.g. Convince senior executives without defensive language"
                value={userIntent}
                onChange={(e) => setUserIntent(e.target.value)}
                disabled={loading}
                maxLength={500}
              />
              <span className="help-text">Guides the rewrite to reflect your exact perspective.</span>
            </div>

            <div>
              <label htmlFor="protected-terms-input" className="label">
                Terms / Keywords to preserve (comma separated)
              </label>
              <input
                id="protected-terms-input"
                type="text"
                className="intent-input"
                placeholder="e.g. PostgreSQL, RLS, GDPR, Q3 2026"
                value={protectedTermsInput}
                onChange={(e) => setProtectedTermsInput(e.target.value)}
                disabled={loading}
              />
              <span className="help-text">These words will remain unaltered in the final output.</span>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--space-3)' }}>
              <div>
                <span className="label" style={{ marginBottom: 2 }}>Editing Engine Version</span>
                <span className="help-text">v2 features syntax de-robotification & cadence overhaul. v1 is the legacy baseline.</span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${promptVersion === 'v2' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPromptVersion('v2')}
                >
                  v2 (Natural Flow)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${promptVersion === 'v1' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPromptVersion('v1')}
                >
                  v1 (Baseline)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dual Panels */}
        <div className="editor-panels">
          {/* Source Panel */}
          <div className="editor-panel">
            <div className="panel-header">
              <span className="panel-label">Original Draft</span>
              <div className="panel-meta">
                <span className={`panel-wordcount ${isOverLimit ? 'panel-wordcount-over' : ''}`}>
                  {wordCount} / {maxWords} words
                </span>
                <span className="panel-charcount">{charCount} chars</span>
              </div>
            </div>
            <textarea
              className="editor-textarea"
              placeholder="Paste or type your draft text here..."
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              disabled={loading}
              aria-label="Original text"
              rows={12}
            />
            <div className="panel-footer">
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleClear}
                disabled={!sourceText.trim() || loading}
                type="button"
              >
                <Trash2 size={14} />
                Clear
              </button>
              {isOverLimit && (
                <span className="error-text">Please reduce to {maxWords} words or fewer</span>
              )}
            </div>
          </div>

          {/* Submit Action (Centered between panels) */}
          <div className="editor-submit-area">
            {loading ? (
              <button
                className="btn btn-secondary btn-lg editor-submit-btn"
                onClick={handleCancel}
                type="button"
              >
                <Loader2 size={18} className="spinning" />
                Cancel
              </button>
            ) : (
              <button
                className="btn btn-primary btn-lg editor-submit-btn"
                onClick={handleSubmit}
                disabled={!canSubmit}
                type="button"
              >
                <span>Humanize</span>
                <ArrowRight size={18} />
              </button>
            )}
          </div>

          {/* Revised Panel */}
          <div className="editor-panel">
            <div className="panel-header">
              <div className="panel-label panel-label-revised">
                <span>Revised</span>
                {result && <span className="panel-badge">Editable</span>}
              </div>
              <div className="panel-meta">
                {result && result.metadata.durationMs && (
                  <span>{(result.metadata.durationMs / 1000).toFixed(1)}s</span>
                )}
                {resultText && (
                  <span className="panel-wordcount">{resultWordCount} words</span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="editor-loading">
                <Loader2 size={24} className="spinning" />
                <span>Crafting natural human flow...</span>
              </div>
            ) : result ? (
              <textarea
                className="editor-textarea editor-textarea-result"
                value={editedResult}
                onChange={(e) => setEditedResult(e.target.value)}
                aria-label="Revised text"
                rows={12}
              />
            ) : (
              <div className="editor-empty">
                <MessageSquare size={24} strokeWidth={1.5} />
                <span>Your improved text will appear here</span>
              </div>
            )}

            {result && (
              <div className="panel-footer">
                <div className="panel-footer-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleCopy}
                    type="button"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleSubmit}
                    disabled={loading}
                    type="button"
                  >
                    <RefreshCw size={14} />
                    Rewrite again
                  </button>
                </div>

                {/* Rating widget */}
                <div className="feedback-widget">
                  <span>Quality:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${(feedbackRating || 0) >= star ? 'star-btn-active' : ''}`}
                      onClick={() => handleFeedback(star)}
                      aria-label={`Rate ${star} stars`}
                    >
                      <Star size={14} fill={(feedbackRating || 0) >= star ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Banner with Retry */}
        {error && (
          <div className="editor-error-banner" role="alert">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={handleSubmit}
              disabled={loading || !canSubmit}
            >
              Try again
            </button>
          </div>
        )}

        {/* Meaning Preservation / Structural Warning Notice */}
        {result && result.warnings.length > 0 && (
          <div className="editor-warnings-box" role="status">
            <div className="warnings-header">
              <ShieldAlert size={16} />
              <span>Editorial Notice ({result.warnings.length} items to review)</span>
            </div>
            {result.warnings.map((w, idx) => (
              <div key={idx} className="warning-item">
                <AlertCircle size={13} style={{ flexShrink: 0 }} />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
