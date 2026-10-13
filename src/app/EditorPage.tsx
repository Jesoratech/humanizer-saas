import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { humanizeText, ApiClientError } from '../client/api';
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

  // Output state
  const [result, setResult] = useState<HumanizeResponse | null>(null);
  const [editedResult, setEditedResult] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

    abortRef.current = new AbortController();

    try {
      const response = await humanizeText(
        {
          text: sourceText,
          tone,
          audience,
          strength,
          preserveStructure,
        },
        abortRef.current.signal
      );

      setResult(response);
      setEditedResult(response.rewrittenText);

      if (response.warnings.length > 0) {
        response.warnings.forEach((w) => toast.warning(w));
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 429) {
          setError(
            'Daily limit reached. Your rewrites reset at midnight UTC.'
          );
        } else if (err.status === 401) {
          setError('Please sign in to use the editor.');
        } else if (err.status === 503 || err.status === 502) {
          setError(
            'The writing service is temporarily unavailable. Please try again in a few minutes.'
          );
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
  }, [canSubmit, sourceText, tone, audience, strength, preserveStructure]);

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
  };

  const handleRewriteAgain = () => {
    handleSubmit();
  };

  return (
    <div className="editor-page">
      <div className="editor-header">
        <div className="page-container">
          <div className="editor-header-inner">
            <div>
              <h1 className="editor-title">Editor</h1>
              <p className="editor-subtitle">
                Paste your text, choose your style, and get a clearer version.
              </p>
            </div>
            {!user && (
              <div className="editor-auth-prompt">
                <Info size={14} />
                <span>
                  <Link to="/auth/signin">Sign in</Link> to save your usage
                  and get 3 free rewrites daily.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="editor-body page-container">
        {/* Controls */}
        <div className="editor-controls">
          <div className="control-group">
            <label htmlFor="tone-select" className="label">
              Writing style
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
                Preserve structure
              </span>
            </button>
          </div>
        </div>

        {/* Panels */}
        <div className="editor-panels">
          {/* Source Panel */}
          <div className="editor-panel">
            <div className="panel-header">
              <span className="panel-label">Original</span>
              <div className="panel-meta">
                <span
                  className={`panel-wordcount ${isOverLimit ? 'panel-wordcount-over' : ''}`}
                >
                  {wordCount} / {maxWords} words
                </span>
                <span className="panel-charcount">{charCount} chars</span>
              </div>
            </div>
            <textarea
              className="editor-textarea"
              placeholder="Paste or type your text here..."
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
                <span className="error-text">
                  Please reduce to {maxWords} words or fewer
                </span>
              )}
            </div>
          </div>

          {/* Submit button (centered between panels) */}
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
                Humanize
                <ArrowRight size={18} />
              </button>
            )}
          </div>

          {/* Result Panel */}
          <div className="editor-panel">
            <div className="panel-header">
              <span className="panel-label panel-label-revised">
                Revised
              </span>
              <div className="panel-meta">
                {resultText && (
                  <span className="panel-wordcount">
                    {resultWordCount} words
                  </span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="editor-loading">
                <Loader2 size={24} className="spinning" />
                <span>Improving your text...</span>
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
                    onClick={handleRewriteAgain}
                    disabled={loading}
                    type="button"
                  >
                    <RefreshCw size={14} />
                    Rewrite again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="editor-error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Warnings */}
        {result && result.warnings.length > 0 && (
          <div className="editor-warnings">
            {result.warnings.map((w, i) => (
              <div key={i} className="editor-warning">
                <AlertCircle size={14} />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
