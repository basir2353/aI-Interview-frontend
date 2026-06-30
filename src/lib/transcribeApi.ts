import { getBackendOrigin } from '@/lib/backendOrigin';

export interface TranscribeResponse {
  transcript: string;
}

export interface TranscribeOptions {
  /** ISO 639-1 / interview code for STT (e.g. ur, ar, en). */
  language?: string;
  /** When true, backend may merge primary-language + auto-detect passes. */
  mixed?: boolean;
  /** Link transcription to interview session for audit logs. */
  interviewId?: string;
}

function filenameForBlob(blob: Blob): string {
  const type = (blob.type || '').toLowerCase();
  if (type.includes('webm')) return 'recording.webm';
  if (type.includes('ogg')) return 'recording.ogg';
  if (type.includes('mp4') || type.includes('aac') || type.includes('mpeg')) return 'recording.mp4';
  if (type.includes('wav')) return 'recording.wav';
  return 'recording.webm';
}

function transcribeUrls(): string[] {
  const urls: string[] = [];
  if (typeof window !== 'undefined') {
    const origin = getBackendOrigin();
    if (origin && !/localhost|127\.0\.0\.1/i.test(origin)) {
      urls.push(`${origin}/api/v1/transcribe`);
    }
    urls.push('/api/transcribe');
    return [...new Set(urls)];
  }
  return [`${getBackendOrigin()}/api/v1/transcribe`];
}

function parseTranscribeError(
  payload: Record<string, unknown>,
  status: number
): string {
  const base =
    typeof payload.error === 'string' && payload.error.trim()
      ? payload.error.trim()
      : status === 504
        ? 'Transcription timed out. Try a shorter answer or check your connection.'
        : status === 422
          ? 'No speech detected in recording.'
          : `Transcription failed with status ${status}`;
  const details =
    typeof payload.details === 'string' && payload.details.trim()
      ? ` (${payload.details.trim()})`
      : '';
  return `${base}${details}`;
}

async function postTranscribe(
  url: string,
  formData: FormData,
  signal: AbortSignal
): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    body: formData,
    signal,
  });
}

export async function transcribeAudio(
  file: Blob,
  filename?: string,
  options?: TranscribeOptions
): Promise<TranscribeResponse> {
  const buildFormData = () => {
    const formData = new FormData();
    formData.append('audio', file, filename || filenameForBlob(file));
    if (options?.language) formData.append('language', options.language);
    if (options?.mixed) formData.append('mixed', '1');
    if (options?.interviewId) formData.append('interviewId', options.interviewId);
    return formData;
  };

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 120000);

  const urls = transcribeUrls();
  let lastError: Error | null = null;
  let lastPayload: Record<string, unknown> = {};
  let lastStatus = 0;

  try {
    for (let i = 0; i < urls.length; i += 1) {
      const url = urls[i]!;
      try {
        const response = await postTranscribe(url, buildFormData(), controller.signal);
        const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

        if (response.ok) {
          const transcript =
            typeof payload.transcript === 'string' ? payload.transcript : '';
          return { transcript };
        }

        lastPayload = payload;
        lastStatus = response.status;
        lastError = new Error(parseTranscribeError(payload, response.status));

        const retryable = response.status >= 500 || response.status === 503 || response.status === 504;
        if (retryable && i < urls.length - 1) {
          console.warn('[transcribe] Primary STT endpoint failed, retrying via proxy', {
            url,
            status: response.status,
          });
          continue;
        }
        throw lastError;
      } catch (err) {
        const isAbort = err instanceof Error && err.name === 'AbortError';
        if (isAbort) {
          throw new Error(
            'Transcription timed out. Try a shorter answer or check your connection.'
          );
        }
        if (err instanceof Error && err.message.startsWith('Transcription')) {
          throw err;
        }
        lastError = err instanceof Error ? err : new Error(String(err));
        if (i < urls.length - 1) {
          console.warn('[transcribe] STT request failed, retrying via proxy', { url, err: lastError.message });
          continue;
        }
        throw new Error(
          /failed to fetch|network|load/i.test(lastError.message)
            ? 'Could not reach transcription service. Check your connection.'
            : lastError.message
        );
      }
    }

    throw lastError ?? new Error(parseTranscribeError(lastPayload, lastStatus || 500));
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/** Verify backend STT is reachable (dev / diagnostics). */
export async function checkTranscribeHealth(): Promise<{ ok: boolean; detail?: string }> {
  try {
    const origin = getBackendOrigin();
    const res = await fetch(`${origin}/health/stt`, { method: 'GET' });
    const body = (await res.json().catch(() => ({}))) as { status?: string; hint?: string };
    return {
      ok: res.ok && body.status !== 'error',
      detail: body.hint ?? body.status,
    };
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : 'STT health check failed',
    };
  }
}
