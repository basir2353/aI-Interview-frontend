'use client';

import { useCallback, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { InterviewDeviceCheck } from '@/components/interview/InterviewDeviceCheck';
import { useInterviewRoomTheme } from '@/hooks/useInterviewRoomTheme';

/**
 * Pre-live room: camera/mic check, then start the interview session and open the live screen.
 * The AI intro only begins after the candidate reaches the live interview UI.
 */
export default function InterviewEnterPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [cameraOn, setCameraOn] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const cameraVideoRef = useRef<HTMLVideoElement>(null);

  useInterviewRoomTheme(true);

  const handleContinue = useCallback(async () => {
    if (!token || starting) return;
    setError('');
    setStarting(true);
    try {
      const res = await api.publicStartJoin(token);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('interviewBeginLive', '1');
      }
      router.replace(`/interview/${res.interviewId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start interview');
      setStarting(false);
    }
  }, [token, starting, router]);

  return (
    <>
      {error && (
        <div className="fixed left-1/2 top-6 z-[300] w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">
          {error}
        </div>
      )}
      {starting && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl border border-white/10 bg-[var(--interview-card)] px-8 py-6 text-center shadow-lg">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[var(--interview-accent)]/20 border-t-[var(--interview-accent)]" />
            <p className="text-sm font-medium text-[var(--interview-fg)]">Opening interview room…</p>
          </div>
        </div>
      )}
      <InterviewDeviceCheck
        onNext={() => void handleContinue()}
        cameraOn={cameraOn}
        onCameraOnChange={setCameraOn}
        cameraVideoRef={cameraVideoRef}
        nextLabel="Enter interview room"
      />
      <div className="fixed bottom-4 left-1/2 z-[210] -translate-x-1/2">
        <Link href="/" className="text-xs text-white/50 hover:text-white/80">
          Cancel
        </Link>
      </div>
    </>
  );
}
