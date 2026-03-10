'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type AdminRecruiterRow } from '@/lib/api';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AdminRecruitersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [recruiters, setRecruiters] = useState<AdminRecruiterRow[]>([]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [passwordEditId, setPasswordEditId] = useState<string | null>(null);
  const [passwordEditName, setPasswordEditName] = useState('');
  const [passwordEditValue, setPasswordEditValue] = useState('');
  const [passwordEditLoading, setPasswordEditLoading] = useState(false);

  const [actionsOpenId, setActionsOpenId] = useState<string | null>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const r = await api.adminGetRecruiters();
    setRecruiters(r.recruiters);
  };

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

  useEffect(() => {
    if (!actionsOpenId) return;
    const close = (e: MouseEvent) => {
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(e.target as Node)) {
        setActionsOpenId(null);
      }
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [actionsOpenId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);
    try {
      await api.adminCreateRecruiter({ name: name || undefined, email, password });
      setName('');
      setEmail('');
      setPassword('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create recruiter');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleToggleAccess = async (id: string, isActive: boolean) => {
    setError('');
    setActionLoadingId(id);
    try {
      await api.adminUpdateRecruiter(id, { isActive: !isActive });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update access');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePermissionChange = async (id: string, permissionLevel: 'full' | 'limited') => {
    setError('');
    setActionLoadingId(id);
    try {
      await api.adminUpdateRecruiter(id, { permissionLevel });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update permission');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteRecruiter = async (id: string) => {
    if (!confirm('Delete this recruiter account?')) return;
    setError('');
    setActionLoadingId(id);
    try {
      await api.adminDeleteRecruiter(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete recruiter');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openEditPassword = (r: AdminRecruiterRow) => {
    setActionsOpenId(null);
    setPasswordEditId(r.id);
    setPasswordEditName(r.name || r.email);
    setPasswordEditValue('');
  };

  const closeEditPassword = () => {
    setPasswordEditId(null);
    setPasswordEditName('');
    setPasswordEditValue('');
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordEditId || !passwordEditValue.trim() || passwordEditValue.length < 6) return;
    setError('');
    setPasswordEditLoading(true);
    try {
      await api.adminUpdateRecruiter(passwordEditId, { password: passwordEditValue });
      closeEditPassword();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update password');
    } finally {
      setPasswordEditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-light)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)]/20 border-t-[var(--accent)]" />
          <p className="text-sm font-medium text-[var(--surface-light-muted)]">Loading recruiters…</p>
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      title="Recruiter management"
      description="Create recruiter accounts and manage portal access."
    >
      <div className="space-y-6 sm:space-y-8">
        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-[var(--surface-light-fg)]">Add recruiter</h2>
          <p className="mt-1 text-sm font-medium text-[var(--surface-light-muted)]">
            Each recruiter can sign in and generate their own interview links.
          </p>
          <form onSubmit={handleCreate} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-[var(--surface-light-fg)] placeholder-[var(--surface-light-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="recruiter@example.com"
              required
              className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-[var(--surface-light-fg)] placeholder-[var(--surface-light-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6)"
              required
              minLength={6}
              className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-[var(--surface-light-fg)] placeholder-[var(--surface-light-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <Button type="submit" disabled={submitLoading} className="justify-center disabled:opacity-50 sm:col-span-2 lg:col-span-1">
              {submitLoading ? 'Creating…' : 'Create recruiter'}
            </Button>
          </form>
          {error && <p className="mt-3 rounded-lg bg-[var(--error-bg)] px-4 py-2 text-sm font-medium text-[var(--error-text)]">{error}</p>}
        </Card>

        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-0 shadow-sm">
          <div className="border-b border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-4 sm:px-6">
            <h3 className="font-semibold text-[var(--surface-light-fg)]">Recruiters</h3>
            <p className="mt-0.5 text-sm font-medium text-[var(--surface-light-muted)]">{recruiters.length} account(s)</p>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--surface-light-border)] bg-[var(--accent-muted)]">
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Name</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Email</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Access</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Responsibility</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Created</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Schedules</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-light-border)]">
                {recruiters.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--accent-muted)]/60">
                    <td className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">{r.name || '—'}</td>
                    <td className="px-4 py-3 font-medium text-[var(--surface-light-fg)] sm:px-6 sm:py-4">{r.email}</td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          r.is_active ? 'bg-[var(--success-bg)] text-[var(--success-text)] ring-1 ring-[var(--success-border)]' : 'bg-[var(--error-bg)] text-[var(--error-text)] ring-1 ring-[var(--error-border)]'
                        }`}
                      >
                        {r.is_active ? 'Granted' : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4">
                      <select
                        value={r.permission_level ?? 'full'}
                        onChange={(e) => handlePermissionChange(r.id, e.target.value as 'full' | 'limited')}
                        disabled={actionLoadingId === r.id}
                        className="rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-2 py-1.5 text-xs font-medium text-[var(--surface-light-fg)] disabled:opacity-50"
                      >
                        <option value="full">Full (create jobs & direct links)</option>
                        <option value="limited">Limited (schedule from applications only)</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--surface-light-fg)] sm:px-6 sm:py-4">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium text-[var(--surface-light-fg)] sm:px-6 sm:py-4">{r.schedule_count}</td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4">
                      <div
                        className="relative"
                        ref={actionsOpenId === r.id ? actionsDropdownRef : undefined}
                      >
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setActionsOpenId(actionsOpenId === r.id ? null : r.id); }}
                          disabled={actionLoadingId === r.id}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] text-[var(--surface-light-fg)] hover:bg-[var(--accent-muted)] disabled:opacity-50"
                          aria-label="Actions"
                        >
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                          </svg>
                        </button>
                        {actionsOpenId === r.id && (
                          <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] py-1 shadow-lg">
                            <button
                              type="button"
                              onClick={() => openEditPassword(r)}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-[var(--surface-light-fg)] hover:bg-[var(--accent-muted)]"
                            >
                              Edit password
                            </button>
                            <button
                              type="button"
                              onClick={() => { setActionsOpenId(null); handleToggleAccess(r.id, r.is_active); }}
                              disabled={actionLoadingId === r.id}
                              className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium disabled:opacity-50 ${
                                r.is_active
                                  ? 'text-[var(--warning-text)] hover:bg-[var(--warning-bg)]'
                                  : 'text-[var(--success-text)] hover:bg-[var(--success-bg)]'
                              }`}
                            >
                              {actionLoadingId === r.id ? 'Updating…' : r.is_active ? 'Revoke access' : 'Grant access'}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setActionsOpenId(null); handleDeleteRecruiter(r.id); }}
                              disabled={actionLoadingId === r.id}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-[var(--error-text)] hover:bg-[var(--error-bg)] disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {passwordEditId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeEditPassword}>
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--surface-light-fg)]">Update password</h3>
            <p className="mt-1 text-sm text-[var(--surface-light-muted)]">Set a new password for {passwordEditName}</p>
            <form onSubmit={handleUpdatePassword} className="mt-5 space-y-4">
              <div>
                <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]">
                  New password (min 6 characters)
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={passwordEditValue}
                  onChange={(e) => setPasswordEditValue(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)] placeholder-[var(--surface-light-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={closeEditPassword} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={passwordEditLoading || passwordEditValue.length < 6} className="flex-1 disabled:opacity-50">
                  {passwordEditLoading ? 'Updating…' : 'Update password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
