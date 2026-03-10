'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type AdminApplicationRow } from '@/lib/api';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';

export default function AdminApplicationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<AdminApplicationRow[]>([]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    api
      .adminGetApplications()
      .then((r) => setApplications(r.applications))
      .catch(() => router.replace('/admin/login'))
      .finally(() => setLoading(false));
  }, [router]);

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
    <AdminShell title="Applications & CVs" description="All job applications across recruiters. View CVs and status.">
      <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-0 shadow-sm">
        <div className="border-b border-[var(--surface-light-border)] px-4 py-4 sm:px-6">
          <h3 className="font-semibold text-[var(--surface-light-fg)]">All applications</h3>
          <p className="mt-0.5 text-sm text-[var(--surface-light-muted)]">{applications.length} total · CVs and cover letters</p>
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--surface-light-border)] bg-[var(--accent-muted)]">
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Candidate</th>
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Job</th>
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Recruiter</th>
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Status</th>
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">CV</th>
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Applied</th>
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
                    <span className="capitalize text-[var(--surface-light-fg)]">{app.status.replace(/_/g, ' ')}</span>
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
