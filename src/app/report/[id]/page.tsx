'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { InterviewReport } from '@/types';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';

const RECOMMENDATION_STYLES: Record<string, string> = {
  strong_hire: 'bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]',
  hire: 'bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]',
  borderline: 'bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-border)]',
  no_hire: 'bg-[var(--error-bg)] text-[var(--error-text)] border-[var(--error-border)]',
};

export default function ReportPage() {
  const params = useParams();
  const id = params.id as string;
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api
      .getReport(id)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-light)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)]/20 border-t-[var(--accent)]" />
          <p className="text-[var(--surface-light-muted)] font-medium">Loading report…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface-light)] px-6">
        <p className="mb-4 text-[var(--error-text)]">{error || 'Report not found'}</p>
        <Link href="/recruiter" className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]">
          Back to recruiter dashboard
        </Link>
      </div>
    );
  }

  return (
    <AppShell
      title="Interview Report"
      subtitle={report.interviewId.slice(0, 8) + '…'}
      backHref="/recruiter"
      backLabel="Recruiter"
      theme="light"
    >
      <div className="mx-auto max-w-3xl space-y-8">
        <Card className="rounded-2xl p-6 border-[var(--surface-light-border)] bg-[var(--surface-light-card)]">
          <h2 className="mb-2 text-base font-semibold text-[var(--surface-light-fg)]">Summary</h2>
          <p className="leading-relaxed text-[var(--surface-light-muted)]">{report.summary}</p>
          <div className="mt-5 flex flex-wrap gap-6 border-t border-[var(--surface-light-border)] pt-5">
            <div>
              <span className="mb-0.5 block text-sm font-medium text-[var(--surface-light-muted)]">Score</span>
              <p className="font-semibold text-[var(--surface-light-fg)]">{report.overallScore} / {report.maxScore}</p>
            </div>
            <div>
              <span className="mb-0.5 block text-sm font-medium text-[var(--surface-light-muted)]">Recommendation</span>
              <span
                className={`inline-block rounded-lg border px-2.5 py-1 text-xs font-medium ${RECOMMENDATION_STYLES[report.recommendation] ?? 'border-[var(--surface-light-border)] bg-[var(--accent-muted)] text-[var(--surface-light-fg)]'
                  }`}
              >
                {report.recommendation.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="mb-0.5 block text-sm font-medium text-[var(--surface-light-muted)]">Role</span>
              <p className="font-medium capitalize text-[var(--surface-light-fg)]">{report.role}</p>
            </div>
          </div>
        </Card>

        {report.strengths.length > 0 && (
          <Card className="rounded-2xl p-6 border-[var(--surface-light-border)] bg-[var(--surface-light-card)]">
            <h2 className="mb-3 text-base font-semibold text-[var(--surface-light-fg)]">Strengths</h2>
            <ul className="space-y-2">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-[var(--surface-light-muted)]">
                  <span className="mt-0.5 text-[var(--success-text)]">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {report.improvements.length > 0 && (
          <Card className="rounded-2xl p-6 border-[var(--surface-light-border)] bg-[var(--surface-light-card)]">
            <h2 className="mb-3 text-base font-semibold text-[var(--surface-light-fg)]">Areas for improvement</h2>
            <ul className="space-y-2">
              {report.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-[var(--surface-light-muted)]">
                  <span className="mt-0.5 text-[var(--warning-text)]">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {report.redFlags.length > 0 && (
          <Card className="rounded-2xl border-[var(--warning-border)] bg-[var(--warning-bg)] p-6">
            <h2 className="mb-3 text-base font-semibold text-[var(--warning-text)]">Red flags</h2>
            <ul className="space-y-2">
              {report.redFlags.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-[var(--warning-text)]">
                  <span className="mt-0.5 text-[var(--error-text)]">!</span>
                  {s}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {report.competencies.length > 0 && (
          <Card className="rounded-2xl p-6 border-[var(--surface-light-border)] bg-[var(--surface-light-card)]">
            <h2 className="mb-4 text-base font-semibold text-[var(--surface-light-fg)]">Competencies</h2>
            <div className="space-y-4">
              {report.competencies.map((c) => (
                <div key={c.competencyId} className="flex items-center gap-4">
                  <span className="w-36 text-sm font-medium text-[var(--surface-light-fg)]">{c.name}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--accent-muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all"
                      style={{ width: `${(c.score / c.maxScore) * 100}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-sm font-medium text-[var(--surface-light-muted)]">{c.score.toFixed(1)}/{c.maxScore}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="rounded-2xl p-6 border-[var(--surface-light-border)] bg-[var(--surface-light-card)]">
          <h2 className="mb-4 text-base font-semibold text-[var(--surface-light-fg)]">Q&A summary</h2>
          <div className="space-y-5">
            {report.questionAnswerSummary.map((qa, i) => (
              <div key={i} className="border-b border-[var(--surface-light-border)] pb-5 last:border-0 last:pb-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--surface-light-muted)]">Question</p>
                <p className="mb-3 text-[var(--surface-light-fg)]">{qa.question}</p>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--surface-light-muted)]">
                  Answer · Score: {qa.score.toFixed(1)}
                </p>
                <p className="leading-relaxed text-[var(--surface-light-muted)]">{qa.answer}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="pt-4">
          <Link
            href="/recruiter"
            className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]"
          >
            ← Back to recruiter dashboard
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
