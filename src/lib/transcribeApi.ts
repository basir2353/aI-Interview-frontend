import { getBackendOrigin } from '@/lib/backendOrigin';

export interface TranscribeResponse {
  transcript: string;
}

export interface TranscribeOptions {
  /** ISO 639-1 / interview code for STT (e.g. ur, ar, en). */
  language?: string;
  /** When true, backend may merge primary-language + auto-detect passes. */
  mixed?: boolean;
}

function filenameForBlob(blob: Blob): string {
  const type = (blob.type || '').toLowerCase();
  if (type.includes('webm')) return 'recording.webm';
  if (type.includes('ogg')) return 'recording.ogg';
  if (type.includes('mp4') || type.includes('aac') || type.includes('mpeg')) return 'recording.mp4';
  if (type.includes('wav')) return 'recording.wav';
  return 'recording.webm';
}

/** Call same-origin proxy so transcription works reliably from the interview page. */
function transcribeUrl(): string {
  if (typeof window !== 'undefined') {
    return '/api/transcribe';
  }
  return `${getBackendOrigin()}/api/v1/transcribe`;
}

export async function transcribeAudio(
  file: Blob,
  filename?: string,
  options?: TranscribeOptions
): Promise<TranscribeResponse> {
  const formData = new FormData();
  formData.append('audio', file, filename || filenameForBlob(file));
  if (options?.language) {
    formData.append('language', options.language);
  }
  if (options?.mixed) {
    formData.append('mixed', '1');
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 240000);

  let response: Response;
  try {
    response = await fetch(transcribeUrl(), {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    window.clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    throw new Error(
      isAbort
        ? 'Transcription timed out. Try a shorter answer or check your connection.'
        : 'Could not reach transcription service. Check your connection.'
    );
  }
  window.clearTimeout(timeoutId);

  const payload = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) {
    const errorMessage =
      typeof payload.error === 'string' && payload.error.trim()
        ? payload.error
        : response.status === 504
          ? 'Transcription timed out. Try a shorter recording or ensure the backend and whisper.cpp are running.'
          : `Transcription failed with status ${response.status}`;
    const details =
      typeof payload.details === 'string' && payload.details.trim()
        ? ` (${payload.details})`
        : '';
    throw new Error(`${errorMessage}${details}`);
  }

  const transcript =
    typeof payload.transcript === 'string' ? payload.transcript : '';

  return { transcript };
}
