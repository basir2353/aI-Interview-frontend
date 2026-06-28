'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type AdminScheduleRow, type RecruiterApplication } from '@/lib/api';
import type { InterviewRole, InterviewerPersona, InterviewLanguageCode } from '@/types';
import {
  INTERVIEW_LANGUAGE_OPTIONS,
  DEFAULT_INTERVIEW_LANGUAGE,
  interviewLanguageLabel,
  normalizeInterviewLanguage,
} from '@/lib/interviewLanguages';
import { LanguageVoicePicker } from '@/components/recruiter/LanguageVoicePicker';
import { RecruiterShell } from '@/components/layout/RecruiterShell';
import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { DashboardLoading } from '@/components/dashboard/DashboardLoading';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatusBadge, statusToVariant } from '@/components/dashboard/StatusBadge';
import { Bot, Calendar, CheckCircle2, ClipboardList, Users } from 'lucide-react';

const ROLES: { value: InterviewRole; label: string }[] = [
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'sales', label: 'Sales' },
  { value: 'customer_success', label: 'Customer Success' },
];

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v3M16 2v3" />
      <path d="M3.5 9h17" />
      <path d="M6.5 5h11A3 3 0 0 1 20.5 8v11a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 18l6-6-6-6" />
      <path d="M8 6l-6 6 6 6" />
    </svg>
  );
}

export default function RecruiterDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<AdminScheduleRow[]>([]);
  const [applications, setApplications] = useState<RecruiterApplication[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [role, setRole] = useState<InterviewRole>('technical');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [resumeUploading, setResumeUploading] = useState(false);
  const [questionLines, setQuestionLines] = useState('');
  const [codingQuestionLines, setCodingQuestionLines] = useState('');
  const [codingLanguage, setCodingLanguage] = useState('javascript');
  const [starterCode, setStarterCode] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCodingSection, setShowCodingSection] = useState(false);
  const [recruiterCompanyName, setRecruiterCompanyName] = useState<string | null>(null);
  const [defaultInterviewerPersona, setDefaultInterviewerPersona] = useState<InterviewerPersona>('ethan');
  const [defaultInterviewLanguage, setDefaultInterviewLanguage] =
    useState<InterviewLanguageCode>(DEFAULT_INTERVIEW_LANGUAGE);
  /** Per-interview override in the create form; resets from profile when the form opens. */
  const [createInterviewerPersona, setCreateInterviewerPersona] = useState<InterviewerPersona>('ethan');
  const [createInterviewLanguage, setCreateInterviewLanguage] =
    useState<InterviewLanguageCode>(DEFAULT_INTERVIEW_LANGUAGE);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);
  const recruiterName =
    typeof window !== 'undefined' ? localStorage.getItem('recruiterName') : '';
  const recruiterEmail =
    typeof window !== 'undefined' ? localStorage.getItem('recruiterEmail') : '';

  const inputBase = useMemo(
    () =>
      'w-full rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)] placeholder-[var(--surface-light-muted)] shadow-sm transition focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]',
    []
  );

  const load = () =>
    Promise.all([api.recruiterGetSchedules(), api.recruiterGetApplications(), api.recruiterMe()]).then(
      ([schedRes, appRes, meRes]) => {
        setSchedules(schedRes.schedules);
        setApplications(appRes.applications);
        setRecruiterCompanyName(meRes.recruiter.companyName ?? null);
        setDefaultInterviewerPersona(meRes.recruiter.interviewerPersona ?? 'ethan');
        setDefaultInterviewLanguage(
          normalizeInterviewLanguage(meRes.recruiter.defaultInterviewLanguage ?? DEFAULT_INTERVIEW_LANGUAGE)
        );
      }
    );

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('recruiterToken') : null;
    if (!token) {
      router.replace('/recruiter/login');
      return;
    }
    load()
      .catch(() => {
        localStorage.removeItem('recruiterToken');
        router.replace('/recruiter/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (createOpen) {
      setCreateInterviewerPersona(defaultInterviewerPersona);
      setCreateInterviewLanguage(defaultInterviewLanguage);
    }
  }, [createOpen, defaultInterviewerPersona, defaultInterviewLanguage]);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeUploading(true);
    setError('');
    try {
      const { resumeUrl: url } = await api.publicUploadResume(file);
      setResumeUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resume upload failed');
      setResumeUrl('');
    } finally {
      setResumeUploading(false);
      e.target.value = '';
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledDate || !scheduledTime) {
      setError('Please set date and time');
      return;
    }
    setError('');
    setSubmitLoading(true);
    try {
      const scheduledAt = `${scheduledDate}T${scheduledTime}`;
      const customQuestions = questionLines
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((text) => ({ text, difficulty }));
      const codingQuestions =
        role === 'technical'
          ? codingQuestionLines
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((text) => ({
                text,
                difficulty,
                language: codingLanguage,
                starterCode: starterCode.trim() || undefined,
              }))
          : undefined;
      await api.recruiterCreateSchedule({
        candidateEmail,
        candidateName: candidateName || undefined,
        role,
        scheduledAt: new Date(scheduledAt).toISOString(),
        resumeUrl: resumeUrl.trim() || undefined,
        difficulty,
        customQuestions: customQuestions.length ? customQuestions : undefined,
        codingQuestions: codingQuestions?.length ? codingQuestions : undefined,
        interviewerPersona: createInterviewerPersona,
        interviewLanguage: createInterviewLanguage,
      });
      setCreateOpen(false);
      setCandidateEmail('');
      setCandidateName('');
      setScheduledDate('');
      setScheduledTime('');
      setResumeUrl('');
      setQuestionLines('');
      setCodingQuestionLines('');
      setStarterCode('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSubmitLoading(false);
    }
  };

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCancel = async (scheduleId: string) => {
    if (!confirm('Cancel this interview? The candidate will no longer be able to start it.')) return;
    setActionLoading(scheduleId);
    try {
      const { updated } = await api.recruiterUpdateSchedule(scheduleId, { status: 'cancelled' });
      if (updated) {
        setSchedules((prev) =>
          prev.map((s) => (s.id === scheduleId ? { ...s, status: 'cancelled' } : s))
        );
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to cancel');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Permanently delete this scheduled interview? This cannot be undone.')) return;
    setActionLoading(scheduleId);
    try {
      const { deleted } = await api.recruiterDeleteSchedule(scheduleId);
      if (deleted) {
        setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setActionLoading(null);
    }
  };

  const statusMeta = useMemo(() => {
    return {
      scheduled: { label: 'Scheduled', pill: 'bg-[var(--accent-muted)] text-[var(--accent)] ring-1 ring-[var(--surface-light-border)] font-semibold' },
      in_progress: { label: 'In progress', pill: 'bg-[var(--warning-bg)] text-[var(--warning-text)] ring-1 ring-[var(--warning-border)] font-semibold' },
      completed: { label: 'Completed', pill: 'bg-[var(--success-bg)] text-[var(--success-text)] ring-1 ring-[var(--success-border)] font-semibold' },
      cancelled: { label: 'Cancelled', pill: 'bg-[var(--accent-muted)] text-[var(--surface-light-muted)] ring-1 ring-[var(--surface-light-border)] font-semibold' },
    } as const;
  }, []);

  const upcomingSchedules = useMemo(
    () =>
      schedules.filter((s) =>
        ['scheduled', 'in_progress'].includes(String(s.status ?? '').toLowerCase())
      ),
    [schedules]
  );
  const completedSchedules = useMemo(
    () => schedules.filter((s) => String(s.status ?? '').toLowerCase() === 'completed'),
    [schedules]
  );
  const scheduledCount = useMemo(
    () => upcomingSchedules.filter((s) => String(s.status ?? '').toLowerCase() === 'scheduled').length,
    [upcomingSchedules]
  );
  const inProgressCount = useMemo(
    () => upcomingSchedules.filter((s) => String(s.status ?? '').toLowerCase() === 'in_progress').length,
    [upcomingSchedules]
  );

  const scrollToSection = useCallback((id: string, openCreate?: boolean) => {
    if (openCreate) setCreateOpen(true);
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  if (loading) {
    return <DashboardLoading message="Loading your dashboard…" />;
  }

  return (
    <RecruiterShell
      title="Dashboard"
      description={`${recruiterName || recruiterEmail || 'Recruiter'} · Schedules & outcomes`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setCreateOpen((v) => !v)} size="md">
            {createOpen ? 'Close form' : 'New interview'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <DashboardCard className="dash-feature-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--surface-light-muted)]">AI interviewer</p>
                <p className="mt-0.5 text-lg font-semibold text-[var(--surface-light-fg)]">
                  {defaultInterviewerPersona === 'zara' ? 'ZaraAlex' : 'Ethan'}
                </p>
                <p className="mt-0.5 text-sm text-[var(--surface-light-muted)]">
                  {recruiterCompanyName ? (
                    <>
                      Company:{' '}
                      <span className="font-medium text-[var(--surface-light-fg)]">{recruiterCompanyName}</span>
                    </>
                  ) : (
                    'Set your company name and default presenter for new interviews.'
                  )}
                </p>
              </div>
            </div>
            <Link
              href="/recruiter/interviewer-settings"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
            >
              Configure
            </Link>
          </div>
        </DashboardCard>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Scheduled"
            value={scheduledCount}
            hint="Awaiting candidate"
            icon={Calendar}
            onClick={() => scrollToSection('recruiter-upcoming')}
          />
          <StatCard
            label="In progress"
            value={inProgressCount}
            hint="Live interviews"
            icon={Users}
            iconColor="dash-stat-icon-amber"
            onClick={() => scrollToSection('recruiter-upcoming')}
          />
          <StatCard
            label="Applications"
            value={applications.length}
            hint="CVs & job matches"
            icon={ClipboardList}
            iconColor="dash-stat-icon-blue"
            onClick={() => scrollToSection('recruiter-applications')}
          />
          <StatCard
            label="Completed"
            value={completedSchedules.length}
            hint="Reports available"
            icon={CheckCircle2}
            iconColor="dash-stat-icon-emerald"
            onClick={() => scrollToSection('recruiter-results')}
          />
        </div>

        <section id="recruiter-create" className="scroll-mt-24">
          {!createOpen && (
            <DashboardCard>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--surface-light-fg)]">Schedule a new interview</h2>
                  <p className="mt-1 text-sm text-[var(--surface-light-muted)]">
                    Generate a link, optional custom questions, and coding tasks for technical roles.
                  </p>
                </div>
                <Button type="button" onClick={() => setCreateOpen(true)} size="md" className="shrink-0">
                  Open scheduling form
                </Button>
              </div>
            </DashboardCard>
          )}
          {createOpen && (
            <DashboardCard className="relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_300px_at_30%_-20%,var(--accent-muted),transparent_55%)]" />
              <div className="relative">
              <h2 className="text-xl font-semibold tracking-tight text-[var(--surface-light-fg)]">Create interview link</h2>
              <p className="mt-1 text-sm font-medium text-[var(--surface-light-muted)]">
                This interview is attached to your recruiter account.
              </p>

              {role === 'technical' && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowCodingSection((v) => !v)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                      showCodingSection
                        ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                        : 'border-[var(--surface-light-border)] bg-[var(--surface-light-card)] text-[var(--surface-light-fg)] hover:bg-[var(--accent-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                    }`}
                  >
                    <CodeIcon className="h-4 w-4" />
                    Code
                    <span className="text-[var(--surface-light-muted)] font-normal">
                      {showCodingSection ? ' — hide coding questions' : ' — add coding questions'}
                    </span>
                  </button>
                </div>
              )}

              <form onSubmit={handleCreate} className="mt-6 max-w-4xl space-y-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]">Candidate email *</label>
                    <input
                      type="email"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      required
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]">Candidate name</label>
                    <input
                      type="text"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      className={inputBase}
                    />
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]">Interview type</label>
                    <select
                      value={role}
                      onChange={(e) => {
                        const newRole = e.target.value as InterviewRole;
                        setRole(newRole);
                        if (newRole !== 'technical') setShowCodingSection(false);
                      }}
                      className={inputBase}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                      className={inputBase}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]">
                      Interview language
                    </label>
                    <select
                      value={createInterviewLanguage}
                      onChange={(e) => setCreateInterviewLanguage(e.target.value as InterviewLanguageCode)}
                      className={inputBase}
                    >
                      {INTERVIEW_LANGUAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-xs font-medium text-[var(--surface-light-muted)]">
                      AI questions, voice, and transcription use this language. Defaults from{' '}
                      <Link href="/recruiter/interviewer-settings" className="text-[var(--accent)] underline hover:no-underline">
                        interviewer settings
                      </Link>
                      .
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]">
                      AI interviewer for this interview
                    </label>
                    <select
                      value={createInterviewerPersona}
                      onChange={(e) => setCreateInterviewerPersona(e.target.value as InterviewerPersona)}
                      className={inputBase}
                    >
                      <option value="ethan">Ethan (default)</option>
                      <option value="zara">ZaraAlex</option>
                    </select>
                    <p className="mt-1.5 text-xs font-medium text-[var(--surface-light-muted)]">
                      Starts from your saved default when you open this form (Ethan if unset).{' '}
                      <Link href="/recruiter/interviewer-settings" className="text-[var(--accent)] underline hover:no-underline">
                        Company &amp; default interviewer
                      </Link>
                    </p>
                  </div>
                  <LanguageVoicePicker interviewLanguage={createInterviewLanguage} inputClassName={inputBase} />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]">Date *</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--surface-light-muted)]">
                        <CalendarIcon className="h-4 w-4" />
                      </div>
                      <input
                        ref={dateInputRef}
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        required
                        className={`${inputBase} ui-date pl-11 pr-11`}
                      />
                      <button
                        type="button"
                        aria-label="Open date picker"
                        onClick={() => {
                          const el = dateInputRef.current;
                          if (!el) return;
                          // Supported in Chromium; gracefully falls back to focus in other browsers.
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (el as any).showPicker?.();
                          el.focus();
                        }}
                        className="absolute inset-y-0 right-0 flex items-center rounded-r-2xl px-3 text-[var(--surface-light-muted)] transition hover:text-[var(--surface-light-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]">Time *</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--surface-light-muted)]">
                        <ClockIcon className="h-4 w-4" />
                      </div>
                      <input
                        ref={timeInputRef}
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        required
                        step={900}
                        className={`${inputBase} ui-time pl-11 pr-11 tabular-nums`}
                      />
                      <button
                        type="button"
                        aria-label="Open time picker"
                        onClick={() => {
                          const el = timeInputRef.current;
                          if (!el) return;
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (el as any).showPicker?.();
                          el.focus();
                        }}
                        className="absolute inset-y-0 right-0 flex items-center rounded-r-2xl px-3 text-[var(--surface-light-muted)] transition hover:text-[var(--surface-light-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
                      >
                        <ClockIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-[var(--surface-light-muted)]">15-minute steps.</p>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]">Candidate resume (optional)</label>
                  <p className="mb-2 text-xs text-[var(--surface-light-muted)]">If provided, the AI will analyze it and tailor questions. Used for direct interviews.</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,.txt,.md"
                      onChange={handleResumeUpload}
                      disabled={resumeUploading}
                      className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-3 py-2 text-sm text-[var(--surface-light-fg)] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--accent-muted)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[var(--accent)]"
                    />
                    {resumeUploading && <span className="text-sm text-[var(--surface-light-muted)]">Uploading…</span>}
                    {resumeUrl && <span className="text-sm font-medium text-[var(--success-text)]">Resume attached</span>}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]">Main questions (optional)</label>
                  <p className="mb-2 text-xs text-[var(--surface-light-muted)]">One question per line. AI will use these and, if resume is present, analyze it first.</p>
                  <textarea
                    rows={4}
                    value={questionLines}
                    onChange={(e) => setQuestionLines(e.target.value)}
                    placeholder={'e.g. Tell me about a project you led.\nHow do you handle conflicting priorities?'}
                    className={`${inputBase} w-full rounded-xl`}
                  />
                </div>

                {role === 'technical' && showCodingSection && (
                  <>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]">Coding questions (optional)</label>
                      <p className="mb-2 text-xs text-[var(--surface-light-muted)]">One per line. If empty, 2–3 default coding tasks will be used so the code section appears.</p>
                      <textarea
                        rows={4}
                        value={codingQuestionLines}
                        onChange={(e) => setCodingQuestionLines(e.target.value)}
                        placeholder={'e.g. Implement a function that reverses a string.\nWrite a function that checks if a string is a palindrome.'}
                        className={`${inputBase} w-full rounded-xl font-mono text-sm`}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]">Coding language</label>
                        <select
                          value={codingLanguage}
                          onChange={(e) => setCodingLanguage(e.target.value)}
                          className={inputBase}
                        >
                          <option value="javascript">JavaScript</option>
                          <option value="typescript">TypeScript</option>
                          <option value="python">Python</option>
                          <option value="java">Java</option>
                          <option value="cpp">C++</option>
                          <option value="go">Go</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]">Starter code for coding questions (optional)</label>
                      <textarea
                        rows={4}
                        value={starterCode}
                        onChange={(e) => setStarterCode(e.target.value)}
                        placeholder="function solution() {\n  // your code here\n}"
                        className={`${inputBase} w-full rounded-xl font-mono text-sm`}
                      />
                    </div>
                  </>
                )}

                {error && (
                  <p className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-2.5 text-sm text-[var(--error-text)]">
                    {error}
                  </p>
                )}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-[var(--surface-light-muted)]">The candidate will use the generated link to start the interview.</p>
                  <Button type="submit" disabled={submitLoading} className="disabled:opacity-50">
                    {submitLoading ? 'Creating…' : 'Create interview'}
                  </Button>
                </div>
              </form>
              </div>
            </DashboardCard>
          )}
        </section>

        <section id="recruiter-upcoming" className="scroll-mt-24">
        <DashboardCard
          title="Upcoming & live interviews"
          description="Scheduled and in progress. Copy the join link for the candidate."
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="dash-table-head">
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">Candidate</th>
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">Type</th>
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">AI model</th>
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">Language</th>
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">Scheduled at</th>
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">Status</th>
                  <th className="min-w-[200px] px-5 py-3 font-medium text-[var(--surface-light-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-light-border)]">
                {upcomingSchedules.map((s) => {
                    const scheduleId = s.id ?? '';
                    const status = String(s.status ?? '').toLowerCase().replace(/\s+/g, '_');
                    const meta =
                      statusMeta[status as keyof typeof statusMeta] ??
                      ({
                        label: status.replaceAll('_', ' '),
                        pill: 'bg-[var(--accent-muted)] text-[var(--surface-light-muted)] ring-1 ring-[var(--surface-light-border)] font-semibold',
                      } as const);
                    return (
                      <tr key={scheduleId} className="dash-table-row transition-colors">
                        <td className="px-5 py-3.5">
                          <div>
                            <p className="font-semibold text-[var(--surface-light-fg)]">{s.candidate_name || s.candidate_email}</p>
                            <p className="mt-0.5 text-sm text-[var(--surface-light-muted)]">{s.candidate_email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-[var(--surface-light-fg)]">{s.role}</td>
                        <td className="px-6 py-4 text-[var(--surface-light-fg)]">
                          {s.interviewerPersona === 'zara' || s.interviewer_persona === 'zara' ? 'ZaraAlex' : 'Ethan'}
                        </td>
                        <td className="px-6 py-4 text-[var(--surface-light-fg)]">
                          {interviewLanguageLabel(
                            normalizeInterviewLanguage(s.interviewLanguage ?? s.interview_language ?? DEFAULT_INTERVIEW_LANGUAGE)
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-[var(--surface-light-fg)]">{new Date(s.scheduled_at).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${meta.pill}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => copyLink(s.joinUrl, scheduleId)}
                              className="rounded-full border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-1.5 text-xs font-semibold text-[var(--surface-light-fg)] transition hover:bg-[var(--accent-muted)]"
                            >
                              {copiedId === scheduleId ? 'Copied' : 'Copy link'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancel(scheduleId)}
                              disabled={actionLoading === scheduleId}
                              className="rounded-full border border-[var(--error-border)] bg-[var(--error-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--error-text)] transition hover:opacity-90 disabled:opacity-50"
                            >
                              {actionLoading === scheduleId ? '…' : 'Cancel'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          {upcomingSchedules.length === 0 && (
            <div className="px-6 py-8 text-center text-sm font-medium text-[var(--surface-light-muted)]">
              No scheduled or in-progress interviews. Create one above or schedule from Applicants.
            </div>
          )}
        </DashboardCard>
        </section>

        <section id="recruiter-applications" className="scroll-mt-24">
        <DashboardCard
          title="Applications received"
          description="CVs received for your jobs. Match % shows how well the resume fits the job."
          action={
            <Link
              href="/recruiter/applicants"
              className="dash-btn-outline shrink-0"
            >
              View all
            </Link>
          }
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="dash-table-head">
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">Candidate</th>
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">Job</th>
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">Match</th>
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">Status</th>
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">Resume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-light-border)]">
                {applications.slice(0, 10).map((app) => (
                  <tr key={app.id} className="dash-table-row transition-colors">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-semibold text-[var(--surface-light-fg)]">{app.candidate_name || app.candidate_email || '—'}</p>
                        <p className="mt-0.5 text-sm text-[var(--surface-light-muted)]">{app.candidate_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-[var(--surface-light-fg)]">
                      {app.position_title}
                      <span className="text-[var(--surface-light-muted)]"> · {app.position_role}</span>
                    </td>
                    <td className="px-6 py-4">
                      {app.match_score != null ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                              app.match_score >= 60
                                ? 'bg-[var(--success-bg)] text-[var(--success-text)] ring-1 ring-[var(--success-border)]'
                                : app.match_score >= 35
                                  ? 'bg-[var(--warning-bg)] text-[var(--warning-text)] ring-1 ring-[var(--warning-border)]'
                                  : 'bg-[var(--accent-muted)] text-[var(--surface-light-muted)] ring-1 ring-[var(--surface-light-border)]'
                            }`}
                          >
                            {app.match_score}%
                          </span>
                          {app.match_score >= 60 && (
                            <span className="inline-flex items-center rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)] ring-1 ring-[var(--accent)]">
                              Recommended
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--surface-light-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize text-[var(--surface-light-fg)]">{app.status.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-6 py-4">
                      {app.resume_url ? (
                        <a
                          href={app.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--accent)] font-medium hover:underline"
                        >
                          View CV
                        </a>
                      ) : (
                        <span className="text-[var(--surface-light-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {applications.length === 0 && (
            <div className="px-6 py-8 text-center text-sm font-medium text-[var(--surface-light-muted)]">
              No applications yet. Post a job and share the link for candidates to apply.
            </div>
          )}
          {applications.length > 10 && (
            <div className="border-t border-[var(--surface-light-border)] px-6 py-3 text-center">
              <Link href="/recruiter/applicants" className="text-sm font-semibold text-[var(--accent)] hover:underline">
                View all {applications.length} applications →
              </Link>
            </div>
          )}
        </DashboardCard>
        </section>

        <section id="recruiter-results" className="scroll-mt-24">
        <DashboardCard
          title="Recent interview results"
          description={`${completedSchedules.length} completed total — showing the latest ${Math.min(5, completedSchedules.length)} here.`}
          action={
            <Link
              href="/recruiter/results"
              className="dash-btn-outline shrink-0"
            >
              Full results
            </Link>
          }
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="dash-table-head">
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">Candidate</th>
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">Type</th>
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">AI model</th>
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">Language</th>
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">Scheduled at</th>
                  <th className="px-5 py-3 font-medium text-[var(--surface-light-muted)]">Status</th>
                  <th className="min-w-[200px] px-5 py-3 font-medium text-[var(--surface-light-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-light-border)]">
                {completedSchedules.slice(0, 5).map((s) => {
                    const scheduleId = s.id ?? '';
                    const status = String(s.status ?? '').toLowerCase().replace(/\s+/g, '_');
                    const meta =
                      statusMeta[status as keyof typeof statusMeta] ??
                      ({
                        label: status.replaceAll('_', ' '),
                        pill: 'bg-[var(--accent-muted)] text-[var(--surface-light-muted)] ring-1 ring-[var(--surface-light-border)] font-semibold',
                      } as const);
                    return (
                      <tr key={scheduleId} className="dash-table-row transition-colors">
                        <td className="px-5 py-3.5">
                          <div>
                            <p className="font-semibold text-[var(--surface-light-fg)]">{s.candidate_name || s.candidate_email}</p>
                            <p className="mt-0.5 text-sm text-[var(--surface-light-muted)]">{s.candidate_email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-[var(--surface-light-fg)]">{s.role}</td>
                        <td className="px-6 py-4 text-[var(--surface-light-fg)]">
                          {s.interviewerPersona === 'zara' || s.interviewer_persona === 'zara' ? 'ZaraAlex' : 'Ethan'}
                        </td>
                        <td className="px-6 py-4 text-[var(--surface-light-fg)]">
                          {interviewLanguageLabel(
                            normalizeInterviewLanguage(s.interviewLanguage ?? s.interview_language ?? DEFAULT_INTERVIEW_LANGUAGE)
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-[var(--surface-light-fg)]">{new Date(s.scheduled_at).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${meta.pill}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDelete(scheduleId)}
                              disabled={actionLoading === scheduleId}
                              className="rounded-full border border-[var(--error-border)] bg-[var(--error-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--error-text)] transition hover:opacity-90 disabled:opacity-50"
                            >
                              {actionLoading === scheduleId ? '…' : 'Delete'}
                            </button>
                            {s.interview_id && (
                              <Link
                                href={`/report/${s.interview_id}`}
                                className="inline-flex items-center rounded-full border border-[var(--surface-light-border)] bg-[var(--accent-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:opacity-90"
                              >
                                View report
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          {completedSchedules.length === 0 && (
            <div className="px-6 py-12 text-center text-sm font-medium text-[var(--surface-light-muted)]">
              No completed interview results yet. When candidates finish interviews, they will appear here.
            </div>
          )}
          {completedSchedules.length > 5 && (
            <div className="border-t border-[var(--surface-light-border)] px-6 py-4 text-center">
              <Link href="/recruiter/results" className="text-sm font-semibold text-[var(--accent)] hover:underline">
                View all {completedSchedules.length} completed interviews →
              </Link>
            </div>
          )}
        </DashboardCard>
        </section>
      </div>
    </RecruiterShell>
  );
}
