'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type AdminScheduleRow } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';

export default function RecruiterResultsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<AdminScheduleRow[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('recruiterToken') : null;
    if (!token) {
      router.replace('/recruiter/login');
      return;
    }
    api
      .recruiterMe()
      .then(() => api.recruiterGetSchedules())
      .then((r) => setSchedules(r.schedules))
      .catch(() => router.replace('/recruiter/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const results = schedules.filter(
    (s) => String(s.status ?? '').toLowerCase() === 'completed'
  );

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Permanently delete this interview result? This cannot be undone.')) return;
    setActionLoading(scheduleId);
    try {
      const { deleted } = await api.recruiterDeleteSchedule(scheduleId);
      if (deleted) {
        setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-light)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)]/20 border-t-[var(--accent)]" />
          <p className="text-sm font-medium text-[var(--surface-light-muted)]">Loading interview results…</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      title="Interview results"
      subtitle="All completed interviews"
      backHref="/recruiter"
      backLabel="Dashboard"
      theme="light"
    >
      <div className="space-y-6">
        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light)]/80 p-0 shadow-sm">
          <div className="border-b border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-6 py-4">
            <h3 className="font-semibold text-[var(--surface-light-fg)]">All interview results</h3>
            <p className="mt-0.5 text-sm font-medium text-[var(--surface-light-muted)]">
              {results.length} completed interview{results.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--surface-light-border)] bg-[var(--accent-muted)]">
                  <th className="px-6 py-4 font-semibold text-[var(--surface-light-fg)]">Candidate</th>
                  <th className="px-6 py-4 font-semibold text-[var(--surface-light-fg)]">Type</th>
                  <th className="px-6 py-4 font-semibold text-[var(--surface-light-fg)]">Scheduled at</th>
                  <th className="px-6 py-4 font-semibold text-[var(--surface-light-fg)]">Status</th>
                  <th className="min-w-[200px] px-6 py-4 font-semibold text-[var(--surface-light-fg)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-light-border)]">
                {results.map((s) => {
                  const scheduleId = s.id ?? '';
                  return (
                    <tr key={scheduleId} className="transition-colors hover:bg-[var(--accent-muted)]/60">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-[var(--surface-light-fg)]">
                            {s.candidate_name || s.candidate_email}
                          </p>
                          <p className="mt-0.5 text-sm text-[var(--surface-light-muted)]">{s.candidate_email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-[var(--surface-light-fg)] capitalize">{s.role}</td>
                      <td className="px-6 py-4 font-medium text-[var(--surface-light-fg)]">
                        {new Date(s.scheduled_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-[var(--success-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--success-text)] ring-1 ring-[var(--success-border)]">
                          Completed
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDelete(scheduleId)}
                            disabled={actionLoading === scheduleId}
                            className="rounded-full border border-[var(--error-border)] bg-[var(--error-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--error-text)] transition hover:opacity-90 disabled:opacity-50"
                          >
                            {actionLoading === scheduleId ? '…' : 'Delete'}
                          </button>
                          {s.interview_id && (
                            <Link
                              href={`/report/${s.interview_id}`}
                              className="inline-flex items-center rounded-full border border-[var(--surface-light-border)] bg-[var(--accent-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:opacity-90"
                            >
                              View report
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {results.length === 0 && (
            <div className="px-6 py-12 text-center text-sm font-medium text-[var(--surface-light-muted)]">
              No completed interview results yet. When candidates finish interviews, they will
              appear here.
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
