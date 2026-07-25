'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CandidateShell } from '@/components/layout/CandidateShell';
import { CandidateApplicationCard } from '@/components/candidate/CandidateApplicationCard';
import { api, type CandidateDashboardApplication } from '@/lib/api';

export default function CandidateApplicationsPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applications, setApplications] = useState<CandidateDashboardApplication[]>([]);

  useEffect(() => {
    if (search.get('submitted') === '1') {
      toast.success('Application submitted! Check your email and track status here.');
    }
  }, [search]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('candidateToken') : null;
    if (!token) {
      router.replace('/candidate/login?next=/candidate/applications');
      return;
    }
    api
      .candidateGetDashboard()
      .then((res) => setApplications(res.applications))
      .catch((e) => {
        localStorage.removeItem('candidateToken');
        localStorage.removeItem('candidateName');
        localStorage.removeItem('candidateEmail');
        setError(e instanceof Error ? e.message : 'Failed to load applications');
        router.replace('/candidate/login?next=/candidate/applications');
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <CandidateShell title="Applications" subtitle="Track status, interview times, and reports.">
      {loading && <p className="text-sm font-medium text-[var(--surface-light-muted)]">Loading applications…</p>}
      {error && (
        <p className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">{error}</p>
      )}

      {!loading && applications.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-6 py-14 text-center">
          <p className="font-display text-lg font-semibold text-[var(--surface-light-fg)]">No applications yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--surface-light-muted)]">
            When you apply to a role, it will show up here with interview details and reports.
          </p>
          <Link
            href="/jobs"
            className="mt-6 inline-flex rounded-xl bg-[var(--surface-light-fg)] px-5 py-2.5 text-sm font-semibold text-[var(--surface-light-card)] transition hover:opacity-90"
          >
            Browse open jobs
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {applications.map((app) => (
          <CandidateApplicationCard key={app.id} app={app} />
        ))}
      </div>
    </CandidateShell>
  );
}
