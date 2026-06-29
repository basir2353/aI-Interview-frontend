'use client';

type VoicePipelinePhase = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking';

interface InterviewStatusBarProps {
  phase: VoicePipelinePhase;
  micOn: boolean;
  detail?: string;
  /** Warm human label (overrides default English labels). */
  statusLabel?: string;
}

const LABELS: Record<VoicePipelinePhase, string> = {
  idle: 'Your turn',
  listening: 'Listening…',
  transcribing: 'One moment…',
  thinking: 'One moment…',
  speaking: 'Interviewer speaking…',
};

export function InterviewStatusBar({ phase, micOn, detail, statusLabel }: InterviewStatusBarProps) {
  const isActivelyListening = phase === 'listening' && micOn;
  const displayPhase: VoicePipelinePhase = isActivelyListening ? 'listening' : phase === 'listening' ? 'idle' : phase;
  const label = statusLabel ?? LABELS[displayPhase];
  const showPulse =
    isActivelyListening || phase === 'thinking' || phase === 'transcribing';

  return (
    <div className="rounded-2xl border border-[var(--interview-border)] bg-[var(--interview-card)] px-4 py-3 shadow-[var(--interview-shadow)] transition-all duration-300">
      <div className="flex items-center gap-3">
        <span
          className={`relative flex h-2.5 w-2.5 shrink-0 rounded-full ${
            micOn ? 'bg-emerald-500' : 'bg-[var(--interview-muted)]'
          }`}
          aria-hidden
        >
          {showPulse && (
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--interview-fg)]">{label}</p>
          {detail && (
            <p className="mt-0.5 line-clamp-2 text-xs text-[var(--interview-muted)]">{detail}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export type { VoicePipelinePhase };
