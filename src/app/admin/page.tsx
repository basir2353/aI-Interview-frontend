'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type AdminOverviewResponse, type AdminScheduleRow } from '@/lib/api';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [schedules, setSchedules] = useState<AdminScheduleRow[]>([]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    Promise.all([api.adminGetOverview(), api.adminGetSchedules()])
      .then(([ov, sched]) => {
        setOverview(ov);
        setSchedules(sched.schedules);
      })
      .catch(() => router.replace('/admin/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-light)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)]/20 border-t-[var(--accent)]" />
          <p className="text-sm font-medium text-[var(--surface-light-muted)]">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const metrics = overview?.metrics ?? { recruiters: 0, candidates: 0, interviews: 0 };
  const latestSchedules = overview?.latestSchedules ?? [];
  const scheduledCount = schedules.filter((s) => ['scheduled', 'in_progress'].includes(String(s.status).toLowerCase())).length;
  const completedCount = schedules.filter((s) => String(s.status).toLowerCase() === 'completed').length;

  return (
    <AdminShell title="Dashboard" description="Overview of recruiters, candidates, interviews, and schedules.">
      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/recruiters">
            <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6 shadow-sm transition hover:border-[var(--accent)] hover:shadow-md">
              <p className="text-sm font-semibold text-[var(--surface-light-muted)]">Recruiters</p>
              <p className="mt-2 text-3xl font-bold text-[var(--surface-light-fg)]">{metrics.recruiters}</p>
              <p className="mt-1 text-xs text-[var(--surface-light-muted)]">Manage access & permissions</p>
            </Card>
          </Link>
          <Link href="/admin/candidates">
            <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6 shadow-sm transition hover:border-[var(--accent)] hover:shadow-md">
              <p className="text-sm font-semibold text-[var(--surface-light-muted)]">Candidates</p>
              <p className="mt-2 text-3xl font-bold text-[var(--surface-light-fg)]">{metrics.candidates}</p>
              <p className="mt-1 text-xs text-[var(--surface-light-muted)]">View all candidates</p>
            </Card>
          </Link>
          <Link href="/admin/schedules">
            <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6 shadow-sm transition hover:border-[var(--accent)] hover:shadow-md">
              <p className="text-sm font-semibold text-[var(--surface-light-muted)]">Interviews</p>
              <p className="mt-2 text-3xl font-bold text-[var(--surface-light-fg)]">{metrics.interviews}</p>
              <p className="mt-1 text-xs text-[var(--surface-light-muted)]">{scheduledCount} scheduled · {completedCount} completed</p>
            </Card>
          </Link>
          <Link href="/admin/applications">
            <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6 shadow-sm transition hover:border-[var(--accent)] hover:shadow-md">
              <p className="text-sm font-semibold text-[var(--surface-light-muted)]">Applications & CVs</p>
              <p className="mt-2 text-3xl font-bold text-[var(--surface-light-fg)]">—</p>
              <p className="mt-1 text-xs text-[var(--surface-light-muted)]">View all applications</p>
            </Card>
          </Link>
        </div>

        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-0 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--surface-light-border)] px-4 py-4 sm:px-6">
            <h2 className="font-semibold text-[var(--surface-light-fg)]">Latest schedules</h2>
            <Link href="/admin/schedules" className="text-sm font-semibold text-[var(--accent)] hover:underline">
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--surface-light-border)] bg-[var(--accent-muted)]">
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Candidate</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Type</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Scheduled</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Status</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Recruiter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-light-border)]">
                {latestSchedules.slice(0, 10).map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--accent-muted)]/40">
                    <td className="px-4 py-3 sm:px-6">
                      <p className="font-medium text-[var(--surface-light-fg)]">{s.candidate_name || s.candidate_email}</p>
                      <p className="text-xs text-[var(--surface-light-muted)]">{s.candidate_email}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--surface-light-fg)] sm:px-6">{s.role}</td>
                    <td className="px-4 py-3 text-[var(--surface-light-fg)] sm:px-6">{new Date(s.scheduled_at).toLocaleString()}</td>
                    <td className="px-4 py-3 sm:px-6">
                      <span className="capitalize text-[var(--surface-light-muted)]">{String(s.status).replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-4 py-3 text-[var(--surface-light-muted)] sm:px-6">{s.recruiter_name || s.recruiter_email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {latestSchedules.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-[var(--surface-light-muted)] sm:px-6">No schedules yet.</div>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
