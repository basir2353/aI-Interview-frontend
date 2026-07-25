'use client';

import Link from 'next/link';
import { Calendar, ExternalLink } from 'lucide-react';
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
        timeZoneName: 'short',
      })
    : null;

  return (
    <div
      className={`rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] ${
        compact ? 'p-4' : 'p-5 sm:p-6'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--surface-light-muted)]">
            <Calendar className="h-3.5 w-3.5" />
            Interview scheduled
          </p>
          {jobTitle && (
            <p className="mt-2 text-base font-semibold text-[var(--surface-light-fg)]">{jobTitle}</p>
          )}
          {formatted && (
            <p className="mt-1 text-lg font-semibold tracking-tight text-[var(--surface-light-fg-heading)]">
              {formatted}
            </p>
          )}
          {schedule.status && (
            <p className="mt-1 text-sm capitalize text-[var(--surface-light-muted)]">
              {schedule.status.replace(/_/g, ' ')}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {schedule.joinUrl && (
          <Link
            href={schedule.joinUrl}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--surface-light-fg)] px-4 py-2.5 text-sm font-semibold text-[var(--surface-light-card)] transition hover:opacity-90"
          >
            Join interview
            <ExternalLink className="h-4 w-4" />
          </Link>
        )}
        {schedule.reportUrl && (
          <Link
            href={schedule.reportUrl}
            className="inline-flex rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-2.5 text-sm font-semibold text-[var(--surface-light-fg)] transition hover:bg-[var(--accent-muted)]"
          >
            View report
          </Link>
        )}
      </div>
      <p className="mt-3 text-xs text-[var(--surface-light-muted-soft)]">
        We also emailed you this time and join link. You can always find it under Applications.
      </p>
    </div>
  );
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

export function CandidateApplicationCard({ app }: { app: CandidateDashboardApplication }) {
  return (
    <article className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-[var(--surface-light-fg)] sm:text-lg">
            {app.position.title}
            {app.position.companyName ? (
              <span className="font-normal text-[var(--surface-light-muted)]"> · {app.position.companyName}</span>
            ) : null}
          </p>
          <p className="mt-1 text-sm text-[var(--surface-light-muted)]">{app.position.role}</p>
          <p className="mt-2 text-xs text-[var(--surface-light-muted-soft)]">
            Applied {new Date(app.appliedAt).toLocaleString()} ·{' '}
            <span className="capitalize text-[var(--surface-light-muted)]">{statusLabel(app.status)}</span>
          </p>
        </div>
        {app.resumeUrl && (
          <a
            href={app.resumeUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[var(--surface-light-border)] px-3 py-1.5 text-xs font-semibold text-[var(--surface-light-muted)] hover:bg-[var(--accent-muted)]"
          >
            View resume
          </a>
        )}
      </div>

      {app.schedule ? (
        <div className="mt-5 border-t border-[var(--surface-light-border)] pt-5">
          <CandidateInterviewCard schedule={app.schedule} jobTitle={app.position.title} compact />
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--surface-light-border)] bg-[var(--surface-light)] px-4 py-3 text-sm text-[var(--surface-light-muted)]">
          Application received. You&apos;ll get an email when an interview is scheduled.
        </div>
      )}
    </article>
  );
}
