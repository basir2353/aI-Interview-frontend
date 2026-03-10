'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type AdminRow } from '@/lib/api';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AdminAdminsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editPermissionLevel, setEditPermissionLevel] = useState<'full' | 'limited'>('full');
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [permissionLevel, setPermissionLevel] = useState<'full' | 'limited'>('full');

  const load = async () => {
    setError('');
    setForbidden(false);
    try {
      const r = await api.adminGetAdmins();
      setAdmins(r.admins);
    } catch (e) {
      if (e instanceof Error && (e.message.includes('403') || e.message.includes('Only the super admin'))) {
        setForbidden(true);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load admins');
      }
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    load().finally(() => setLoading(false));
  }, [router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);
    try {
      await api.adminCreateAdmin({ email, password, name: name || undefined, permissionLevel });
      setEmail('');
      setPassword('');
      setName('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create admin');
    } finally {
      setSubmitLoading(false);
    }
  };

  const openEdit = (a: AdminRow) => {
    if (a.isSuperAdmin) return;
    setEditId(a.id);
    setEditName(a.name || '');
    setEditPassword('');
    setEditPermissionLevel(a.permissionLevel ?? 'full');
  };

  const closeEdit = () => {
    setEditId(null);
    setEditName('');
    setEditPassword('');
    setEditPermissionLevel('full');
  };

  const handleUpdate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editId) return;
    setError('');
    setEditLoading(true);
    try {
      await api.adminUpdateAdmin(editId, {
        name: editName || undefined,
        password: editPassword.length >= 6 ? editPassword : undefined,
        permissionLevel: editPermissionLevel,
      });
      closeEdit();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update admin');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this admin? They will no longer be able to sign in.')) return;
    setError('');
    setDeleteLoadingId(id);
    try {
      await api.adminDeleteAdmin(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete admin');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  if (loading) {
    return (
      <AdminShell title="Admins" description="Manage admin accounts (super admin only).">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)]/20 border-t-[var(--accent)]" />
        </div>
      </AdminShell>
    );
  }

  if (forbidden) {
    return (
      <AdminShell title="Admins" description="Manage admin accounts.">
        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-8 text-center shadow-sm">
          <p className="font-medium text-[var(--surface-light-fg)]">Only the super admin can manage admins.</p>
          <p className="mt-2 text-sm text-[var(--surface-light-muted)]">
            Log in with the super admin account (set in backend .env as ADMIN_EMAIL and ADMIN_PASSWORD) to add or view admins.
          </p>
          <p className="mt-4 text-xs text-[var(--surface-light-muted)]">
            Super admin URL: <strong>/admin/login</strong> — use ADMIN_EMAIL and ADMIN_PASSWORD from your backend .env file.
          </p>
        </Card>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Admins"
      description="Add and view admin accounts. Only the super admin (env credentials) can manage this list."
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">
            {error}
          </div>
        )}

        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--surface-light-fg)]">Add admin</h2>
          <p className="mt-1 text-sm text-[var(--surface-light-muted)]">
            New admins can sign in at /admin/login with the email and password you set.
          </p>
          <form onSubmit={handleCreate} className="mt-4 flex flex-wrap items-end gap-4">
            <div className="min-w-[200px]">
              <label htmlFor="admin-email" className="mb-1 block text-sm font-medium text-[var(--surface-light-fg)]">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin2@example.com"
                className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-2.5 text-sm text-[var(--surface-light-fg)]"
              />
            </div>
            <div className="min-w-[140px]">
              <label htmlFor="admin-password" className="mb-1 block text-sm font-medium text-[var(--surface-light-fg)]">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Min 6 characters"
                className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-2.5 text-sm text-[var(--surface-light-fg)]"
              />
            </div>
            <div className="min-w-[160px]">
              <label htmlFor="admin-name" className="mb-1 block text-sm font-medium text-[var(--surface-light-fg)]">
                Name (optional)
              </label>
              <input
                id="admin-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display name"
                className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-2.5 text-sm text-[var(--surface-light-fg)]"
              />
            </div>
            <div className="min-w-[160px]">
              <label htmlFor="admin-access" className="mb-1 block text-sm font-medium text-[var(--surface-light-fg)]">
                Access
              </label>
              <select
                id="admin-access"
                value={permissionLevel}
                onChange={(e) => setPermissionLevel(e.target.value as 'full' | 'limited')}
                className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-2.5 text-sm text-[var(--surface-light-fg)]"
              >
                <option value="full">Full (dashboard, schedules, candidates, questions)</option>
                <option value="limited">Limited (no admins/recruiters management)</option>
              </select>
            </div>
            <Button type="submit" disabled={submitLoading}>
              {submitLoading ? 'Adding…' : 'Add admin'}
            </Button>
          </form>
        </Card>

        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-0 shadow-sm">
          <div className="border-b border-[var(--surface-light-border)] px-4 py-4 sm:px-6">
            <h2 className="font-semibold text-[var(--surface-light-fg)]">Admin accounts</h2>
            <p className="mt-0.5 text-sm text-[var(--surface-light-muted)]">
              Super admin is set in backend .env (ADMIN_EMAIL). Other admins are listed below.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--surface-light-border)] bg-[var(--accent-muted)]">
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Email</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Name</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Role</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Access</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Added</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-light-border)]">
                {admins.map((a) => (
                  <tr key={a.id} className="hover:bg-[var(--accent-muted)]/30">
                    <td className="px-4 py-3 sm:px-6">
                      <span className="font-medium text-[var(--surface-light-fg)]">{a.email}</span>
                      {a.isSuperAdmin && (
                        <span className="ml-2 rounded-md bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-white">
                          Super Admin
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--surface-light-muted)] sm:px-6">
                      {editId === a.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full max-w-[180px] rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-2 py-1 text-[var(--surface-light-fg)]"
                          placeholder="Name"
                        />
                      ) : (
                        a.name || '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--surface-light-muted)] sm:px-6">
                      {a.isSuperAdmin ? 'Super admin' : 'Admin'}
                    </td>
                    <td className="px-4 py-3 text-[var(--surface-light-muted)] sm:px-6">
                      {a.isSuperAdmin ? (
                        <span className="rounded-md bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-white">Full</span>
                      ) : editId === a.id ? (
                        <select
                          value={editPermissionLevel}
                          onChange={(e) => setEditPermissionLevel(e.target.value as 'full' | 'limited')}
                          className="rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-2 py-1 text-sm text-[var(--surface-light-fg)]"
                        >
                          <option value="full">Full</option>
                          <option value="limited">Limited</option>
                        </select>
                      ) : (
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${(a.permissionLevel ?? 'full') === 'full' ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'bg-[var(--surface-light-muted)] text-[var(--surface-light-fg)]'}`}>
                          {a.permissionLevel ?? 'full'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--surface-light-muted)] sm:px-6">
                      {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 sm:px-6">
                      {a.isSuperAdmin ? (
                        <span className="text-xs text-[var(--surface-light-muted)]">—</span>
                      ) : editId === a.id ? (
                        <span className="flex flex-wrap items-center gap-2">
                          <input
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="New password (optional)"
                            className="max-w-[140px] rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-2 py-1 text-sm text-[var(--surface-light-fg)]"
                          />
                          <Button size="md" onClick={() => void handleUpdate()} disabled={editLoading}>
                            {editLoading ? 'Saving…' : 'Save'}
                          </Button>
                          <button type="button" onClick={closeEdit} className="text-sm text-[var(--surface-light-muted)] hover:underline">
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <span className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(a)}
                            className="text-sm font-medium text-[var(--accent)] hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(a.id)}
                            disabled={deleteLoadingId === a.id}
                            className="text-sm font-medium text-[var(--error-text)] hover:underline disabled:opacity-50"
                          >
                            {deleteLoadingId === a.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {admins.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-[var(--surface-light-muted)] sm:px-6">
              No admins yet. Add one above (super admin is defined in .env).
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
