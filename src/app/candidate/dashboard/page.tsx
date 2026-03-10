'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { CandidateSubnav } from '@/components/layout/CandidateSubnav';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, type CandidateDashboardResponse } from '@/lib/api';

export default function CandidateDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<CandidateDashboardResponse | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('candidateToken') : null;
    if (!token) {
      router.replace('/candidate/login?next=/candidate/dashboard');
      return;
    }
    api
      .candidateGetDashboard()
      .then((res) => setData(res))
      .catch((e) => {
        localStorage.removeItem('candidateToken');
        localStorage.removeItem('candidateName');
        localStorage.removeItem('candidateEmail');
        setError(e instanceof Error ? e.message : 'Failed to load dashboard');
        router.replace('/candidate/login?next=/candidate/dashboard');
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <AppShell
      title="My Profile Dashboard"
      subtitle="Your details, applications, and interview progress"
      backHref="/jobs"
      backLabel="Jobs"
      theme="light"
      actions={
        <Button
          variant="secondary"
          size="md"
          className="w-full sm:w-auto"
          onClick={() => {
            localStorage.removeItem('candidateToken');
            localStorage.removeItem('candidateName');
            localStorage.removeItem('candidateEmail');
            router.replace('/candidate/login');
          }}
        >
          Logout
        </Button>
      }
    >
      <div className="space-y-4 sm:space-y-6">
        <CandidateSubnav />
        {loading && <p className="text-sm text-[var(--surface-light-muted)] font-medium">Loading dashboard…</p>}
        {error && <p className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">{error}</p>}

        {data && (
          <>
            <Card className="relative overflow-hidden rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-4 sm:rounded-3xl sm:p-7">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_220px_at_15%_-20%,rgba(91,91,214,0.15),transparent_60%)]" />
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">Candidate workspace</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--surface-light-fg)]">
                  Welcome, {data.profile.name || 'Candidate'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-[var(--surface-light-muted)]">
                  Track your applications, monitor interview scheduling, and access reports from one place.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href="/candidate/profile">
                    <Button size="md" variant="secondary">
                      View profile details
                    </Button>
                  </Link>
                  <Link href="/candidate/applications">
                    <Button size="md">View applied jobs</Button>
                  </Link>
                </div>
              </div>
            </Card>

            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3">
              <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--surface-light-muted)]">Total applications</p>
                <p className="mt-2 text-3xl font-semibold text-[var(--surface-light-fg)]">{data.applications.length}</p>
              </Card>
              <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--surface-light-muted)]">Interviews scheduled</p>
                <p className="mt-2 text-3xl font-semibold text-[var(--surface-light-fg)]">
                  {data.applications.filter((app) => Boolean(app.schedule)).length}
                </p>
              </Card>
              <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--surface-light-muted)]">Reports available</p>
                <p className="mt-2 text-3xl font-semibold text-[var(--surface-light-fg)]">
                  {data.applications.filter((app) => Boolean(app.schedule?.reportUrl)).length}
                </p>
              </Card>
            </div>

            <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[var(--surface-light-fg)]">Quick Actions</h2>
                <Link href="/jobs" className="text-sm font-medium text-[var(--accent)] hover:underline">
                  Apply to more jobs
                </Link>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/candidate/profile">
                  <Button variant="secondary" size="md">Open profile page</Button>
                </Link>
                <Link href="/candidate/applications">
                  <Button size="md">Open applied jobs page</Button>
                </Link>
              </div>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
