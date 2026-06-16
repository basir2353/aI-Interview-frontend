'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export interface AIAvatarProps {
  /** URL path to the talking-head video (SadTalker + Wav2Lip). When set, the video is shown and autoplays. */
  videoUrl?: string | null;
  /** Optional CSS class for the wrapper. */
  className?: string;
  /** Optional name/subtitle shown below the video. */
  name?: string;
  subtitle?: string;
  /** Size hint: 'sm' for split-view, 'lg' for full-view. */
  size?: 'sm' | 'lg';
  /**
   * `card` = rounded square (legacy). `orb` = circular avatar with depth / glow — used for elegant interview UI.
   */
  presentation?: 'card' | 'orb';
  /** Shown inside the orb when there is no video (e.g. "E" for Ethan). */
  initialLetter?: string;
}

/**
 * Renders the AI interviewer as a talking-head video or a stylized orb placeholder.
 */
export function AIAvatar({
  videoUrl,
  className = '',
  name = 'Intervion AI',
  subtitle = 'AI Interviewer',
  size = 'lg',
  presentation = 'card',
  initialLetter = 'E',
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

  const isOrb = presentation === 'orb';
  /** Compact, elegant orb — smaller footprint for a refined look */
  const dim =
    size === 'sm'
      ? 'w-[112px] h-[112px] sm:w-[124px] sm:h-[124px]'
      : 'w-[158px] h-[158px] sm:w-[176px] sm:h-[176px]';
  const ringScale = size === 'sm' ? [1, 1.08, 1.14] : [1, 1.06, 1.12];

  if (isOrb) {
    return (
      <div className={`flex flex-col items-center select-none ${className}`}>
        <div className={`relative flex items-center justify-center ${dim}`}>
          {/* Depth layers behind the orb */}
          <motion.div
            className="pointer-events-none absolute inset-[-14%] rounded-full bg-gradient-to-br from-violet-500/30 via-fuchsia-500/18 to-indigo-600/20 blur-xl"
            animate={{ opacity: [0.5, 0.75, 0.5], scale: [0.97, 1.03, 0.97] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span
            className="pointer-events-none absolute inset-[-6%] rounded-full border border-violet-400/22"
            animate={{ scale: ringScale, opacity: [0.35, 0.6, 0.35] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-full border border-fuchsia-300/20"
            animate={{ scale: [1.05, 1, 1.05], opacity: [0.25, 0.45, 0.25] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          />

          <div className="relative z-10 h-full w-full overflow-hidden rounded-full border border-white/25 bg-gradient-to-br from-[var(--surface-light-card)] via-white/95 to-violet-50/90 shadow-[0_28px_60px_-12px_rgba(109,40,217,0.45),0_0_0_1px_rgba(255,255,255,0.4)_inset]">
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
              <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-100/90 via-white to-indigo-100/80">
                <motion.span
                  className={`bg-gradient-to-br from-violet-700 via-fuchsia-600 to-indigo-700 bg-clip-text font-semibold tracking-tight text-transparent ${
                    size === 'sm' ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl'
                  }`}
                  animate={{ opacity: [0.9, 1, 0.9], scale: [0.99, 1, 0.99] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  aria-hidden
                >
                  {initialLetter.slice(0, 1).toUpperCase()}
                </motion.span>
                <motion.div
                  className="pointer-events-none absolute inset-[22%] rounded-full bg-violet-400/10 blur-lg"
                  animate={{ scale: [1, 1.12, 1], opacity: [0.28, 0.5, 0.28] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            )}
          </div>
        </div>

        {(name || subtitle) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`flex items-center gap-2 rounded-full border border-[var(--accent)]/35 bg-[var(--surface-light-card)]/95 px-3 py-1 text-xs shadow-md backdrop-blur-md ${
              size === 'sm' ? 'mt-2.5' : 'mt-3'
            }`}
          >
            {name && <span className="font-semibold text-[var(--surface-light-fg)]">{name}</span>}
            {subtitle && <span className="text-[var(--surface-light-muted)]">{subtitle}</span>}
          </motion.div>
        )}
      </div>
    );
  }

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
