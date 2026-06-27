'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { AppShell } from '@/components/layout/AppShell';
import { CandidateSubnav } from '@/components/layout/CandidateSubnav';
import { CandidateApplicationCard } from '@/components/candidate/CandidateApplicationCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
    <AppShell
      title="Applied Jobs"
      subtitle="All your applications and interview progress"
      backHref="/candidate/dashboard"
      backLabel="Dashboard"
      theme="light"
      actions={
        <Button
          variant="secondary"
          size="md"
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
      <div className="space-y-6">
        <CandidateSubnav />
        {loading && <p className="text-sm text-[var(--surface-light-muted)] font-medium">Loading applied jobs…</p>}
        {error && <p className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">{error}</p>}

        {!loading && applications.length === 0 && (
          <Card className="rounded-2xl p-6">
            <p className="text-sm text-[var(--surface-light-muted)]">No applied jobs yet.</p>
            <Link href="/jobs" className="mt-3 inline-block text-sm font-semibold text-[var(--accent)] hover:underline">
              Browse open jobs
            </Link>
          </Card>
        )}

        {applications.map((app) => (
          <CandidateApplicationCard key={app.id} app={app} />
        ))}
      </div>
    </AppShell>
  );
}
