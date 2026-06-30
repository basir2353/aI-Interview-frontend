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
  const url = transcribeUrl();
  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7530/ingest/ee56d647-5188-40ec-8a57-6399ff156f08',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'92a442'},body:JSON.stringify({sessionId:'92a442',hypothesisId:'B',location:'transcribeApi.ts:request',message:'transcribe request start',data:{url,fileBytes:file.size,language:options?.language,mixed:options?.mixed},timestamp:Date.now()})}).catch(()=>{});
  }
  // #endregion
  try {
    response = await fetch(url, {
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
  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7530/ingest/ee56d647-5188-40ec-8a57-6399ff156f08',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'92a442'},body:JSON.stringify({sessionId:'92a442',hypothesisId:'B',location:'transcribeApi.ts:response',message:'transcribe response',data:{status:response.status,ok:response.ok,hasTranscript:typeof payload.transcript==='string',error:typeof payload.error==='string'?payload.error.slice(0,80):undefined},timestamp:Date.now()})}).catch(()=>{});
  }
  // #endregion
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
