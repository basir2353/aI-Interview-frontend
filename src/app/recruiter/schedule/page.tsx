'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { RecruiterSubnav } from '@/components/layout/RecruiterSubnav';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, type RecruiterApplication, type RecruiterCustomQuestionInput } from '@/lib/api';
import type { InterviewRole, InterviewerPersona } from '@/types';

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

const INTERVIEWER_OPTIONS: { value: InterviewerPersona; label: string }[] = [
  { value: 'ethan', label: 'Ethan (default)' },
  { value: 'zara', label: 'ZaraAlex' },
];

export default function RecruiterSchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('applicationId') ?? '';

  const [loading, setLoading] = useState(true);
  const [pickerLoading, setPickerLoading] = useState(() => !applicationId);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdJoinUrl, setCreatedJoinUrl] = useState('');
  const [application, setApplication] = useState<RecruiterApplication | null>(null);
  /** When URL has no applicationId, we load these so the recruiter can pick who to schedule. */
  const [pickerApplications, setPickerApplications] = useState<RecruiterApplication[]>([]);

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
  const [interviewerPersona, setInterviewerPersona] = useState<InterviewerPersona>('ethan');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('recruiterToken') : null;
    if (!token) {
      router.replace('/recruiter/login');
      return;
    }
    if (!applicationId) {
      setError('');
      setApplication(null);
      setPickerLoading(true);
      setLoading(false);
      api
        .recruiterMe()
        .then((meRes) => {
          setInterviewerPersona(meRes.recruiter.interviewerPersona ?? 'ethan');
          return api.recruiterGetApplications();
        })
        .then((appsRes) => {
          setPickerApplications(
            appsRes.applications.filter((item) => String(item.status).toLowerCase() !== 'rejected')
          );
        })
        .catch((e) => {
          const message = e instanceof Error ? e.message : 'Failed to load applicants';
          setError(message);
          setPickerApplications([]);
        })
        .finally(() => setPickerLoading(false));
      return;
    }

    setPickerLoading(false);
    setLoading(true);
    Promise.all([api.recruiterMe(), api.recruiterGetApplications()])
      .then(([meRes, appsRes]) => {
        setInterviewerPersona(meRes.recruiter.interviewerPersona ?? 'ethan');
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
        interviewerPersona,
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
      title="Schedule interview"
      subtitle={
        applicationId
          ? 'Configure time, questions, and optional coding task for this applicant.'
          : 'Pick an applicant below, or open one from the applicants list — the URL will include their application id.'
      }
      backHref="/recruiter/applicants"
      backLabel="Applicants"
      theme="light"
    >
      <div className="space-y-6">
        <RecruiterSubnav />
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
          {!applicationId && pickerLoading ? (
            <p className="text-sm font-medium text-[var(--surface-light-muted)]">Loading applicants you can schedule…</p>
          ) : !applicationId ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-muted)] px-4 py-3 text-sm text-[var(--surface-light-fg)]">
                <p className="font-semibold text-[var(--accent)]">Schedule from an application</p>
                <p className="mt-1 text-[var(--surface-light-muted)]">
                  Interviews tied to a job application need a candidate selected. Choose someone below or use{' '}
                  <Link href="/recruiter/applicants" className="font-semibold text-[var(--accent)] underline hover:no-underline">
                    Applicants
                  </Link>{' '}
                  and click <strong>Schedule interview</strong> on their row.
                </p>
              </div>
              {pickerApplications.length === 0 ? (
                <p className="text-sm text-[var(--surface-light-muted)]">
                  No eligible applications yet. Post a job on{' '}
                  <Link href="/recruiter/jobs" className="font-semibold text-[var(--accent)] hover:underline">
                    Jobs &amp; applications
                  </Link>{' '}
                  or schedule a{' '}
                  <Link href="/recruiter#recruiter-create" className="font-semibold text-[var(--accent)] hover:underline">
                    direct interview (no application)
                  </Link>{' '}
                  from the dashboard.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--surface-light-border)] rounded-xl border border-[var(--surface-light-border)] overflow-hidden">
                  {pickerApplications.map((app) => (
                    <li
                      key={app.id}
                      className="flex flex-col gap-3 bg-[var(--surface-light-card)] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--surface-light-fg)]">{app.candidate_name || 'Candidate'}</p>
                        <p className="truncate text-sm text-[var(--surface-light-muted)]">{app.candidate_email}</p>
                        <p className="mt-1 text-sm text-[var(--surface-light-fg)]">
                          {app.position_title} <span className="text-[var(--surface-light-muted)]">· {app.position_role}</span>
                        </p>
                        <p className="mt-0.5 text-xs capitalize text-[var(--surface-light-muted)]">{String(app.status).replace(/_/g, ' ')}</p>
                      </div>
                      <Link
                        href={`/recruiter/schedule?applicationId=${encodeURIComponent(app.id)}`}
                        className="shrink-0 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90"
                      >
                        Schedule this applicant
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : loading ? (
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
                <div className="md:col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--surface-light-muted)]">AI interviewer for this slot</label>
                  <select
                    value={interviewerPersona}
                    onChange={(e) => setInterviewerPersona(e.target.value as InterviewerPersona)}
                    className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-2 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                  >
                    {INTERVIEWER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[var(--surface-light-muted)]">
                    Defaults from your profile (Ethan if unset).{' '}
                    <Link href="/recruiter/interviewer-settings" className="font-semibold text-[var(--accent)] hover:underline">
                      Change default &amp; company name
                    </Link>
                  </p>
                </div>
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
            <p className="text-sm text-[var(--surface-light-muted)]">
              This application could not be loaded. Return to{' '}
              <Link href="/recruiter/applicants" className="font-semibold text-[var(--accent)] hover:underline">
                Applicants
              </Link>
              .
            </p>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
