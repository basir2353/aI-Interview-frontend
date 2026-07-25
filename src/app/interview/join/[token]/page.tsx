'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type PrepQuestion, type PublicJoinInfo } from '@/lib/api';
import { IntervionLogo } from '@/components/ui/IntervionLogo';

function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function roleLabel(role?: string): string {
  if (!role) return 'Interview';
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function JoinInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [info, setInfo] = useState<PublicJoinInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshInfo = useCallback(async () => {
    if (!token) return;
    try {
      const next = await api.publicGetJoinInfo(token);
      setInfo(next);
      setSecondsLeft(next.secondsUntilStart ?? 0);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid link');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refreshInfo();
  }, [refreshInfo]);

  // Live countdown from server secondsUntilStart, then re-fetch near zero.
  useEffect(() => {
    if (!info || info.alreadyCompleted || info.status === 'cancelled') return;
    if (info.canStart) return;

    const tick = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = Math.max(0, prev - 1);
        if (next <= 0) {
          void refreshInfo();
        }
        return next;
      });
    }, 1000);

    pollRef.current = setInterval(() => {
      void refreshInfo();
    }, 30000);

    return () => {
      clearInterval(tick);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [info?.canStart, info?.alreadyCompleted, info?.status, refreshInfo]);

  const prepQuestions: PrepQuestion[] = useMemo(
    () => info?.prepQuestions?.filter((q) => q.text?.trim()) ?? [],
    [info?.prepQuestions]
  );

  const currentQuestion = prepQuestions[pageIndex] ?? null;
  const totalPages = Math.max(1, prepQuestions.length);

  const turnPage = (dir: -1 | 1) => {
    if (prepQuestions.length === 0 || flipping) return;
    setFlipping(true);
    setTimeout(() => {
      setPageIndex((i) => {
        const next = i + dir;
        if (next < 0) return prepQuestions.length - 1;
        if (next >= prepQuestions.length) return 0;
        return next;
      });
      setFlipping(false);
    }, 220);
  };

  const goToInterviewRoom = () => {
    if (!token || !info?.canStart) return;
    if (info.interviewId && info.status === 'in_progress') {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('interviewBeginLive', '1');
      }
      router.push(`/interview/${info.interviewId}`);
      return;
    }
    router.push(`/interview/enter/${token}`);
  };

  // Auto-enter only when the interview window is open.
  useEffect(() => {
    if (!info?.canStart || loading || error) return;
    if (info.alreadyCompleted || info.status === 'cancelled') return;
    const t = setTimeout(() => goToInterviewRoom(), 1200);
    return () => clearTimeout(t);
  }, [info?.canStart, loading, error, info?.alreadyCompleted, info?.status]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0f1419]">
        <IntervionLogo variant="on-dark" className="h-8" />
        <p className="text-sm text-white/50">Loading your interview…</p>
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-[#0f1419]">
        <IntervionLogo variant="on-dark" className="mb-6 h-8" />
        <p className="mb-2 text-lg text-rose-300">{error}</p>
        <p className="mb-4 text-sm text-white/45">This link may be invalid or cancelled.</p>
        <Link href="/" className="text-sky-300 hover:underline">
          Go to home
        </Link>
      </div>
    );
  }

  if (info?.alreadyCompleted && info.interviewId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-[#0f1419]">
        <IntervionLogo variant="on-dark" className="mb-6 h-8" />
        <p className="mb-6 text-white/70">You have already completed this interview.</p>
        <Link
          href={`/report/${info.interviewId}`}
          className="rounded-xl bg-sky-600 px-6 py-3 font-medium text-white hover:bg-sky-500"
        >
          View your report
        </Link>
      </div>
    );
  }

  if (info?.status === 'cancelled') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-[#0f1419]">
        <p className="mb-4 text-lg text-amber-300">This interview was cancelled.</p>
        <Link href="/" className="text-sky-300 hover:underline">
          Go to home
        </Link>
      </div>
    );
  }

  const waiting = !info?.canStart;
  const scheduledLabel = info?.scheduledAt
    ? new Date(info.scheduledAt).toLocaleString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f1419] text-[#e8e4d9]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(56, 120, 180, 0.35), transparent), radial-gradient(ellipse 60% 40% at 90% 80%, rgba(120, 80, 40, 0.2), transparent)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <IntervionLogo variant="on-dark" className="h-7" />
        <p className="text-xs tracking-wide text-white/40">Preparation room</p>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-2 sm:px-6 lg:flex-row lg:items-start lg:gap-10">
        {/* Left: status + countdown */}
        <section className="w-full shrink-0 lg:max-w-sm">
          <p className="mb-2 font-serif text-sm italic text-amber-200/70">Before you begin</p>
          <h1
            className="mb-3 text-3xl leading-tight text-white sm:text-4xl"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {waiting ? 'Your interview opens soon' : 'You are ready to enter'}
          </h1>
          <p className="mb-6 text-sm leading-relaxed text-white/55">
            {info?.candidateName ? `Hi ${info.candidateName}. ` : ''}
            {waiting
              ? 'Use this time to warm up with the practice book on the right. You can start once the scheduled time arrives (up to 5 minutes early).'
              : 'Your interview window is open. Continue to device check, then meet your AI interviewer.'}
          </p>

          <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-white/40">Scheduled</dt>
                <dd className="mt-0.5 font-medium text-white/90">{scheduledLabel}</dd>
              </div>
              {(info?.positionTitle || info?.companyName) && (
                <div>
                  <dt className="text-white/40">Role</dt>
                  <dd className="mt-0.5 text-white/90">
                    {info.positionTitle || roleLabel(info.role)}
                    {info.companyName ? ` · ${info.companyName}` : ''}
                  </dd>
                </div>
              )}
              {!info?.positionTitle && (
                <div>
                  <dt className="text-white/40">Interview type</dt>
                  <dd className="mt-0.5 capitalize text-white/90">{roleLabel(info?.role)}</dd>
                </div>
              )}
              {info?.durationMinutes != null && (
                <div>
                  <dt className="text-white/40">Duration</dt>
                  <dd className="mt-0.5 text-white/90">About {info.durationMinutes} minutes</dd>
                </div>
              )}
            </dl>
          </div>

          {waiting ? (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-200/70">Opens in</p>
              <p
                className="mt-1 text-4xl tabular-nums text-amber-100"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                {formatCountdown(secondsLeft)}
              </p>
              <p className="mt-2 text-xs text-amber-100/50">
                Start unlocks at the scheduled time (5‑minute early window).
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={goToInterviewRoom}
              className="w-full rounded-xl bg-sky-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-sky-900/40 transition hover:bg-sky-500"
            >
              Enter interview room
            </button>
          )}
        </section>

        {/* Right: book */}
        <section className="min-w-0 flex-1">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2
                className="text-xl text-white"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                Practice book
              </h2>
              <p className="text-xs text-white/40">
                Related questions to rehearse out loud — not the live interview script.
              </p>
            </div>
            <p className="text-xs tabular-nums text-white/35">
              {prepQuestions.length ? `${pageIndex + 1} / ${totalPages}` : '—'}
            </p>
          </div>

          <div className="relative mx-auto max-w-xl">
            {/* Book shadow / spine */}
            <div className="absolute -bottom-3 left-4 right-4 h-6 rounded-b-xl bg-black/40 blur-md" />
            <div
              className={`relative overflow-hidden rounded-r-md rounded-l-sm border border-[#c4b59a]/30 bg-[#f3ead7] text-[#2a2418] shadow-[0_20px_50px_rgba(0,0,0,0.45)] transition duration-200 ${
                flipping ? 'scale-[0.985] opacity-80' : 'scale-100 opacity-100'
              }`}
              style={{
                minHeight: 360,
                backgroundImage:
                  'linear-gradient(90deg, rgba(90,60,30,0.12) 0px, rgba 14px), linear-gradient(180deg, #f7f0e0 0%, #efe4cc 100%)',
              }}
            >
              <div className="absolute bottom-0 left-0 top-0 w-3 bg-gradient-to-r from-[#8b6914]/35 to-transparent" />
              <div className="relative flex h-full min-h-[360px] flex-col px-8 py-8 sm:px-10">
                <p className="mb-1 text-[11px] uppercase tracking-[0.25em] text-[#8a7355]">
                  {currentQuestion?.topic || roleLabel(info?.role)}
                </p>
                {currentQuestion?.difficulty && currentQuestion.difficulty !== 'info' && (
                  <p className="mb-4 text-[11px] capitalize text-[#a08b6a]">
                    {currentQuestion.difficulty} · practice
                  </p>
                )}
                <p
                  className="flex-1 text-lg leading-relaxed sm:text-xl"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {currentQuestion?.text ||
                    'Practice questions will appear here once your schedule loads.'}
                </p>
                <div className="mt-8 flex items-center justify-between border-t border-[#c4b59a]/40 pt-4">
                  <button
                    type="button"
                    onClick={() => turnPage(-1)}
                    disabled={!prepQuestions.length}
                    className="rounded-lg px-3 py-2 text-sm text-[#5c4a32] transition hover:bg-[#e6d9c0] disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <span className="text-[11px] text-[#9a8568]">Turn the page to prepare</span>
                  <button
                    type="button"
                    onClick={() => turnPage(1)}
                    disabled={!prepQuestions.length}
                    className="rounded-lg px-3 py-2 text-sm text-[#5c4a32] transition hover:bg-[#e6d9c0] disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          </div>

          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {prepQuestions.slice(0, 6).map((q, i) => (
              <li key={`${i}-${q.text.slice(0, 24)}`}>
                <button
                  type="button"
                  onClick={() => setPageIndex(i)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                    i === pageIndex
                      ? 'border-amber-400/40 bg-amber-400/10 text-amber-50'
                      : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white/70'
                  }`}
                >
                  <span className="line-clamp-2">{q.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
