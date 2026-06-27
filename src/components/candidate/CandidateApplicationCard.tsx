'use client';

import Link from 'next/link';
import { Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { CandidateDashboardApplication } from '@/lib/api';

type InterviewSchedule = NonNullable<CandidateDashboardApplication['schedule']>;

export function CandidateInterviewCard({
  schedule,
  jobTitle,
  compact = false,
}: {
  schedule: InterviewSchedule;
  jobTitle?: string;
  compact?: boolean;
}) {
  const when = schedule.scheduledAt ? new Date(schedule.scheduledAt) : null;
  const formatted = when
    ? when.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      className={`rounded-2xl border-2 border-[var(--accent)]/30 bg-gradient-to-br from-[var(--accent-muted)] to-[var(--surface-light-card)] ${
        compact ? 'p-4' : 'p-5 sm:p-6'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
            <Calendar className="h-4 w-4" />
            Interview scheduled
          </p>
          {jobTitle && (
            <p className="mt-2 text-base font-semibold text-[var(--surface-light-fg)]">{jobTitle}</p>
          )}
          {formatted && (
            <p className="mt-1 text-lg font-semibold text-[var(--surface-light-fg)]">{formatted}</p>
          )}
          {schedule.status && (
            <p className="mt-1 text-sm capitalize text-[var(--surface-light-muted)]">
              Status: {schedule.status.replace(/_/g, ' ')}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {schedule.joinUrl && (
          <Link href={schedule.joinUrl}>
            <Button size="md" className="gap-2">
              Join interview
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        )}
        {schedule.reportUrl && (
          <Link href={schedule.reportUrl}>
            <Button variant="secondary" size="md">
              View report
            </Button>
          </Link>
        )}
      </div>
      <p className="mt-3 text-xs text-[var(--surface-light-muted)]">
        We also emailed you this date and join link. You can always find it here in Applied Jobs.
      </p>
    </div>
  );
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

export function CandidateApplicationCard({ app }: { app: CandidateDashboardApplication }) {
  return (
    <div className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-[var(--surface-light-fg)] sm:text-lg">
            {app.position.title}
            {app.position.companyName ? ` · ${app.position.companyName}` : ''}
          </p>
          <p className="mt-1 text-sm text-[var(--surface-light-muted)]">{app.position.role}</p>
          <p className="mt-2 text-xs font-medium text-[var(--surface-light-muted)]">
            Applied {new Date(app.appliedAt).toLocaleString()} ·{' '}
            <span className="capitalize text-[var(--surface-light-fg)]">{statusLabel(app.status)}</span>
          </p>
        </div>
        {app.resumeUrl && (
          <a
            href={app.resumeUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[var(--surface-light-border)] bg-[var(--accent-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)]"
          >
            View resume
          </a>
        )}
      </div>

      {app.schedule ? (
        <div className="mt-5">
          <CandidateInterviewCard schedule={app.schedule} jobTitle={app.position.title} compact />
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--surface-light-border)] bg-[var(--surface-light)] px-4 py-3 text-sm text-[var(--surface-light-muted)]">
          Application received. You will get an email when an interview is scheduled.
        </div>
      )}
    </div>
  );
}
