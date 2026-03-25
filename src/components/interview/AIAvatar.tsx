'use client';

import { useEffect, useRef } from 'react';

export interface AIAvatarProps {
  /** URL path to the talking-head video (SadTalker + Wav2Lip). When set, the video is shown and autoplays. */
  videoUrl?: string | null;
  /** Static image shown when no video is available (realistic interviewer face, not cartoon). e.g. /avatars/interviewer.png */
  defaultImageUrl?: string;
  /** Optional CSS class for the wrapper. */
  className?: string;
  /** Optional name/subtitle shown below the video. */
  name?: string;
  subtitle?: string;
  /** Size hint: 'sm' for split-view, 'lg' for full-view. */
  size?: 'sm' | 'lg';
}

/**
 * Renders the AI interviewer as a talking-head video (SadTalker + Wav2Lip + Coqui TTS).
 * When videoUrl is set, the HTML5 video autoplays so the avatar "speaks" the AI question.
 * When videoUrl is absent, renders a placeholder so the layout is stable.
 */
export function AIAvatar({
  videoUrl,
  className = '',
  name = 'Intervion AI',
  subtitle = 'AI Interviewer',
  size = 'lg',
}: AIAvatarProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;
    if (prevUrlRef.current === videoUrl) return;
    prevUrlRef.current = videoUrl;
    const el = videoRef.current;
    el.currentTime = 0;
    el.load();
    el.play().catch(() => {
      // Autoplay may be blocked; user can tap to play
    });
  }, [videoUrl]);

  const sizeClass = size === 'sm' ? 'max-w-[200px] aspect-square' : 'max-w-[320px] aspect-square';

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <div
        className={`relative overflow-hidden rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] shadow-xl ${sizeClass}`}
      >
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="h-full w-full object-cover"
            playsInline
            muted={false}
            controls
            aria-label="AI interviewer speaking"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--background)] text-[var(--surface-light-muted)] text-sm">
            <span>Preparing question…</span>
          </div>
        )}
      </div>
      {(name || subtitle) && (
        <div className="mt-2 flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--surface-light-card)] px-3 py-1 text-xs shadow-sm">
          {name && <span className="font-semibold text-[var(--surface-light-fg)]">{name}</span>}
          {subtitle && <span className="text-[var(--surface-light-muted)]">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
