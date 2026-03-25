'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, type RecruiterApplication, type RecruiterJob } from '@/lib/api';

export default function RecruiterApplicantsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState<RecruiterJob[]>([]);
  const [applications, setApplications] = useState<RecruiterApplication[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [mailStatusByApp, setMailStatusByApp] = useState<Record<string, { sent: boolean; text: string }>>({});

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('recruiterToken') : null;
    if (!token) {
      router.replace('/recruiter/login');
      return;
    }
    Promise.all([api.recruiterMe(), api.recruiterGetJobs(), api.recruiterGetApplications()])
      .then(([, jobsRes, appsRes]) => {
        setJobs(jobsRes.jobs);
        setApplications(appsRes.applications);
        const persistedMailStatus: Record<string, { sent: boolean; text: string }> = {};
        for (const app of appsRes.applications) {
          if (app.interview_email_sent === true) {
            persistedMailStatus[app.id] = { sent: true, text: 'Mail sent to user successfully.' };
          } else if (app.interview_email_sent === false) {
            persistedMailStatus[app.id] = {
              sent: false,
              text: `Mail not sent: ${app.interview_email_error || 'Unknown mail error'}`,
            };
          }
        }
        setMailStatusByApp(persistedMailStatus);
      })
      .catch((e) => {
        const message = e instanceof Error ? e.message : 'Failed to load applicants';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const filteredApplications = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return applications.filter((app) => {
      if (selectedJobId && app.position_id !== selectedJobId) return false;
      if (!query) return true;
      const haystack =
        `${app.candidate_name ?? ''} ${app.candidate_email ?? ''} ${app.position_title} ${app.position_role}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [applications, selectedJobId, searchText]);

  const rejectApplication = async (app: RecruiterApplication) => {
    const ok = confirm('Reject this application?');
    if (!ok) return;
    setError('');
    setRejectingId(app.id);
    try {
      await api.recruiterRejectApplication(app.id);
      setApplications((prev) =>
        prev.map((item) => (item.id === app.id ? { ...item, status: 'rejected' } : item))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject application');
    } finally {
      setRejectingId(null);
    }
  };

  return (
    <AppShell
      title="Applicants"
      subtitle="Review applicants by posted job"
      backHref="/recruiter"
      backLabel="Recruiter dashboard"
      theme="light"
    >
      <div className="space-y-4 sm:space-y-6">
        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search candidate, email, role..."
              className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-sm text-[var(--surface-light-fg)] outline-none focus:ring-2 focus:ring-[var(--accent-ring)] focus:border-[var(--accent)]"
            />
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-sm text-[var(--surface-light-fg)] outline-none focus:ring-2 focus:ring-[var(--accent-ring)] focus:border-[var(--accent)]"
            >
              <option value="">All posted jobs</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} {job.company_name ? `• ${job.company_name}` : ''}
                </option>
              ))}
            </select>
            <div className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--accent-muted)] px-4 py-3 text-sm font-semibold text-[var(--accent)]">
              {filteredApplications.length} applicant{filteredApplications.length !== 1 ? 's' : ''}
            </div>
          </div>
        </Card>

        {loading && <p className="text-sm font-medium text-[var(--surface-light-muted)]">Loading applicants…</p>}
        {error && (
          <p className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm font-medium text-[var(--error-text)]">{error}</p>
        )}

        {!loading && filteredApplications.length === 0 && (
          <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6 shadow-sm">
            <p className="text-sm font-medium text-[var(--surface-light-muted)]">No applicants found for the selected filters.</p>
          </Card>
        )}

        {filteredApplications.map((app) => (
          <Card key={app.id} className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-5 shadow-sm">
            {/** Prefer live state, then persisted DB status */}
            {(() => {
              const persistedStatus =
                app.interview_email_sent === true
                  ? { sent: true, text: 'Mail sent to user successfully.' }
                  : app.interview_email_sent === false
                    ? { sent: false, text: `Mail not sent: ${app.interview_email_error || 'Unknown mail error'}` }
                    : null;
              const mailStatus = mailStatusByApp[app.id] ?? persistedStatus;
              return (
                <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[var(--surface-light-fg)]">{app.candidate_name || 'Candidate'}</p>
                <p className="text-sm text-[var(--surface-light-muted)]">{app.candidate_email || 'No email provided'}</p>
                <p className="mt-1 text-sm text-[var(--surface-light-fg)]">
                  {app.position_title} • {app.position_role}
                  {app.match_score != null && (
                    <span className="ml-2 inline-flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          app.match_score >= 60
                            ? 'bg-[var(--success-bg)] text-[var(--success-text)]'
                            : app.match_score >= 35
                              ? 'bg-[var(--warning-bg)] text-[var(--warning-text)]'
                              : 'bg-[var(--accent-muted)] text-[var(--surface-light-muted)]'
                        }`}
                      >
                        Match: {app.match_score}%
                      </span>
                      {app.match_score >= 60 && (
                        <span className="inline-flex items-center rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)] ring-1 ring-[var(--accent)]">
                          Recommended
                        </span>
                      )}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs font-medium text-[var(--surface-light-muted)]">
                  Applied: {new Date(app.created_at).toLocaleString()} • Status:{' '}
                  <span
                    className={
                      app.status === 'rejected'
                        ? 'font-semibold text-[var(--error-text)]'
                        : app.status === 'interview_scheduled'
                          ? 'font-semibold text-[var(--success-text)]'
                          : ''
                    }
                  >
                    {app.status}
                  </span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
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
                {mailStatus && (
                  <p
                    className={`max-w-[300px] text-right text-xs font-medium ${
                      mailStatus.sent ? 'text-[var(--success-text)]' : 'text-[var(--warning-text)]'
                    }`}
                  >
                    {mailStatus.text}
                  </p>
                )}
              </div>
            </div>
            {app.cover_letter && <p className="mt-3 whitespace-pre-line text-sm text-[var(--surface-light-fg)]">{app.cover_letter}</p>}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Button
                size="md"
                href={`/recruiter/schedule?applicationId=${encodeURIComponent(app.id)}`}
                className="justify-center"
              >
                Schedule interview
              </Button>
              <Button
                size="md"
                variant="secondary"
                disabled={rejectingId === app.id || app.status === 'rejected' || app.status === 'interview_scheduled'}
                onClick={() => void rejectApplication(app)}
                className={`justify-center md:col-span-1 ${
                  app.status === 'rejected'
                    ? 'border-[var(--error-border)] bg-[var(--error-bg)] text-[var(--error-text)] disabled:opacity-100'
                    : 'disabled:opacity-50'
                }`}
              >
                {app.status === 'rejected'
                  ? 'Rejected'
                  : rejectingId === app.id
                    ? 'Rejecting…'
                    : 'Reject application'}
              </Button>
            </div>
                </>
              );
            })()}
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
