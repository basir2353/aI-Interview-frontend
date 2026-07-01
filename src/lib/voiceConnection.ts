/**
 * Single place for live-interview voice service URLs (STT, TTS, health).
 * Production STT goes direct to Railway first — Whisper often exceeds Vercel proxy limits.
 */
import { getBackendOrigin } from '@/lib/backendOrigin';
import { getInterviewSessionToken } from '@/lib/api';

const API_V1 = '/api/v1';

export function getBackendTranscribeUrl(): string {
  return `${getBackendOrigin()}${API_V1}/transcribe`;
}

/** Same-origin Next.js route — forwards to backend with extended server timeout. */
export function getVercelTranscribeProxyUrl(): string {
  return '/api/transcribe';
}

export function getTtsProxyUrl(): string {
  return '/api/proxy/ai/tts';
}

export function getSttHealthUrl(): string {
  return `${getBackendOrigin()}/health/stt`;
}

/**
 * POST order for browser STT uploads.
 * - Production: Railway direct (no 60s Vercel cap), then same-origin fallback.
 * - Local dev: same-origin proxy first, then direct backend.
 */
export function getTranscribePostUrls(): string[] {
  const direct = getBackendTranscribeUrl();
  const proxied = getVercelTranscribeProxyUrl();

  if (typeof window === 'undefined') {
    return [direct];
  }

  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';

  if (isLocal) {
    return [...new Set([proxied, direct])];
  }

  return [...new Set([direct, proxied])];
}

/** Optional interview session JWT — links STT audit row when auth is enabled. */
export function voiceAuthHeaders(interviewId?: string): HeadersInit {
  if (!interviewId) return {};
  const token = getInterviewSessionToken(interviewId);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function checkVoicePipelineHealth(): Promise<{
  sttOk: boolean;
  sttDetail?: string;
  backendOrigin: string;
}> {
  const backendOrigin = getBackendOrigin();
  try {
    const res = await fetch(getSttHealthUrl(), { method: 'GET', cache: 'no-store' });
    const body = (await res.json().catch(() => ({}))) as { status?: string; hint?: string };
    return {
      sttOk: res.ok && body.status !== 'error',
      sttDetail: body.hint ?? body.status,
      backendOrigin,
    };
  } catch (e) {
    return {
      sttOk: false,
      sttDetail: e instanceof Error ? e.message : 'STT health check failed',
      backendOrigin,
    };
  }
}
