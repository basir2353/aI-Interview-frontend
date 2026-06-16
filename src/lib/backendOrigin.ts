/**
 * Backend origin for API, WebSocket, and static uploads.
 * Prefer env vars; fall back to known production URLs on Vercel.
 */
const PRODUCTION_BACKEND = 'https://ai-interview-backend-production-e046.up.railway.app';
const LOCAL_BACKEND = 'http://localhost:4000';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function stripApiSuffix(url: string): string {
  return stripTrailingSlash(url).replace(/\/api\/v1$/, '');
}

export function getBackendOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_WS_URL ||
    process.env.BACKEND_URL;

  if (fromEnv) return stripApiSuffix(fromEnv);

  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return PRODUCTION_BACKEND;
  }

  return LOCAL_BACKEND;
}
