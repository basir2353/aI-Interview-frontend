import { NextRequest, NextResponse } from 'next/server';

// Allow this route to run up to 5 minutes (platform may cap lower, e.g. Vercel 60s).
export const maxDuration = 300;

const BACKEND_ORIGIN = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');
const UPSTREAM_PATH = '/api/v1/transcribe';
// Whisper (especially on CPU) can be slow; allow up to 4 minutes for long clips.
const FETCH_TIMEOUT_MS = 240000;

export async function POST(req: NextRequest) {
  const body = await req.arrayBuffer();
  const incomingContentType = req.headers.get('content-type') || '';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${BACKEND_ORIGIN}${UPSTREAM_PATH}`, {
      method: 'POST',
      body,
      headers: incomingContentType ? { 'Content-Type': incomingContentType } : undefined,
      signal: controller.signal,
    });

    const contentType = res.headers.get('content-type') || 'application/json';
    const buffer = await res.arrayBuffer();

    clearTimeout(timeoutId);
    return new NextResponse(buffer, {
      status: res.status,
      headers: { 'Content-Type': contentType },
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    const details = err instanceof Error ? err.message : String(err);
    console.error(`[api/transcribe] Upstream failed: ${details}`);
    const errorMessage = isAbort
      ? 'Transcription timed out. Try a shorter recording or ensure the backend and whisper.cpp are running.'
      : 'Backend unavailable';
    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? (isAbort ? 'Timed out' : details) : undefined,
      },
      { status: isAbort ? 504 : 503 }
    );
  }
}

