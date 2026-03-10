/**
 * Proxy API: forward requests from the frontend to the backend.
 * Browser calls same-origin /api/proxy/... so no ERR_CONNECTION_REFUSED to :4000.
 * If the backend is down, this returns 503 with a clear message.
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_ORIGIN = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');
const API_PREFIX = '/api/v1';
// Start/join and first LLM turn can take longer under load; keep timeout generous.
const FETCH_TIMEOUT_MS = 45000;

function getPath(params: { path?: string[] }): string[] {
  return Array.isArray(params.path) ? params.path : [];
}

export async function GET(
  req: NextRequest,
  ctx: { params: { path: string[] } | Promise<{ path: string[] }> }
) {
  const params = await Promise.resolve(ctx.params);
  const path = getPath(params);
  if (path.length === 0) {
    return NextResponse.json({ error: 'Proxy path missing' }, { status: 400 });
  }
  return proxy(req, path, { method: 'GET' });
}

export async function POST(
  req: NextRequest,
  ctx: { params: { path: string[] } | Promise<{ path: string[] }> }
) {
  const params = await Promise.resolve(ctx.params);
  const path = getPath(params);
  if (path.length === 0) {
    return NextResponse.json({ error: 'Proxy path missing' }, { status: 400 });
  }
  const body = await req.arrayBuffer();
  return proxy(req, path, { method: 'POST', body });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: { path: string[] } | Promise<{ path: string[] }> }
) {
  const params = await Promise.resolve(ctx.params);
  const path = getPath(params);
  if (path.length === 0) {
    return NextResponse.json({ error: 'Proxy path missing' }, { status: 400 });
  }
  const body = await req.arrayBuffer();
  return proxy(req, path, { method: 'PATCH', body });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: { path: string[] } | Promise<{ path: string[] }> }
) {
  const params = await Promise.resolve(ctx.params);
  const path = getPath(params);
  if (path.length === 0) {
    return NextResponse.json({ error: 'Proxy path missing' }, { status: 400 });
  }
  return proxy(req, path, { method: 'DELETE' });
}

async function proxy(
  req: NextRequest,
  pathSegments: string[],
  opts: { method: string; body?: ArrayBuffer; contentType?: string }
) {
  const path = pathSegments.join('/');
  const url = `${BACKEND_ORIGIN}${API_PREFIX}/${path}`;

  const headers: Record<string, string> = {};
  const auth = req.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;

  const incomingContentType = req.headers.get('content-type');
  if (incomingContentType) {
    headers['Content-Type'] = incomingContentType;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: opts.method,
      body: opts.body,
      headers: { ...headers },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    const buffer = await res.arrayBuffer();

    const responseHeaders = new Headers();
    if (contentType) responseHeaders.set('Content-Type', contentType);

    return new NextResponse(buffer, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    const cause =
      err instanceof Error && (err as Error & { cause?: Error }).cause;
    const code =
      cause && 'code' in cause
        ? (cause as NodeJS.ErrnoException).code
        : null;
    const shortReason =
      isAbort
        ? 'Backend request timed out'
        : code === 'ECONNREFUSED'
        ? 'Backend not running'
        : code === 'UND_ERR_SOCKET' || (cause && cause.message?.includes('closed'))
          ? 'Backend closed connection'
          : err instanceof Error
            ? err.message
            : 'Connection failed';
    // One-line log to avoid spamming the terminal with stack traces
    console.error(
      `[Proxy] ${opts.method} ${path} → ${shortReason}. Start backend: cd backend && npm run dev`
    );
    return NextResponse.json(
      {
        error: 'Backend unavailable',
        message:
          'Cannot reach the backend. Start it with: cd backend && npm run dev',
        details: process.env.NODE_ENV === 'development' ? shortReason : undefined,
      },
      { status: isAbort ? 504 : 503 }
    );
  }
}
