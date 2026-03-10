'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type AdminScheduleRow } from '@/lib/api';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';

export default function AdminSchedulesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<AdminScheduleRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = () =>
    api.adminGetSchedules(statusFilter || undefined).then((r) => setSchedules(r.schedules));

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    load()
      .catch(() => router.replace('/admin/login'))
      .finally(() => setLoading(false));
  }, [router, statusFilter]);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this scheduled interview?')) return;
    setActionLoading(id);
    try {
      await api.adminUpdateSchedule(id, { status: 'cancelled' });
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this schedule?')) return;
    setActionLoading(id);
    try {
      await api.adminDeleteSchedule(id);
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-light)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)]/20 border-t-[var(--accent)]" />
          <p className="text-sm font-medium text-[var(--surface-light-muted)]">Loading schedules…</p>
        </div>
      </div>
    );
  }

  return (
    <AdminShell title="Schedules" description="All scheduled interviews. Copy link, update status, or cancel.">
      <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-0 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--surface-light-border)] px-4 py-4 sm:px-6">
          <div>
            <h3 className="font-semibold text-[var(--surface-light-fg)]">All schedules</h3>
            <p className="mt-0.5 text-sm text-[var(--surface-light-muted)]">{schedules.length} total</p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-2 text-sm text-[var(--surface-light-fg)]"
          >
            <option value="">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--surface-light-border)] bg-[var(--accent-muted)]">
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Candidate</th>
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Type</th>
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Scheduled at</th>
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Status</th>
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--surface-light-border)]">
              {schedules.map((s) => {
                const row = s as AdminScheduleRow & { joinUrl?: string };
                return (
                  <tr key={s.id} className="hover:bg-[var(--accent-muted)]/40">
                    <td className="px-4 py-3 sm:px-6 sm:py-4">
                      <p className="font-medium text-[var(--surface-light-fg)]">{s.candidate_name || s.candidate_email}</p>
                      <p className="text-xs text-[var(--surface-light-muted)]">{s.candidate_email}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--surface-light-fg)] sm:px-6 sm:py-4">{s.role}</td>
                    <td className="px-4 py-3 text-[var(--surface-light-fg)] sm:px-6 sm:py-4">{new Date(s.scheduled_at).toLocaleString()}</td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4">
                      <span className="capitalize text-[var(--surface-light-muted)]">{String(s.status).replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4">
                      <div className="flex flex-wrap gap-2">
                        {row.joinUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(row.joinUrl!);
                            }}
                            className="rounded-full border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-1.5 text-xs font-semibold text-[var(--surface-light-fg)] hover:bg-[var(--accent-muted)]"
                          >
                            Copy link
                          </button>
                        )}
                        {s.interview_id && (
                          <Link
                            href={`/report/${s.interview_id}`}
                            className="rounded-full border border-[var(--accent)] bg-[var(--accent-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] hover:opacity-90"
                          >
                            Report
                          </Link>
                        )}
                        {String(s.status).toLowerCase() !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => handleCancel(s.id)}
                            disabled={actionLoading === s.id}
                            className="rounded-full border border-[var(--warning-border)] bg-[var(--warning-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--warning-text)] disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id)}
                          disabled={actionLoading === s.id}
                          className="rounded-full border border-[var(--error-border)] bg-[var(--error-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--error-text)] disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {schedules.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-[var(--surface-light-muted)] sm:px-6">No schedules match the filter.</div>
        )}
      </Card>
    </AdminShell>
  );
}
