'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type AdminScheduleRow, type RecruiterApplication } from '@/lib/api';
import type { InterviewRole } from '@/types';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  pickPreferredInterviewerVoice,
  readSavedVoicePreference,
  writeSavedVoicePreference,
} from '@/lib/voicePreferences';

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
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceKey, setSelectedVoiceKey] = useState('');
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
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
    Promise.all([api.recruiterGetSchedules(), api.recruiterGetApplications()]).then(([schedRes, appRes]) => {
      setSchedules(schedRes.schedules);
      setApplications(appRes.applications);
    });

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
        router.replace('/recruiter/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const keyForVoice = (voice: SpeechSynthesisVoice) => `${voice.name}||${voice.lang}`;
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (!available.length) return;
      setVoices(available);

      const saved = readSavedVoicePreference();
      const savedVoice = saved
        ? available.find((v) => v.name === saved.name && (!saved.lang || v.lang === saved.lang))
        : null;
      const fallback = pickPreferredInterviewerVoice(available);
      const selected = savedVoice || fallback;
      if (selected) setSelectedVoiceKey(keyForVoice(selected));
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('recruiterToken');
    localStorage.removeItem('recruiterEmail');
    localStorage.removeItem('recruiterName');
    router.replace('/recruiter/login');
  };

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

  const handleVoiceChange = (value: string) => {
    setSelectedVoiceKey(value);
    const [name, lang] = value.split('||');
    const selected = voices.find((v) => v.name === name && v.lang === lang);
    writeSavedVoicePreference(selected ?? null);
  };

  const handleVoicePreview = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const [name, lang] = selectedVoiceKey.split('||');
    const selected = voices.find((v) => v.name === name && v.lang === lang);
    if (!selected) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      'Hello, I am your interviewer. Let us begin with the first question.'
    );
    utterance.voice = selected;
    utterance.lang = selected.lang || 'en-US';
    utterance.rate = 0.96;
    utterance.pitch = 1.03;
    utterance.volume = 1;
    utterance.onstart = () => setIsPreviewingVoice(true);
    utterance.onend = () => setIsPreviewingVoice(false);
    utterance.onerror = () => setIsPreviewingVoice(false);
    window.speechSynthesis.speak(utterance);
  };

  const statusMeta = useMemo(() => {
    return {
      scheduled: { label: 'Scheduled', pill: 'bg-[var(--accent-muted)] text-[var(--accent)] ring-1 ring-[var(--surface-light-border)] font-semibold' },
      in_progress: { label: 'In progress', pill: 'bg-[var(--warning-bg)] text-[var(--warning-text)] ring-1 ring-[var(--warning-border)] font-semibold' },
      completed: { label: 'Completed', pill: 'bg-[var(--success-bg)] text-[var(--success-text)] ring-1 ring-[var(--success-border)] font-semibold' },
      cancelled: { label: 'Cancelled', pill: 'bg-[var(--accent-muted)] text-[var(--surface-light-muted)] ring-1 ring-[var(--surface-light-border)] font-semibold' },
    } as const;
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-light)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)]/20 border-t-[var(--accent)]" />
          <p className="text-sm font-medium text-[var(--surface-light-muted)]">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      title="Recruiter Dashboard"
      subtitle={recruiterName || recruiterEmail || 'Recruiter'}
      backHref="/"
      backLabel="Home"
      theme="light"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setCreateOpen((v) => !v)} size="md">
            {createOpen ? 'Close' : 'New interview'}
          </Button>
          <Button onClick={handleLogout} variant="secondary" size="md">
            Logout
          </Button>
        </div>
      }
    >
      <div className="space-y-6 sm:space-y-10">
        {createOpen && (
          <Card className="relative overflow-hidden rounded-2xl p-4 sm:rounded-3xl sm:p-7">
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
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]">Interviewer voice</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedVoiceKey}
                        onChange={(e) => handleVoiceChange(e.target.value)}
                        disabled={voices.length === 0}
                        className={`${inputBase} disabled:bg-[var(--accent-muted)]`}
                      >
                        {voices.length === 0 ? (
                          <option value="">Loading voices…</option>
                        ) : (
                          voices.map((voice) => {
                            const key = `${voice.name}||${voice.lang}`;
                            return (
                              <option key={key} value={key}>
                                {voice.name} ({voice.lang})
                              </option>
                            );
                          })
                        )}
                      </select>
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={handleVoicePreview}
                        disabled={!selectedVoiceKey || isPreviewingVoice}
                      >
                        {isPreviewingVoice ? 'Playing…' : 'Preview'}
                      </Button>
                    </div>
                  </div>
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
          </Card>
        )}

        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-0 shadow-sm">
          <div className="border-b border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-4 sm:px-6">
            <h3 className="font-semibold text-[var(--surface-light-fg)]">Scheduled interviews</h3>
            <p className="mt-0.5 text-sm font-medium text-[var(--surface-light-muted)]">
              Upcoming and in-progress. Copy the link for the candidate to join.
            </p>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--surface-light-border)] bg-[var(--accent-muted)]">
                  <th className="px-6 py-4 font-semibold text-[var(--surface-light-fg)]">Candidate</th>
                  <th className="px-6 py-4 font-semibold text-[var(--surface-light-fg)]">Type</th>
                  <th className="px-6 py-4 font-semibold text-[var(--surface-light-fg)]">Scheduled at</th>
                  <th className="px-6 py-4 font-semibold text-[var(--surface-light-fg)]">Status</th>
                  <th className="min-w-[200px] px-6 py-4 font-semibold text-[var(--surface-light-fg)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-light-border)]">
                {schedules
                  .filter(
                    (s) =>
                      String(s.status ?? '').toLowerCase() === 'scheduled' ||
                      String(s.status ?? '').toLowerCase() === 'in_progress'
                  )
                  .map((s) => {
                    const scheduleId = s.id ?? '';
                    const status = String(s.status ?? '').toLowerCase().replace(/\s+/g, '_');
                    const meta =
                      statusMeta[status as keyof typeof statusMeta] ??
                      ({
                        label: status.replaceAll('_', ' '),
                        pill: 'bg-[var(--accent-muted)] text-[var(--surface-light-muted)] ring-1 ring-[var(--surface-light-border)] font-semibold',
                      } as const);
                    return (
                      <tr key={scheduleId} className="transition-colors hover:bg-[var(--accent-muted)]/60">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-[var(--surface-light-fg)]">{s.candidate_name || s.candidate_email}</p>
                            <p className="mt-0.5 text-sm text-[var(--surface-light-muted)]">{s.candidate_email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-[var(--surface-light-fg)]">{s.role}</td>
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
          {schedules.filter((s) => ['scheduled', 'in_progress'].includes(String(s.status ?? '').toLowerCase())).length === 0 && (
            <div className="px-6 py-8 text-center text-sm font-medium text-[var(--surface-light-muted)]">
              No scheduled or in-progress interviews. Create one above or schedule from Applicants.
            </div>
          )}
        </Card>

        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-0 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-4 sm:px-6">
            <div>
              <h3 className="font-semibold text-[var(--surface-light-fg)]">Applications received</h3>
              <p className="mt-0.5 text-sm font-medium text-[var(--surface-light-muted)]">
                CVs received for your jobs. Match % shows how well the resume fits the job.
              </p>
            </div>
            <Link
              href="/recruiter/applicants"
              className="rounded-xl border border-[var(--accent)] bg-[var(--accent-muted)] px-4 py-2 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
            >
              View all applicants
            </Link>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--surface-light-border)] bg-[var(--accent-muted)]">
                  <th className="px-6 py-4 font-semibold text-[var(--surface-light-fg)]">Candidate</th>
                  <th className="px-6 py-4 font-semibold text-[var(--surface-light-fg)]">Job</th>
                  <th className="px-6 py-4 font-semibold text-[var(--surface-light-fg)]">Match</th>
                  <th className="px-6 py-4 font-semibold text-[var(--surface-light-fg)]">Status</th>
                  <th className="px-6 py-4 font-semibold text-[var(--surface-light-fg)]">Resume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-light-border)]">
                {applications.slice(0, 10).map((app) => (
                  <tr key={app.id} className="transition-colors hover:bg-[var(--accent-muted)]/60">
                    <td className="px-6 py-4">
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
        </Card>

        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-0 shadow-sm">
          <div className="border-b border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-6 py-4">
            <h3 className="font-semibold text-[var(--surface-light-fg)]">Interview results</h3>
            <p className="mt-0.5 text-sm font-medium text-[var(--surface-light-muted)]">
              {(() => {
                const completed = schedules.filter(
                  (s) => String(s.status ?? '').toLowerCase() === 'completed'
                );
                return `${completed.length} completed interview${completed.length !== 1 ? 's' : ''}`;
              })()}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--surface-light-border)] bg-[var(--accent-muted)]">
                  <th className="px-6 py-4 font-semibold text-[var(--surface-light-fg)]">Candidate</th>
                  <th className="px-6 py-4 font-semibold text-[var(--surface-light-fg)]">Type</th>
                  <th className="px-6 py-4 font-semibold text-[var(--surface-light-fg)]">Scheduled at</th>
                  <th className="px-6 py-4 font-semibold text-[var(--surface-light-fg)]">Status</th>
                  <th className="min-w-[200px] px-6 py-4 font-semibold text-[var(--surface-light-fg)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-light-border)]">
                {schedules
                  .filter((s) => String(s.status ?? '').toLowerCase() === 'completed')
                  .map((s) => {
                    const scheduleId = s.id ?? '';
                    const status = String(s.status ?? '').toLowerCase().replace(/\s+/g, '_');
                    const meta =
                      statusMeta[status as keyof typeof statusMeta] ??
                      ({
                        label: status.replaceAll('_', ' '),
                        pill: 'bg-[var(--accent-muted)] text-[var(--surface-light-muted)] ring-1 ring-[var(--surface-light-border)] font-semibold',
                      } as const);
                    return (
                      <tr key={scheduleId} className="transition-colors hover:bg-[var(--accent-muted)]/60">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-[var(--surface-light-fg)]">{s.candidate_name || s.candidate_email}</p>
                            <p className="mt-0.5 text-sm text-[var(--surface-light-muted)]">{s.candidate_email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-[var(--surface-light-fg)]">{s.role}</td>
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
          {schedules.filter((s) => String(s.status ?? '').toLowerCase() === 'completed').length === 0 && (
            <div className="px-6 py-12 text-center text-sm font-medium text-[var(--surface-light-muted)]">
              No completed interview results yet. When candidates finish interviews, they will appear here.
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
