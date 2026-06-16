'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { VideoPreview } from '@/components/VideoPreview';
import { useTheme } from '@/context/ThemeContext';

type InterviewDeviceCheckProps = {
  onNext: () => void;
  cameraOn: boolean;
  onCameraOnChange: (v: boolean) => void;
  cameraVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
  onVideoReady?: () => void;
};

/**
 * Pre-interview step: elegant mic + camera check before entering the room.
 */
export function InterviewDeviceCheck({
  onNext,
  cameraOn,
  onCameraOnChange,
  cameraVideoRef,
  onVideoReady,
}: InterviewDeviceCheckProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [micLevel, setMicLevel] = useState(0);
  const [micError, setMicError] = useState('');
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let cancelled = false;

    const run = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) return;
        ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.65;
        source.connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i]!;
          const avg = sum / buf.length / 255;
          setMicLevel(avg);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        setMicError('Allow microphone access to verify your audio.');
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
    };
  }, []);

  const barWidth = `${Math.min(100, 12 + micLevel * 220)}%`;

  const shell = isLight
    ? 'bg-[var(--surface-light)] text-[var(--surface-light-fg)]'
    : 'bg-[#0c0a12] text-white';

  return (
    <div className={`fixed inset-0 z-[200] flex min-h-screen flex-col overflow-hidden ${shell}`}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {isLight ? (
          <>
            <div className="absolute -left-1/4 top-[-20%] h-[70vh] w-[70vh] rounded-full bg-violet-400/20 blur-[120px]" />
            <div className="absolute -right-1/4 bottom-[-10%] h-[60vh] w-[60vh] rounded-full bg-fuchsia-400/15 blur-[100px]" />
            <div className="absolute left-1/2 top-1/2 h-[40vh] w-[40vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/10 blur-[80px]" />
          </>
        ) : (
          <>
            <div className="absolute -left-1/4 top-[-20%] h-[70vh] w-[70vh] rounded-full bg-violet-600/25 blur-[120px]" />
            <div className="absolute -right-1/4 bottom-[-10%] h-[60vh] w-[60vh] rounded-full bg-fuchsia-500/20 blur-[100px]" />
            <div className="absolute left-1/2 top-1/2 h-[40vh] w-[40vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[80px]" />
          </>
        )}
      </div>

      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`relative z-10 border-b px-6 py-5 backdrop-blur-md ${
          isLight ? 'border-[var(--surface-light-border)] bg-[var(--surface-light-card)]/80' : 'border-white/10'
        }`}
      >
        <p
          className={`text-xs font-semibold uppercase tracking-[0.2em] ${
            isLight ? 'text-[var(--accent)]' : 'text-violet-300/90'
          }`}
        >
          Intervion
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Check your camera &amp; microphone</h1>
        <p className={`mt-2 max-w-xl text-sm ${isLight ? 'text-[var(--surface-light-muted)]' : 'text-white/60'}`}>
          We&apos;ll use your mic for answers and your camera for a comfortable, natural interview. Adjust lighting if needed, then continue.
        </p>
      </motion.header>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10 sm:flex-row sm:items-stretch sm:py-14">
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-1 flex-col"
        >
          <div
            className={`mb-3 flex items-center gap-2 text-sm font-medium ${
              isLight ? 'text-[var(--surface-light-fg)]' : 'text-white/80'
            }`}
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.55)]" />
            Camera preview
          </div>
          <div
            className={`relative flex min-h-[320px] flex-1 overflow-hidden rounded-2xl border shadow-[0_24px_80px_-20px_rgba(0,0,0,0.2)] backdrop-blur-xl ${
              isLight
                ? 'border-[var(--surface-light-border)] bg-[var(--surface-light-card)]'
                : 'border-white/15 bg-white/[0.04] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.65)]'
            }`}
          >
            <VideoPreview
              compact={false}
              active={cameraOn}
              onActiveChange={onCameraOnChange}
              videoRef={cameraVideoRef}
              onVideoReady={onVideoReady}
            />
            {!cameraOn && (
              <p
                className={`pointer-events-none absolute bottom-4 left-4 right-4 text-center text-xs ${
                  isLight ? 'text-[var(--surface-light-muted)]' : 'text-white/50'
                }`}
              >
                Turn the camera on to preview your frame
              </p>
            )}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-1 flex-col justify-between"
        >
          <div>
            <div
              className={`mb-3 flex items-center gap-2 text-sm font-medium ${
                isLight ? 'text-[var(--surface-light-fg)]' : 'text-white/80'
              }`}
            >
              <span className="flex h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.45)]" />
              Microphone
            </div>
            <div
              className={`rounded-2xl border p-6 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.15)] backdrop-blur-xl ${
                isLight
                  ? 'border-[var(--surface-light-border)] bg-[var(--surface-light-card)]'
                  : 'border-white/15 bg-white/[0.04] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.5)]'
              }`}
            >
              <p className={`text-sm ${isLight ? 'text-[var(--surface-light-muted)]' : 'text-white/55'}`}>
                Speak at a normal volume. The meter should move when you talk.
              </p>
              <div
                className={`mt-5 h-3 overflow-hidden rounded-full ring-1 ${
                  isLight ? 'bg-violet-100 ring-[var(--surface-light-border)]' : 'bg-black/40 ring-white/10'
                }`}
              >
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600"
                  animate={{ width: barWidth }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                />
              </div>
              {micError ? (
                <p className={`mt-3 text-xs ${isLight ? 'text-[var(--warning-text)]' : 'text-amber-300/90'}`}>{micError}</p>
              ) : (
                <p className={`mt-3 text-xs ${isLight ? 'text-[var(--surface-light-muted-soft)]' : 'text-white/40'}`}>
                  Mic test uses a short live check and stops when you leave this screen.
                </p>
              )}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.45 }}
            className="mt-8 sm:mt-0"
          >
            <button
              type="button"
              onClick={onNext}
              className={`group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 text-base font-semibold text-white shadow-[0_16px_40px_-12px_rgba(139,92,246,0.55)] transition hover:shadow-[0_20px_50px_-12px_rgba(192,132,252,0.4)] focus:outline-none focus:ring-2 focus:ring-violet-400/80 focus:ring-offset-2 ${
                isLight ? 'focus:ring-offset-[var(--surface-light)]' : 'focus:ring-offset-[#0c0a12]'
              }`}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Next
                <svg className="h-5 w-5 transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              <div className="absolute inset-0 -translate-x-full bg-white/20 transition duration-700 ease-out group-hover:translate-x-full" />
            </button>
          </motion.div>
        </motion.section>
      </div>
    </div>
  );
}
