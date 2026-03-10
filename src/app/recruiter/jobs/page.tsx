'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  api,
  type RecruiterApplication,
  type RecruiterJob,
} from '@/lib/api';
import type { InterviewRole } from '@/types';

const roles: { value: InterviewRole; label: string }[] = [
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'sales', label: 'Sales' },
  { value: 'customer_success', label: 'Customer Success' },
];

export default function RecruiterJobsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<RecruiterJob[]>([]);
  const [applications, setApplications] = useState<RecruiterApplication[]>([]);
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [scheduleDateByApp, setScheduleDateByApp] = useState<Record<string, string>>({});
  const [scheduleTimeByApp, setScheduleTimeByApp] = useState<Record<string, string>>({});
  const [joinUrlByApp, setJoinUrlByApp] = useState<Record<string, string>>({});

  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [location, setLocation] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [role, setRole] = useState<InterviewRole>('technical');
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState(false);

  const load = async () => {
    const [jobsRes, appsRes] = await Promise.all([api.recruiterGetJobs(), api.recruiterGetApplications()]);
    setJobs(jobsRes.jobs);
    setApplications(appsRes.applications);
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('recruiterToken') : null;
    if (!token) {
      router.replace('/recruiter/login');
      return;
    }
    api.recruiterMe()
      .then(() => load())
      .catch(() => {
        localStorage.removeItem('recruiterToken');
        localStorage.removeItem('recruiterEmail');
        localStorage.removeItem('recruiterName');
        router.replace('/recruiter/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const createJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);
    try {
      await api.recruiterCreateJob({
        title,
        companyName: companyName || undefined,
        description: description || undefined,
        requirements: requirements || undefined,
        location: location || undefined,
        salaryRange: salaryRange || undefined,
        role,
        autoScheduleEnabled,
      });
      setTitle('');
      setCompanyName('');
      setDescription('');
      setRequirements('');
      setLocation('');
      setSalaryRange('');
      setSuccessMessage('Job posted successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setSubmitLoading(false);
    }
  };

  const scheduleInterview = async (application: RecruiterApplication) => {
    const date = scheduleDateByApp[application.id];
    const time = scheduleTimeByApp[application.id];
    if (!date || !time) {
      setError('Set date and time before scheduling an interview.');
      return;
    }
    setError('');
    setSchedulingId(application.id);
    try {
      const scheduledAt = new Date(`${date}T${time}`).toISOString();
      const created = await api.recruiterScheduleFromApplication(application.id, {
        scheduledAt,
        role: application.position_role,
      });
      setJoinUrlByApp((prev) => ({ ...prev, [application.id]: created.joinUrl }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule interview');
    } finally {
      setSchedulingId(null);
    }
  };

  const deleteJob = async (jobId: string) => {
    const confirmed = confirm('Delete this job? Candidates will no longer be able to apply.');
    if (!confirmed) return;
    setError('');
    setDeletingJobId(jobId);
    try {
      await api.recruiterDeleteJob(jobId);
      setSuccessMessage('Job deleted. Applications are now closed for this role.');
      setTimeout(() => setSuccessMessage(''), 3000);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete job');
    } finally {
      setDeletingJobId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-light)]">
        <p className="text-[var(--surface-light-muted)]">Loading recruiter jobs…</p>
      </div>
    );
  }

  return (
    <AppShell
      title="Recruiter Jobs"
      subtitle="Post jobs, review applications, and schedule interviews"
      backHref="/recruiter"
      backLabel="Recruiter dashboard"
      theme="light"
      actions={
        <div className="flex gap-2">
          <Link href="/recruiter/applicants" className="rounded-lg border border-[var(--surface-light-border)] bg-[var(--accent-muted)] px-3 py-2 text-sm font-semibold text-[var(--accent)] transition-colors hover:opacity-90">
            Applicants
          </Link>
          <Link href="/jobs" className="rounded-lg border border-[var(--surface-light-border)] bg-[var(--accent-muted)] px-3 py-2 text-sm font-semibold text-[var(--accent)] transition-colors hover:opacity-90">
            View public jobs
          </Link>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              localStorage.removeItem('recruiterToken');
              localStorage.removeItem('recruiterEmail');
              localStorage.removeItem('recruiterName');
              window.location.href = '/recruiter/login';
            }}
          >
            Logout
          </Button>
        </div>
      }
    >
      {successMessage && (
        <div className="fixed right-6 top-6 z-50 rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-3 text-sm font-medium text-[var(--success-text)] shadow-lg">
          {successMessage}
        </div>
      )}
      <div className="space-y-8">
        {error && (
          <p className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm font-medium text-[var(--error-text)]">
            {error}
          </p>
        )}

        <Card className="rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-[var(--surface-light-fg)]">Create Job</h2>
          <form onSubmit={createJob} className="mt-4 grid gap-4">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Job title"
              className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company name (optional)"
              className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as InterviewRole)}
              className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (optional)"
              className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <input
              type="text"
              value={salaryRange}
              onChange={(e) => setSalaryRange(e.target.value)}
              placeholder="Salary range (optional)"
              className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Job description (optional)"
              className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <textarea
              rows={4}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Requirements (optional)"
              className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3">
              <input
                type="checkbox"
                checked={autoScheduleEnabled}
                onChange={(e) => setAutoScheduleEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--surface-light-border)] text-[var(--accent)] focus:ring-[var(--accent-ring)]"
              />
              <span className="text-sm font-medium text-[var(--surface-light-fg)]">
                Auto-schedule interviews for new applications (bot will create a slot 24h ahead)
              </span>
            </label>
            <div className="flex justify-end">
              <Button type="submit" size="md" disabled={submitLoading} className="disabled:opacity-50">
                {submitLoading ? 'Creating…' : 'Post job'}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-[var(--surface-light-fg)]">Your Jobs</h2>
          <div className="mt-4 space-y-4">
            {jobs.length === 0 && <p className="text-sm text-[var(--surface-light-muted)]">No jobs posted yet.</p>}
            {jobs.map((job) => (
              <div key={job.id} className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--surface-light-fg)]">{job.title}</p>
                    {job.company_name && <p className="text-sm text-[var(--surface-light-muted)]">{job.company_name}</p>}
                    <p className="text-sm text-[var(--surface-light-muted)]">{job.role}</p>
                  </div>
                  <Button
                    size="md"
                    variant="secondary"
                    disabled={deletingJobId === job.id}
                    onClick={() => void deleteJob(job.id)}
                    className="disabled:opacity-50"
                  >
                    {deletingJobId === job.id ? 'Deleting…' : 'Delete job'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-[var(--surface-light-fg)]">Applications</h2>
          <div className="mt-4 space-y-4">
            {applications.length === 0 && <p className="text-sm text-[var(--surface-light-muted)]">No applications yet.</p>}
            {applications.map((app) => (
              <div key={app.id} className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--surface-light-fg)]">
                      {app.candidate_name || app.candidate_email || 'Candidate'}
                    </p>
                    <p className="text-sm text-[var(--surface-light-muted)]">
                      {app.position_title} • {app.position_role}
                    </p>
                    <p className="text-xs text-[var(--surface-light-muted)]">Status: {app.status}</p>
                  </div>
                  {app.resume_url && (
                    <a
                      href={app.resume_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-[var(--surface-light-border)] bg-[var(--accent-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)]"
                    >
                      View resume
                    </a>
                  )}
                </div>

                {app.cover_letter && <p className="mt-3 text-sm text-[var(--surface-light-fg)]">{app.cover_letter}</p>}

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <input
                    type="date"
                    value={scheduleDateByApp[app.id] || ''}
                    onChange={(e) => setScheduleDateByApp((prev) => ({ ...prev, [app.id]: e.target.value }))}
                    className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-2 text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                  />
                  <input
                    type="time"
                    value={scheduleTimeByApp[app.id] || ''}
                    onChange={(e) => setScheduleTimeByApp((prev) => ({ ...prev, [app.id]: e.target.value }))}
                    className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-2 text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                  />
                  <Button
                    size="md"
                    disabled={schedulingId === app.id}
                    onClick={() => void scheduleInterview(app)}
                    className="disabled:opacity-50"
                  >
                    {schedulingId === app.id ? 'Scheduling…' : 'Schedule interview'}
                  </Button>
                </div>

                {joinUrlByApp[app.id] && (
                  <p className="mt-3 text-xs text-[var(--success-text)]">
                    Interview link created: {joinUrlByApp[app.id]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
