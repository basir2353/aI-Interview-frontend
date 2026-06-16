/**
 * Proxy /uploads/* to the backend in production (avatars, community images, etc.).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/backendOrigin';

export async function GET(
  req: NextRequest,
  ctx: { params: { path: string[] } | Promise<{ path: string[] }> }
) {
  const params = await Promise.resolve(ctx.params);
  const segments = Array.isArray(params.path) ? params.path : [];
  const backend = getBackendOrigin();
  const url = `${backend}/uploads/${segments.join('/')}${req.nextUrl.search}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    const buffer = await res.arrayBuffer();
    const headers = new Headers();
    const contentType = res.headers.get('content-type');
    if (contentType) headers.set('Content-Type', contentType);
    return new NextResponse(buffer, { status: res.status, headers });
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Upload proxy failed', details }, { status: 502 });
  }
}
