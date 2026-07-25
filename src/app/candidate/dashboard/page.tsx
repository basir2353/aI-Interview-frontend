'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CandidateShell } from '@/components/layout/CandidateShell';
import { CandidateInterviewCard } from '@/components/candidate/CandidateApplicationCard';
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

  const upcoming = data?.applications.filter((app) => app.schedule && app.schedule.status !== 'completed') ?? [];
  const recent = data?.applications.slice(0, 3) ?? [];

  return (
    <CandidateShell
      title={data ? `Welcome, ${data.profile.name || 'there'}` : 'Overview'}
      subtitle="Your interviews and applications in one place."
    >
      {loading && <p className="text-sm font-medium text-[var(--surface-light-muted)]">Loading…</p>}
      {error && (
        <p className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">{error}</p>
      )}

      {data && (
        <div className="space-y-10">
          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 className="font-display text-lg font-semibold text-[var(--surface-light-fg)]">Upcoming interviews</h2>
              <Link href="/candidate/applications" className="text-sm font-medium text-[var(--accent)] hover:underline">
                All applications
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-6 py-10 text-center">
                <p className="text-sm text-[var(--surface-light-muted)]">No interviews scheduled yet.</p>
                <Link
                  href="/jobs"
                  className="mt-4 inline-flex rounded-xl bg-[var(--surface-light-fg)] px-4 py-2.5 text-sm font-semibold text-[var(--surface-light-card)] transition hover:opacity-90"
                >
                  Browse open jobs
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((app) => (
                  <CandidateInterviewCard
                    key={app.id}
                    schedule={app.schedule!}
                    jobTitle={app.position.title}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 font-display text-lg font-semibold text-[var(--surface-light-fg)]">Recent applications</h2>
            {recent.length === 0 ? (
              <p className="text-sm text-[var(--surface-light-muted)]">You haven&apos;t applied to any roles yet.</p>
            ) : (
              <ul className="divide-y divide-[var(--surface-light-border)] overflow-hidden rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)]">
                {recent.map((app) => (
                  <li key={app.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                      <p className="font-medium text-[var(--surface-light-fg)]">
                        {app.position.title}
                        {app.position.companyName ? (
                          <span className="font-normal text-[var(--surface-light-muted)]"> · {app.position.companyName}</span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs capitalize text-[var(--surface-light-muted)]">
                        {app.status.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <Link
                      href="/candidate/applications"
                      className="text-sm font-medium text-[var(--accent)] hover:underline"
                    >
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </CandidateShell>
  );
}
