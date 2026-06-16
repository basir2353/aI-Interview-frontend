'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminShell } from '@/components/layout/AdminShell';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';

/**
 * Super-admin documentation for the live interview UI. Candidate layout state is stored on the
 * candidate device (localStorage); a future API can persist org-wide defaults server-side.
 */
export default function AdminInterviewLayoutPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    api
      .adminMe()
      .then((me) => {
        if (!me.isSuperAdmin) {
          router.replace('/admin');
          return;
        }
        setAllowed(true);
      })
      .catch(() => router.replace('/admin/login'));
  }, [router]);

  if (allowed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-light)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)]/20 border-t-[var(--accent)]" />
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <AdminShell
      title="Interview screen (UI)"
      description="How the candidate interview room works and how to scale layout configuration."
    >
      <div className="space-y-6 max-w-3xl">
        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--surface-light-fg)]">Live analysis</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--surface-light-muted)]">
            The candidate camera feed runs in the browser. MediaPipe Face Landmarker and Gesture Recognizer load
            WASM models from the CDN, then estimate face presence, blendshapes (ARKit-style names), and simple
            gestures (e.g. open palm). Results are shown only to the candidate in real time; nothing is sent to your
            servers unless you add telemetry later.
          </p>
        </Card>

        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--surface-light-fg)]">Code panel toggle</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--surface-light-muted)]">
            The floating toolbar <code className="rounded bg-[var(--surface-light)] px-1">&lt;/&gt;</code> button
            opens the code editor split view when pressed, and closes it on a second press (unless a coding
            question forces the editor — recruiters still see the Code tab in the header).
          </p>
        </Card>

        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--surface-light-fg)]">Draggable AI interviewer</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--surface-light-muted)]">
            On the main (non-split) layout, the interviewer avatar can be dragged. Position is saved per interview
            ID in the browser as <code className="rounded bg-[var(--surface-light)] px-1">intervion_avatar_pos_&lt;interviewId&gt;</code>.
          </p>
        </Card>

        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--surface-light-fg)]">Scalable configuration (roadmap)</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-[var(--surface-light-muted)]">
            <li>
              <strong className="text-[var(--surface-light-fg)]">Per-organization defaults:</strong> add a{' '}
              <code className="rounded bg-[var(--surface-light)] px-1">PlatformSetting</code> (or similar) row in the
              database with JSON for default panel visibility, feature flags, and optional forced layout.
            </li>
            <li>
              <strong className="text-[var(--surface-light-fg)]">API:</strong> <code className="rounded bg-[var(--surface-light)] px-1">GET /admin/settings/interview-ui</code>{' '}
              merged with candidate localStorage so offline tweaks still work.
            </li>
            <li>
              <strong className="text-[var(--surface-light-fg)]">Super admin:</strong> env-based admin (see backend{' '}
              <code className="rounded bg-[var(--surface-light)] px-1">ADMIN_EMAIL</code>) already has full access;
              extend admin routes only for settings that must be server-authoritative.
            </li>
          </ul>
        </Card>

        <p className="text-sm">
          <Link href="/admin" className="font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]">
            ← Admin dashboard
          </Link>
        </p>
      </div>
    </AdminShell>
  );
}
