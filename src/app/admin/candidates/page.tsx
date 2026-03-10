'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type AdminCandidateRow } from '@/lib/api';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function AdminCandidatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<AdminCandidateRow[]>([]);
  const [error, setError] = useState('');
  const [editCandidate, setEditCandidate] = useState<AdminCandidateRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const load = () => api.adminGetCandidates().then((r) => setCandidates(r.candidates));

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

  const openEdit = (c: AdminCandidateRow) => {
    setEditCandidate(c);
    setEditName(c.name || '');
    setEditPassword('');
    setError('');
  };

  const closeEdit = () => {
    setEditCandidate(null);
    setEditName('');
    setEditPassword('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCandidate) return;
    if (!editName.trim() && !editPassword.trim()) return;
    if (editPassword.length > 0 && editPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setEditLoading(true);
    try {
      await api.adminUpdateCandidate(editCandidate.id, {
        name: editName.trim() || undefined,
        password: editPassword.length >= 6 ? editPassword : undefined,
      });
      closeEdit();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update candidate');
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-light)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)]/20 border-t-[var(--accent)]" />
          <p className="text-sm font-medium text-[var(--surface-light-muted)]">Loading candidates…</p>
        </div>
      </div>
    );
  }

  return (
    <AdminShell title="Candidates" description="All candidates who have applied or been scheduled. Super admin can edit name and set password.">
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">
            {error}
          </div>
        )}
        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-0 shadow-sm">
          <div className="border-b border-[var(--surface-light-border)] px-4 py-4 sm:px-6">
            <h3 className="font-semibold text-[var(--surface-light-fg)]">All candidates</h3>
            <p className="mt-0.5 text-sm text-[var(--surface-light-muted)]">{candidates.length} total. Super admin can edit name and set/reset password.</p>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--surface-light-border)] bg-[var(--accent-muted)]">
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Name</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Email</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Applications</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Created</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-light-border)]">
                {candidates.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--accent-muted)]/40">
                    <td className="px-4 py-3 font-medium text-[var(--surface-light-fg)] sm:px-6 sm:py-4">{c.name || '—'}</td>
                    <td className="px-4 py-3 text-[var(--surface-light-fg)] sm:px-6 sm:py-4">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-[var(--surface-light-fg)] sm:px-6 sm:py-4">{c.application_count}</td>
                    <td className="px-4 py-3 text-[var(--surface-light-muted)] sm:px-6 sm:py-4">{new Date(c.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="text-sm font-medium text-[var(--accent)] hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {candidates.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-[var(--surface-light-muted)] sm:px-6">No candidates yet.</div>
          )}
        </Card>
      </div>

      {editCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeEdit}>
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--surface-light-fg)]">Edit candidate</h3>
            <p className="mt-1 text-sm text-[var(--surface-light-muted)]">
              {editCandidate.email || 'No email'} — Set name and/or new password (super admin only).
            </p>
            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
                <label htmlFor="cand-name" className="mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]">
                  Name
                </label>
                <input
                  id="cand-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Candidate name"
                  className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)]"
                />
              </div>
              <div>
                <label htmlFor="cand-password" className="mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]">
                  New password (optional, min 6)
                </label>
                <input
                  id="cand-password"
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)]"
                />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={closeEdit} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={editLoading} className="flex-1">
                  {editLoading ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
