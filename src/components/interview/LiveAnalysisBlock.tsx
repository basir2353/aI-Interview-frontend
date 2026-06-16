'use client';

import type { EmotionLabel, FaceAnalysisState } from '@/hooks/useInterviewFaceAnalysis';

function emotionLabel(e: EmotionLabel): string {
  const labels: Record<EmotionLabel, string> = {
    neutral: 'Neutral',
    smiling: 'Smiling',
    concentrating: 'Concentrating',
    surprised: 'Surprised',
    speaking: 'Speaking',
    thinking: 'Thinking',
  };
  return labels[e] ?? 'Neutral';
}

type LiveAnalysisBlockProps = {
  faceAnalysis: FaceAnalysisState;
  modelsLoaded: boolean;
  loadError: string | null;
  waveMessageShown: boolean;
  compact?: boolean;
};

export function LiveAnalysisBlock({
  faceAnalysis,
  modelsLoaded,
  loadError,
  waveMessageShown,
  compact = false,
}: LiveAnalysisBlockProps) {
  const dotClass = compact ? 'h-1.5 w-1.5' : 'h-2 w-2';
  const textMuted = 'text-[var(--surface-light-muted)]';
  const textFg = 'text-[var(--surface-light-fg)]';

  if (loadError) {
    return (
      <div className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-3 py-2.5 shadow-sm">
        <p className={`mb-1 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Live analysis</p>
        <p className="text-xs text-[var(--error-text)]">
          Could not load face models (offline or blocked). {loadError.slice(0, 120)}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-2.5 shadow-sm">
      <p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Live analysis</p>
      {!modelsLoaded ? (
        <p className={`text-xs ${textMuted}`}>Loading face models…</p>
      ) : (
        <div className={`text-xs ${compact ? 'space-y-1' : 'space-y-1.5'}`}>
          <div className="flex items-center gap-2">
            <span
              className={`${dotClass} shrink-0 rounded-full ${
                faceAnalysis.faceDetected ? 'bg-[var(--success-text)]' : 'bg-[var(--surface-light-muted)]'
              }`}
            />
            <span className={textFg}>{faceAnalysis.faceDetected ? 'Face detected' : 'No face'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={textMuted}>Confidence:</span>
            <span className={`font-medium ${textFg}`}>{faceAnalysis.confidence}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={textMuted}>Emotion:</span>
            <span className={`capitalize ${textFg}`}>{emotionLabel(faceAnalysis.emotion)}</span>
          </div>
          {!compact && (
            <div className="flex items-center gap-2">
              <span className={textMuted}>Lips:</span>
              <span className={textFg}>
                {faceAnalysis.lipOpenness > 0.2 ? 'Active (speaking)' : 'Closed'}
              </span>
            </div>
          )}
          {waveMessageShown && (
            <p className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-muted)] px-2 py-1.5 font-medium text-[var(--accent)]">
              <span>👋</span> Wave detected — Hello!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
