export type ErrorCategory =
  | 'NONE'
  | 'RATE_LIMIT'
  | 'VALIDATION'
  | 'AUTH'
  | 'UPSTREAM_MODEL'
  | 'TIMEOUT'
  | 'EMPTY_RESPONSE'
  | 'CONFIG_ERROR'
  | 'KILL_SWITCH';

export interface DiagnosticLogEvent {
  requestId: string;
  provider: string;
  model: string;
  durationMs: number;
  inputWordCount: number;
  outputWordCount: number;
  status: 'success' | 'error' | 'validation_warning';
  statusCode: number;
  errorCategory: ErrorCategory;
  retryCount: number;
  warningsCount: number;
}

/**
 * Privacy-safe structured diagnostic logger.
 * STRICT SECURITY INVARIANT:
 * This logger MUST NEVER accept or log source text, rewritten text,
 * user emails, IP addresses, API keys, or session tokens.
 */
export function logDiagnostic(event: DiagnosticLogEvent): void {
  const sanitized = {
    timestamp: new Date().toISOString(),
    requestId: event.requestId,
    provider: event.provider,
    model: event.model,
    durationMs: Math.round(event.durationMs),
    inputWordCount: event.inputWordCount,
    outputWordCount: event.outputWordCount,
    status: event.status,
    statusCode: event.statusCode,
    errorCategory: event.errorCategory,
    retryCount: event.retryCount,
    warningsCount: event.warningsCount,
  };

  // Structured logging to console
  console.log(`[HUMANLY_DIAGNOSTIC] ${JSON.stringify(sanitized)}`);
}
