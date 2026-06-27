'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type PublicJoinInfo } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { IntervionLogo } from '@/components/ui/IntervionLogo';

const AUTO_ENTER_DELAY_MS = 800;

export default function JoinInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [info, setInfo] = useState<PublicJoinInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const autoEnterDoneRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    api.publicGetJoinInfo(token)
      .then(setInfo)
      .catch((e) => setError(e instanceof Error ? e.message : 'Invalid link'))
      .finally(() => setLoading(false));
  }, [token]);

  const goToInterviewRoom = () => {
    if (!token) return;
    if (info?.interviewId && info.status === 'in_progress') {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('interviewBeginLive', '1');
      }
      router.push(`/interview/${info.interviewId}`);
      return;
    }
    router.push(`/interview/enter/${token}`);
  };

  // After join info loads, send candidate to device-check / live entry (no AI until live screen).
  useEffect(() => {
    if (!info || loading || error || autoEnterDoneRef.current) return;
    if (info.alreadyCompleted || info.status === 'cancelled') return;
    autoEnterDoneRef.current = true;
    const t = setTimeout(() => {
      goToInterviewRoom();
    }, AUTO_ENTER_DELAY_MS);
    return () => clearTimeout(t);
  }, [info, loading, error, token]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-dark">
        <IntervionLogo variant="on-dark" className="h-8" />
        <p className="text-gray-400">Loading…</p>
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-gradient-dark">
        <IntervionLogo variant="on-dark" className="mb-6 h-8" />
        <p className="mb-2 text-lg text-[var(--error-text)]">{error}</p>
        <p className="mb-4 text-sm text-gray-500">This link may be invalid or the interview may have been cancelled.</p>
        <Link href="/" className="text-primary-400 hover:underline">Go to home</Link>
      </div>
    );
  }

  if (info?.alreadyCompleted && info.interviewId) {
    return (
      <AppShell title="Interview complete" backHref="/" backLabel="Home">
        <div className="mx-auto max-w-xl text-center">
          <p className="mb-6 text-gray-300">You have already completed this interview.</p>
          <Link
            href={`/report/${info.interviewId}`}
            className="inline-block rounded-xl bg-[var(--accent)] px-6 py-3 font-medium text-white hover:opacity-90"
          >
            View your report
          </Link>
        </div>
      </AppShell>
    );
  }

  if (info?.status === 'cancelled') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-gradient-dark">
        <p className="mb-4 text-lg text-[var(--warning-text)]">This interview was cancelled.</p>
        <Link href="/" className="text-primary-400 hover:underline">Go to home</Link>
      </div>
    );
  }

  return (
    <AppShell title="Your interview" backHref="/" backLabel="Home">
      <div className="mx-auto max-w-xl">
        <div className="glass-card rounded-2xl border border-white/10 p-8 text-center shadow-card">
          <h2 className="mb-2 text-2xl font-semibold text-white">Interview scheduled</h2>
          <p className="mb-6 text-gray-400">
            {info?.candidateName ? `${info.candidateName}, ` : ''}
            your {info?.role ?? 'interview'} interview is scheduled for:
          </p>
          <p className="mb-8 text-lg text-gray-200">
            {info?.scheduledAt ? new Date(info.scheduledAt).toLocaleString() : '—'}
          </p>
          <p className="mb-8 text-sm text-gray-400">
            Opening the interview room… You will enter the live screen first, then your AI interviewer will begin.
          </p>
          {error && <p className="mb-4 text-sm text-[var(--error-text)]">{error}</p>}
          <button
            type="button"
            onClick={goToInterviewRoom}
            className="rounded-xl px-8 py-4 text-lg font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white/50"
            style={{ backgroundColor: 'var(--accent, #6366f1)' }}
          >
            Enter interview room
          </button>
        </div>
      </div>
    </AppShell>
  );
}
