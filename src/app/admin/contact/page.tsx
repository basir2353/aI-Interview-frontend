'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, RefreshCw } from 'lucide-react';
import { api, type ContactSubmissionRow } from '@/lib/api';
import { AdminShell } from '@/components/layout/AdminShell';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { DashboardLoading } from '@/components/dashboard/DashboardLoading';
import { StatusBadge, statusToVariant } from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/Button';

function sourceLabel(source: string) {
  return source === 'resend_inbound' ? 'Resend inbound' : 'Contact form';
}

function statusVariant(status: string) {
  if (status === 'new') return 'warning' as const;
  if (status === 'replied') return 'success' as const;
  if (status === 'archived') return 'neutral' as const;
  return statusToVariant(status);
}

export default function AdminContactPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [submissions, setSubmissions] = useState<ContactSubmissionRow[]>([]);
  const [selected, setSelected] = useState<ContactSubmissionRow | null>(null);

  const load = useCallback(async () => {
    const res = await api.adminGetContactSubmissions();
    setSubmissions(res.submissions);
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    load()
      .catch(() => router.replace('/admin/login'))
      .finally(() => setLoading(false));
  }, [router, load]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.adminSyncResendInbox();
      await load();
      alert(`Synced from Resend: ${res.imported} imported, ${res.skipped} skipped.`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleStatus = async (id: string, status: ContactSubmissionRow['status']) => {
    try {
      const res = await api.adminUpdateContactSubmission(id, status);
      setSubmissions((prev) => prev.map((s) => (s.id === id ? res.submission : s)));
      if (selected?.id === id) setSelected(res.submission);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed');
    }
  };

  if (loading) {
    return <DashboardLoading message="Loading contact messages…" />;
  }

  const newCount = submissions.filter((s) => s.status === 'new').length;

  return (
    <AdminShell
      title="Contact messages"
      description="Website contact form submissions and inbound emails from Resend."
      actions={
        <Button type="button" variant="secondary" onClick={() => void handleSync()} disabled={syncing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync Resend inbox'}
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-[var(--surface-light-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <Mail className="h-4 w-4" />
          {submissions.length} total
        </span>
        {newCount > 0 && (
          <StatusBadge variant="warning">{newCount} new</StatusBadge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <DashboardCard title="Inbox" noPadding>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="dash-table-head">
                  <th className="px-5 py-3 font-medium">From</th>
                  <th className="px-5 py-3 font-medium">Subject</th>
                  <th className="px-5 py-3 font-medium">Source</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-light-border)]">
                {submissions.map((s) => (
                  <tr
                    key={s.id}
                    className={`dash-table-row cursor-pointer transition-colors ${selected?.id === s.id ? 'bg-[var(--accent-muted)]/60' : ''}`}
                    onClick={() => setSelected(s)}
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-[var(--surface-light-fg)]">{s.name || s.email}</p>
                      <p className="text-xs text-[var(--surface-light-muted)]">{s.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--surface-light-fg)]">{s.subject || '—'}</td>
                    <td className="px-5 py-3.5 text-[var(--surface-light-muted)]">{sourceLabel(s.source)}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge variant={statusVariant(s.status)}>{s.status}</StatusBadge>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--surface-light-muted)]">
                      {new Date(s.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-[var(--surface-light-muted)]">
                      No contact messages yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DashboardCard>

        <DashboardCard title={selected ? 'Message details' : 'Select a message'}>
          {selected ? (
            <div className="space-y-4">
              <div className="space-y-1 text-sm">
                <p className="font-medium text-[var(--surface-light-fg)]">{selected.name || '—'}</p>
                <a href={`mailto:${selected.email}`} className="text-[var(--accent)] hover:underline">
                  {selected.email}
                </a>
                {selected.company && (
                  <p className="text-[var(--surface-light-muted)]">Company: {selected.company}</p>
                )}
                <p className="text-[var(--surface-light-muted)]">
                  {sourceLabel(selected.source)} · {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>
              {selected.subject && (
                <p className="text-sm font-semibold text-[var(--surface-light-fg)]">{selected.subject}</p>
              )}
              <div className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light)] p-4 text-sm leading-relaxed text-[var(--surface-light-fg)] whitespace-pre-wrap">
                {selected.message}
              </div>
              <div className="flex flex-wrap gap-2">
                {(['read', 'replied', 'archived'] as const).map((status) => (
                  <Button
                    key={status}
                    type="button"
                    variant={selected.status === status ? 'primary' : 'secondary'}
                    size="md"
                    onClick={() => void handleStatus(selected.id, status)}
                  >
                    Mark {status}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--surface-light-muted)]">
              Click a row to read the full message and update its status.
            </p>
          )}
        </DashboardCard>
      </div>
    </AdminShell>
  );
}
