'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, type RecruiterApplication, type RecruiterCustomQuestionInput } from '@/lib/api';
import type { InterviewRole } from '@/types';

function getTomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
function getNextWeekday10(): { date: string; time: string } {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return { date: d.toISOString().slice(0, 10), time: '10:00' };
}

const roleOptions: Array<{ value: InterviewRole; label: string }> = [
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'sales', label: 'Sales' },
  { value: 'customer_success', label: 'Customer Success' },
];

const difficultyOptions = ['easy', 'medium', 'hard'] as const;
type Difficulty = (typeof difficultyOptions)[number];

export default function RecruiterSchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('applicationId') ?? '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdJoinUrl, setCreatedJoinUrl] = useState('');
  const [application, setApplication] = useState<RecruiterApplication | null>(null);

  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [role, setRole] = useState<InterviewRole>('technical');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [focusAreas, setFocusAreas] = useState('');
  const [requirements, setRequirements] = useState('');
  const [questionLines, setQuestionLines] = useState('');
  const [codingQuestionText, setCodingQuestionText] = useState('');
  const [codingLanguage, setCodingLanguage] = useState('javascript');
  const [starterCode, setStarterCode] = useState('');
  const [candidateMessage, setCandidateMessage] = useState('');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('recruiterToken') : null;
    if (!token) {
      router.replace('/recruiter/login');
      return;
    }
    if (!applicationId) {
      setError('Missing application id. Please open this page from the applicants list.');
      setLoading(false);
      return;
    }

    Promise.all([api.recruiterMe(), api.recruiterGetApplications()])
      .then(([, appsRes]) => {
        const app = appsRes.applications.find((item) => item.id === applicationId) ?? null;
        if (!app) {
          setError('Application not found or you no longer have access.');
          return;
        }
        setApplication(app);
        setRole(app.position_role);
        setScheduleDate(getTomorrowDate());
      })
      .catch((e) => {
        const message = e instanceof Error ? e.message : 'Failed to load scheduling details';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [applicationId, router]);

  const customQuestions = useMemo(
    () => questionLines.split('\n').map((line) => line.trim()).filter(Boolean),
    [questionLines]
  );

  const scheduleInterview = async () => {
    if (!application) return;
    if (!scheduleDate || !scheduleTime) {
      setError('Please choose both date and time.');
      return;
    }
    if (application.status === 'rejected') {
      setError('Cannot schedule interview for a rejected application.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      const metadataSections: string[] = [];
      if (durationMinutes.trim()) metadataSections.push(`Duration: ${durationMinutes.trim()} minutes`);
      if (focusAreas.trim()) metadataSections.push(`Focus areas: ${focusAreas.trim()}`);
      if (requirements.trim()) metadataSections.push(`Additional requirements: ${requirements.trim()}`);
      const messageParts = [candidateMessage.trim(), metadataSections.join('\n\n')].filter(Boolean);
      const customQuestionPayload: RecruiterCustomQuestionInput[] = customQuestions.map((text) => ({
        text,
        difficulty,
      }));
      const trimmedCodingQuestion = codingQuestionText.trim();
      const codingQuestionPayload: RecruiterCustomQuestionInput[] = trimmedCodingQuestion
        ? [{ text: trimmedCodingQuestion, difficulty, language: codingLanguage, starterCode: starterCode.trim() || undefined }]
        : [];

      const created = await api.recruiterScheduleFromApplication(application.id, {
        scheduledAt,
        role,
        difficulty,
        customQuestions: customQuestionPayload,
        codingQuestions: codingQuestionPayload,
        message: messageParts.join('\n\n'),
        focusAreas: focusAreas.trim() || undefined,
        durationMinutes: durationMinutes.trim() ? parseInt(durationMinutes, 10) : undefined,
      });
      setCreatedJoinUrl(created.joinUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to schedule interview');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Schedule Interview"
      subtitle="Configure interview details and questions"
      backHref="/recruiter/applicants"
      backLabel="Applicants"
      theme="light"
    >
      <div className="space-y-6">
        {error && <p className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm font-medium text-[var(--error-text)]">{error}</p>}
        {createdJoinUrl && (
          <Card className="rounded-2xl border-[var(--success-border)] bg-[var(--success-bg)] p-5">
            <p className="text-sm font-medium text-[var(--success-text)]">Interview created successfully.</p>
            <p className="mt-2 break-all text-xs text-[var(--success-text)]">{createdJoinUrl}</p>
            <div className="mt-3">
              <Link
                href="/recruiter/applicants"
                className="inline-flex rounded-full border border-[var(--success-border)] bg-[var(--surface-light-card)] px-4 py-2 text-sm font-semibold text-[var(--success-text)]"
              >
                Back to applicants
              </Link>
            </div>
          </Card>
        )}

        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-5 shadow-sm">
          {loading ? (
            <p className="text-sm font-medium text-[var(--surface-light-muted)]">Loading application…</p>
          ) : application ? (
            <>
              <div className="mb-4">
                <p className="text-base font-semibold text-[var(--surface-light-fg)]">{application.candidate_name || 'Candidate'}</p>
                <p className="text-sm text-[var(--surface-light-muted)]">{application.candidate_email || 'No email provided'}</p>
                <p className="mt-1 text-sm text-[var(--surface-light-fg)]">
                  {application.position_title} • {application.position_role}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--surface-light-muted)]">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-2.5 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--surface-light-muted)]">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-2.5 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button
                    type="button"
                    size="md"
                    variant="secondary"
                    onClick={() => {
                      const { date, time } = getNextWeekday10();
                      setScheduleDate(date);
                      setScheduleTime(time);
                    }}
                  >
                    Suggest time (next weekday 10:00)
                  </Button>
                </div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as InterviewRole)}
                  className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-2 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={10}
                  max={240}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="Duration (minutes)"
                  className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-2 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                />
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-2 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                >
                  {difficultyOptions.map((option) => (
                    <option key={option} value={option}>
                      Difficulty: {option}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={focusAreas}
                  onChange={(e) => setFocusAreas(e.target.value)}
                  placeholder="Focus areas (e.g. APIs, system design)"
                  className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-2 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)] md:col-span-2"
                />
                <textarea
                  rows={3}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="Interview requirements (camera on, coding task, etc.)"
                  className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-2 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)] md:col-span-2"
                />
                <textarea
                  rows={6}
                  value={questionLines}
                  onChange={(e) => setQuestionLines(e.target.value)}
                  placeholder="Custom verbal questions (one per line)"
                  className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-2 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)] md:col-span-2"
                />

                {/* Coding Question — available for all roles, always asked last */}
                <div className="md:col-span-2 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-muted)] p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--accent)]">Coding Question — Last Question</p>
                      <p className="text-xs text-[var(--surface-light-muted)] mt-0.5">
                        Add one coding problem to be asked at the very end of the interview. The candidate will see a live code editor with a run/terminal panel automatically.
                      </p>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={codingQuestionText}
                    onChange={(e) => setCodingQuestionText(e.target.value)}
                    placeholder="Describe the coding problem (e.g. Write a function that returns the Fibonacci sequence up to n terms)"
                    className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-2 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      value={codingLanguage}
                      onChange={(e) => setCodingLanguage(e.target.value)}
                      className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-2 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                    >
                      <option value="javascript">Language: JavaScript</option>
                      <option value="typescript">Language: TypeScript</option>
                      <option value="python">Language: Python</option>
                      <option value="java">Language: Java</option>
                      <option value="cpp">Language: C++</option>
                      <option value="go">Language: Go</option>
                    </select>
                    <p className="flex items-center text-xs text-[var(--surface-light-muted)]">
                      Candidate writes &amp; runs code in-browser — output shown in terminal panel.
                    </p>
                  </div>
                  <textarea
                    rows={5}
                    value={starterCode}
                    onChange={(e) => setStarterCode(e.target.value)}
                    placeholder={`Starter code / function skeleton (optional)\ne.g.\nfunction fibonacci(n) {\n  // your code here\n}`}
                    className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-2 font-mono text-xs text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                  />
                  {!codingQuestionText.trim() && (
                    <p className="text-xs text-[var(--surface-light-muted)] italic">Leave blank to skip the coding question.</p>
                  )}
                  {codingQuestionText.trim() && (
                    <div className="flex items-center gap-2 rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)] px-3 py-2">
                      <svg className="w-4 h-4 text-[var(--success-text)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-xs font-medium text-[var(--success-text)]">
                        Coding question added — will be asked as the last question with the code editor shown automatically.
                      </p>
                    </div>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={candidateMessage}
                  onChange={(e) => setCandidateMessage(e.target.value)}
                  placeholder="Message for candidate email (optional)"
                  className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-2 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)] md:col-span-2"
                />
              </div>

              <div className="mt-4 flex gap-3">
                <Button size="md" disabled={submitting} onClick={() => void scheduleInterview()} className="disabled:opacity-50">
                  {submitting ? 'Scheduling…' : 'Create interview schedule'}
                </Button>
                <Button size="md" variant="secondary" href="/recruiter/applicants">
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--surface-light-muted)]">Select an application from the applicants page to schedule an interview.</p>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
