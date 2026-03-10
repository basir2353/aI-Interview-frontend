'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type AccessAdmin = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  isSuperAdmin: boolean;
  permissionLevel: 'full' | 'limited';
  role: 'admin';
};

type AccessRecruiter = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  isActive: boolean;
  permissionLevel: 'full' | 'limited';
  scheduleCount: string;
  role: 'recruiter';
};

export default function AdminAccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [admins, setAdmins] = useState<AccessAdmin[]>([]);
  const [recruiters, setRecruiters] = useState<AccessRecruiter[]>([]);
  const [deleteAdminId, setDeleteAdminId] = useState<string | null>(null);

  const load = () =>
    api.adminGetAccess().then((r) => {
      setAdmins(r.admins);
      setRecruiters(r.recruiters);
    });

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    load()
      .catch((e) => {
        if (e instanceof Error && (e.message.includes('403') || e.message.includes('Only the super admin'))) {
          setForbidden(true);
        } else {
          setError(e instanceof Error ? e.message : 'Failed to load');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleDeleteAdmin = async (id: string) => {
    if (!confirm('Remove this admin? They will no longer be able to sign in.')) return;
    setError('');
    setDeleteAdminId(id);
    try {
      await api.adminDeleteAdmin(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete admin');
    } finally {
      setDeleteAdminId(null);
    }
  };

  if (loading) {
    return (
      <AdminShell title="Roles & Permissions" description="Manage all user access (super admin only).">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)]/20 border-t-[var(--accent)]" />
        </div>
      </AdminShell>
    );
  }

  if (forbidden) {
    return (
      <AdminShell title="Roles & Permissions" description="Manage roles and permissions.">
        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-8 text-center shadow-sm">
          <p className="font-medium text-[var(--surface-light-fg)]">Only the super admin can view roles and permissions.</p>
          <p className="mt-2 text-sm text-[var(--surface-light-muted)]">
            Log in with the super admin account (ADMIN_EMAIL / ADMIN_PASSWORD in backend .env).
          </p>
        </Card>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Roles & Permissions"
      description="View and manage all admins and recruiters. Edit or delete from the linked pages."
    >
      <div className="space-y-8">
        {error && (
          <div className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">
            {error}
          </div>
        )}

        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-0 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--surface-light-border)] px-4 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-[var(--surface-light-fg)]">Admins</h2>
              <p className="mt-0.5 text-sm text-[var(--surface-light-muted)]">
                Full access to admin dashboard. Super admin can add, edit, and delete admins.
              </p>
            </div>
            <Link href="/admin/admins">
              <Button variant="secondary" size="md">Manage Admins</Button>
            </Link>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--surface-light-border)] bg-[var(--accent-muted)]">
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Email</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Name</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Role / Access</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Added</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-light-border)]">
                {admins.map((a) => (
                  <tr key={a.id} className="hover:bg-[var(--accent-muted)]/30">
                    <td className="px-4 py-3 sm:px-6 font-medium text-[var(--surface-light-fg)]">{a.email}</td>
                    <td className="px-4 py-3 text-[var(--surface-light-muted)] sm:px-6">{a.name || '—'}</td>
                    <td className="px-4 py-3 sm:px-6">
                      {a.isSuperAdmin ? (
                        <span className="rounded-md bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-white">Super Admin</span>
                      ) : (
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${a.permissionLevel === 'full' ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'bg-[var(--surface-light-muted)] text-[var(--surface-light-fg)]'}`}>
                          {a.permissionLevel}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--surface-light-muted)] sm:px-6">
                      {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 sm:px-6">
                      {a.isSuperAdmin ? (
                        <span className="text-xs text-[var(--surface-light-muted)]">—</span>
                      ) : (
                        <span className="flex gap-2">
                          <Link href="/admin/admins" className="text-sm font-medium text-[var(--accent)] hover:underline">Edit</Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteAdmin(a.id)}
                            disabled={deleteAdminId === a.id}
                            className="text-sm font-medium text-[var(--error-text)] hover:underline disabled:opacity-50"
                          >
                            {deleteAdminId === a.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {admins.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-[var(--surface-light-muted)] sm:px-6">No admins.</div>
            )}
          </div>
        </Card>

        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-0 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--surface-light-border)] px-4 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-[var(--surface-light-fg)]">Recruiters</h2>
              <p className="mt-0.5 text-sm text-[var(--surface-light-muted)]">
                Can create jobs, schedule interviews, and view applicants. Permission level: full or limited.
              </p>
            </div>
            <Link href="/admin/recruiters">
              <Button variant="secondary" size="md">Manage Recruiters</Button>
            </Link>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--surface-light-border)] bg-[var(--accent-muted)]">
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Email</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Name</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Permission</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Status</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Schedules</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Added</th>
                  <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-light-border)]">
                {recruiters.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--accent-muted)]/30">
                    <td className="px-4 py-3 sm:px-6 font-medium text-[var(--surface-light-fg)]">{r.email}</td>
                    <td className="px-4 py-3 text-[var(--surface-light-muted)] sm:px-6">{r.name || '—'}</td>
                    <td className="px-4 py-3 sm:px-6">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${r.permissionLevel === 'full' ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'bg-[var(--surface-light-muted)] text-[var(--surface-light-fg)]'}`}>
                        {r.permissionLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 sm:px-6">
                      <span className={r.isActive ? 'text-[var(--success-text)]' : 'text-[var(--surface-light-muted)]'}>
                        {r.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--surface-light-muted)] sm:px-6">{r.scheduleCount}</td>
                    <td className="px-4 py-3 text-[var(--surface-light-muted)] sm:px-6">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 sm:px-6">
                      <Link href="/admin/recruiters" className="text-sm font-medium text-[var(--accent)] hover:underline">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recruiters.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-[var(--surface-light-muted)] sm:px-6">No recruiters yet.</div>
            )}
          </div>
        </Card>

        <div className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6 shadow-sm">
          <h3 className="font-semibold text-[var(--surface-light-fg)]">What you can do as Super Admin</h3>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[var(--surface-light-muted)]">
            <li><strong>Admins:</strong> Add admins with Access (Full or Limited), edit name/password/access, and delete. Super admin (env) cannot be edited or deleted.</li>
            <li><strong>Recruiters:</strong> Add recruiters, set permission (full / limited), enable or disable access, change password, delete.</li>
            <li><strong>Candidates:</strong> Super admin can edit candidate name and set/reset password from the Candidates page.</li>
            <li><strong>Full</strong> admin = can manage recruiters and view this page; <strong>Limited</strong> admin = dashboard, schedules, candidates, questions only (no admins/recruiters).</li>
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
