/**
 * Standard API error from backend interview endpoints.
 */
export class ApiClientError extends Error {
  code?: string;
  details?: string;
  detailsUr?: string;
  status?: number;

  constructor(message: string) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export function parseApiErrorPayload(
  payload: Record<string, unknown>,
  fallbackStatusText: string
): ApiClientError {
  const message =
    typeof payload.error === 'string' && payload.error.trim()
      ? payload.error.trim()
      : fallbackStatusText;
  const err = new ApiClientError(message);
  if (typeof payload.code === 'string') err.code = payload.code;
  if (typeof payload.details === 'string') err.details = payload.details;
  if (typeof payload.detailsUr === 'string') err.detailsUr = payload.detailsUr;
  return err;
}

/** Pick user-facing message — Urdu detail when interview is in Urdu. */
export function interviewErrorMessage(
  err: unknown,
  interviewLang?: string
): string {
  if (err instanceof ApiClientError) {
    const useUrdu =
      interviewLang === 'ur' && typeof err.detailsUr === 'string' && err.detailsUr.trim();
    return useUrdu ? err.detailsUr!.trim() : err.message;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return 'Something went wrong. Please try again.';
}

export function isRejectedVoiceCaptureError(err: unknown): boolean {
  if (err instanceof ApiClientError) {
    return err.code === 'ECHO_DETECTED' || err.code === 'INVALID_TRANSCRIPT';
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /interviewer|echo|no clear answer|invalid transcript|no speech/i.test(msg);
}
