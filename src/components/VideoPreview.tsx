'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoPreviewProps {
  /** Compact Meet-style self-view (floating tile with indicators) */
  compact?: boolean;
  /** Controlled: camera on/off */
  active?: boolean;
  /** Controlled: callback when user toggles */
  onActiveChange?: (active: boolean) => void;
  /** Show mic muted indicator on the tile */
  micMuted?: boolean;
  /** Optional ref to the video element for camera analysis (e.g. idle detection) */
  videoRef?: React.MutableRefObject<HTMLVideoElement | null>;
}

/**
 * Video preview for candidate. Meet-style: compact self-view with mic/cam indicators.
 */
export function VideoPreview({
  compact = false,
  active: controlledActive,
  onActiveChange,
  micMuted = false,
  videoRef: externalVideoRef,
}: VideoPreviewProps) {
  const [internalActive, setInternalActive] = useState(true);
  const active = controlledActive ?? internalActive;
  const setActive = (v: boolean) => {
    if (onActiveChange) onActiveChange(v);
    else setInternalActive(v);
  };

  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef ?? internalVideoRef;
  const [error, setError] = useState('');

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => {
        stream = s;
        const el = videoRef.current;
        if (el) el.srcObject = s;
      })
      .catch((e) => setError('Camera access denied or unavailable'));

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active]);

  const baseClasses = compact
    ? 'absolute bottom-20 right-6 w-36 aspect-video rounded-lg overflow-hidden bg-slate-800 border border-slate-600 shadow-xl'
    : 'absolute inset-0 rounded-lg overflow-hidden bg-slate-800';

  return (
    <div className={baseClasses}>
      {!active ? (
        <button
          type="button"
          onClick={() => setActive(true)}
          className="w-full h-full flex flex-col items-center justify-center text-slate-400 hover:bg-slate-700/50 gap-2"
        >
          {compact && <span className="text-xs font-medium text-slate-300">You</span>}
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {!compact && <span className="text-sm">Turn camera on</span>}
        </button>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {compact && (
            <>
              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-xs font-medium text-white">
                You
              </div>
              <div className="absolute top-1 right-1 flex gap-1">
                {micMuted && (
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-black/60">
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
                    </svg>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setActive(false)}
                  className="flex items-center justify-center w-6 h-6 rounded-full bg-black/60 text-white hover:bg-black/80"
                  title="Turn off camera"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </>
          )}
          {!compact && (
            <button
              type="button"
              onClick={() => setActive(false)}
              className="absolute top-2 right-2 text-xs text-slate-400 hover:text-white"
            >
              Off
            </button>
          )}
        </>
      )}
      {error && <p className="text-red-400 text-xs p-2">{error}</p>}
    </div>
  );
}
