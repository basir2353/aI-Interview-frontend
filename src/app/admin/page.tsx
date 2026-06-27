'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Calendar, FileText, Users } from 'lucide-react';
import { api, type AdminOverviewResponse, type AdminScheduleRow } from '@/lib/api';
import { AdminShell } from '@/components/layout/AdminShell';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { DashboardLoading } from '@/components/dashboard/DashboardLoading';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatusBadge, statusToVariant } from '@/components/dashboard/StatusBadge';

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
    return <DashboardLoading message="Loading dashboard…" />;
  }

  const metrics = overview?.metrics ?? { recruiters: 0, candidates: 0, interviews: 0 };
  const latestSchedules = overview?.latestSchedules ?? [];
  const scheduledCount = schedules.filter((s) =>
    ['scheduled', 'in_progress'].includes(String(s.status).toLowerCase())
  ).length;
  const completedCount = schedules.filter((s) => String(s.status).toLowerCase() === 'completed').length;

  return (
    <AdminShell title="Dashboard" description="Overview of recruiters, candidates, interviews, and schedules.">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Recruiters"
            value={metrics.recruiters}
            hint="Manage access & permissions"
            icon={Users}
            href="/admin/recruiters"
          />
          <StatCard
            label="Candidates"
            value={metrics.candidates}
            hint="View all candidates"
            icon={Briefcase}
            iconColor="dash-stat-icon-blue"
            href="/admin/candidates"
          />
          <StatCard
            label="Interviews"
            value={metrics.interviews}
            hint={`${scheduledCount} scheduled · ${completedCount} completed`}
            icon={Calendar}
            iconColor="dash-stat-icon-emerald"
            href="/admin/schedules"
          />
          <StatCard
            label="Applications"
            value="—"
            hint="View all applications & CVs"
            icon={FileText}
            iconColor="dash-stat-icon-amber"
            href="/admin/applications"
          />
        </div>

        <DashboardCard
          title="Latest schedules"
          actionHref="/admin/schedules"
          actionLabel="View all"
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="dash-table-head">
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">Candidate</th>
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">Type</th>
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">Scheduled</th>
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">Status</th>
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">Recruiter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-light-border)]">
                {latestSchedules.slice(0, 10).map((s) => (
                  <tr key={s.id} className="dash-table-row transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-[var(--surface-light-fg)]">
                        {s.candidate_name || s.candidate_email}
                      </p>
                      <p className="text-xs text-[var(--surface-light-muted)]">{s.candidate_email}</p>
                    </td>
                    <td className="px-5 py-3.5 capitalize text-[var(--surface-light-fg)]">{s.role}</td>
                    <td className="px-5 py-3.5 text-[var(--surface-light-fg)]">
                      {new Date(s.scheduled_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge variant={statusToVariant(String(s.status))}>
                        {String(s.status).replace(/_/g, ' ')}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--surface-light-muted)]">
                      {s.recruiter_name || s.recruiter_email || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {latestSchedules.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-[var(--surface-light-muted)]">
              No schedules yet.
            </div>
          )}
        </DashboardCard>
      </div>
    </AdminShell>
  );
}
