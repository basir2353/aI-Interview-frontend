'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type AdminApplicationRow, type AdminApplicationStatus } from '@/lib/api';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';

const STATUSES: AdminApplicationStatus[] = ['pending', 'interview_scheduled', 'rejected', 'accepted'];

export default function AdminApplicationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<AdminApplicationRow[]>([]);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const load = () => api.adminGetApplications().then((r) => setApplications(r.applications));

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    load()
      .catch(() => router.replace('/admin/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleStatusChange = async (id: string, status: AdminApplicationStatus) => {
    setError('');
    setActionLoadingId(id);
    try {
      await api.adminUpdateApplication(id, { status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this application permanently?')) return;
    setError('');
    setActionLoadingId(id);
    try {
      await api.adminDeleteApplication(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete application');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-light)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)]/20 border-t-[var(--accent)]" />
          <p className="text-sm font-medium text-[var(--surface-light-muted)]">Loading applications…</p>
        </div>
      </div>
    );
  }

  return (
    <AdminShell title="Applications & CVs" description="All job applications across recruiters. Update status or remove entries.">
      {error && (
        <div className="mb-4 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">
          {error}
        </div>
      )}
      <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-0 shadow-sm">
        <div className="border-b border-[var(--surface-light-border)] px-4 py-4 sm:px-6">
          <h3 className="font-semibold text-[var(--surface-light-fg)]">All applications</h3>
          <p className="mt-0.5 text-sm text-[var(--surface-light-muted)]">{applications.length} total · CVs and cover letters</p>
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--surface-light-border)] bg-[var(--accent-muted)]">
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Candidate</th>
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Job</th>
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Recruiter</th>
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Status</th>
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">CV</th>
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Applied</th>
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--surface-light-border)]">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-[var(--accent-muted)]/40">
                  <td className="px-4 py-3 sm:px-6 sm:py-4">
                    <p className="font-medium text-[var(--surface-light-fg)]">{app.candidate_name || app.candidate_email || '—'}</p>
                    <p className="text-xs text-[var(--surface-light-muted)]">{app.candidate_email}</p>
                  </td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4">
                    <p className="text-[var(--surface-light-fg)]">{app.position_title}</p>
                    <p className="text-xs text-[var(--surface-light-muted)]">{app.position_role}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--surface-light-muted)] sm:px-6 sm:py-4">{app.recruiter_name || app.recruiter_email || '—'}</td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4">
                    <select
                      value={STATUSES.includes(app.status as AdminApplicationStatus) ? app.status : 'pending'}
                      onChange={(e) => void handleStatusChange(app.id, e.target.value as AdminApplicationStatus)}
                      disabled={actionLoadingId === app.id}
                      className="rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-2 py-1.5 text-sm capitalize text-[var(--surface-light-fg)] disabled:opacity-50"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4">
                    {app.resume_url ? (
                      <a
                        href={app.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[var(--accent)] hover:underline"
                      >
                        View CV
                      </a>
                    ) : (
                      <span className="text-[var(--surface-light-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--surface-light-muted)] sm:px-6 sm:py-4">{new Date(app.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4">
                    <button
                      type="button"
                      onClick={() => void handleDelete(app.id)}
                      disabled={actionLoadingId === app.id}
                      className="rounded-full border border-[var(--error-border)] bg-[var(--error-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--error-text)] disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {applications.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-[var(--surface-light-muted)] sm:px-6">No applications yet.</div>
        )}
      </Card>
    </AdminShell>
  );
}
