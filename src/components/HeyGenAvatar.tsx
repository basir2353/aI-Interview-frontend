'use client';

import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
  TaskMode,
  VoiceEmotion,
} from '@heygen/streaming-avatar';
import { AIAvatar } from '@/components/AIAvatar';

/** Exposed via ref so the parent can call speak() */
export interface HeyGenAvatarHandle {
  speak: (text: string) => Promise<void>;
  interrupt: () => Promise<void>;
}

interface HeyGenAvatarProps {
  /** Display name shown in the name badge */
  name?: string;
  /** Subtitle under the name */
  subtitle?: string;
  /**
   * HeyGen avatar ID.
   * Free public avatars: "Wayne_20240711" (male), "Anna_public_3_20240108" (female).
   * Browse all at https://app.heygen.com/avatars
   */
  avatarId?: string;
  size?: 'sm' | 'lg';
  /** Called once the streaming session is established and ready to speak */
  onReady?: () => void;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

/** Status sequence for the loading overlay */
type Status = 'loading' | 'connecting' | 'ready' | 'speaking' | 'error';

const HeyGenAvatarInner = (
  {
    name = 'Ethan',
    subtitle = 'Intervion AI',
    avatarId = 'Wayne_20240711',
    size = 'lg',
    onReady,
    onSpeakStart,
    onSpeakEnd,
  }: HeyGenAvatarProps,
  ref: React.Ref<HeyGenAvatarHandle>
) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const onReadyRef = useRef(onReady);
  const onSpeakStartRef = useRef(onSpeakStart);
  const onSpeakEndRef = useRef(onSpeakEnd);

  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => { onSpeakStartRef.current = onSpeakStart; }, [onSpeakStart]);
  useEffect(() => { onSpeakEndRef.current = onSpeakEnd; }, [onSpeakEnd]);

  useImperativeHandle(ref, () => ({
    speak: async (text: string) => {
      if (!avatarRef.current || (status !== 'ready' && status !== 'speaking')) return;
      try {
        await avatarRef.current.speak({
          text,
          taskType: TaskType.REPEAT,
          taskMode: TaskMode.SYNC,
        });
      } catch {
        // ignore transient speak errors
      }
    },
    interrupt: async () => {
      try { await avatarRef.current?.interrupt(); } catch { /* ignore */ }
    },
  }));

  const init = useCallback(async () => {
    try {
      setStatus('loading');

      // Fetch short-lived token from our backend (keeps API key secret)
      const tokenRes = await fetch('/api/proxy/heygen/token');
      if (!tokenRes.ok) {
        const { error } = await tokenRes.json().catch(() => ({ error: 'No token' }));
        throw new Error(error || `HTTP ${tokenRes.status}`);
      }
      const { token } = await tokenRes.json() as { token: string };

      setStatus('connecting');

      const avatar = new StreamingAvatar({ token });
      avatarRef.current = avatar;

      // Wire video stream when ready
      avatar.on(StreamingEvents.STREAM_READY, (event: { detail: MediaStream }) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.detail;
          videoRef.current.play().catch(() => {});
        }
        setStatus('ready');
        onReadyRef.current?.();
      });

      avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
        setStatus('speaking');
        onSpeakStartRef.current?.();
      });

      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        setStatus('ready');
        onSpeakEndRef.current?.();
      });

      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        setStatus('error');
        setErrorMsg('Stream disconnected. Reload to reconnect.');
      });

      // Start the avatar session
      await avatar.createStartAvatar({
        quality: AvatarQuality.High,
        avatarName: avatarId,
        language: 'en',
        voice: {
          emotion: VoiceEmotion.FRIENDLY,
        },
        disableIdleTimeout: true,
      });
        } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setStatus('error');
      // Don't call onReady — fallback AIAvatar uses browser TTS (heyGenReady stays false)
    }
  }, [avatarId]);

  useEffect(() => {
    init();
    return () => {
      avatarRef.current?.stopAvatar().catch(() => {});
      avatarRef.current = null;
    };
  }, [init]);

  const D = size === 'sm' ? 130 : 210;
  const isSpeaking = status === 'speaking';
  const isReady = status === 'ready' || isSpeaking;

  // When HeyGen is unavailable (no API key, network error, etc.),
  // fall back silently to the animated AI avatar — no error shown to interviewee.
  if (status === 'error') {
    return <AIAvatar name={name} subtitle={subtitle} size={size} />;
  }

  return (
    <div className="flex flex-col items-center select-none">
      <style>{`
        @keyframes hg-glow-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.04); }
        }
        @keyframes hg-speak-bar {
          0%, 100% { scaleY: 0.4; }
          50% { scaleY: 1; }
        }
        @keyframes hg-spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Ambient glow ring */}
      <div
        style={{
          position: 'absolute',
          width: D + 24,
          height: D + 24,
          borderRadius: '50%',
          background: isSpeaking
            ? 'radial-gradient(circle, rgba(99,102,241,0.28) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)',
          animation: isSpeaking ? 'hg-glow-pulse 1.2s ease-in-out infinite' : 'none',
          transition: 'background 0.4s',
          pointerEvents: 'none',
        }}
      />

      {/* Avatar circle */}
      <div
        style={{
          width: D,
          height: D,
          borderRadius: '50%',
          overflow: 'hidden',
          position: 'relative',
          border: isSpeaking
            ? '2.5px solid rgba(99,102,241,0.85)'
            : isReady
            ? '2px solid rgba(99,102,241,0.40)'
            : '2px solid rgba(99,102,241,0.15)',
          boxShadow: isSpeaking
            ? '0 0 28px rgba(99,102,241,0.45), 0 8px 32px rgba(0,0,0,0.5)'
            : '0 8px 32px rgba(0,0,0,0.45)',
          transition: 'border 0.3s, box-shadow 0.3s',
          background: '#0a0c18',
        }}
      >
        {/* Video element — HeyGen streams the talking head here */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: isReady ? 'block' : 'none',
          }}
        />

        {/* Loading / connecting overlay */}
        {!isReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0c18]">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '3px solid rgba(99,102,241,0.20)',
                borderTopColor: 'rgba(99,102,241,0.90)',
                animation: 'hg-spin 0.8s linear infinite',
              }}
            />
            <span
              style={{ fontSize: 11, color: 'rgba(148,163,184,0.8)', letterSpacing: '0.04em' }}
            >
              {status === 'loading' ? 'Connecting…' : 'Initializing avatar…'}
            </span>
          </div>
        )}

        {/* Speaking sound bars — bottom-right corner */}
        {isSpeaking && (
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 3,
            }}
          >
            {[1, 1.6, 1.2, 1.8, 1].map((delay, i) => (
              <div
                key={i}
                style={{
                  width: 4,
                  height: 4 + i * 3,
                  borderRadius: 2,
                  background: 'rgba(99,102,241,0.85)',
                  animation: `hg-speak-bar ${0.5 + delay * 0.2}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Name badge */}
      <div
        style={{ marginTop: 12 }}
        className="flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--surface-light-card)] px-4 py-1.5 shadow-sm"
      >
        <div
          className={`h-2 w-2 rounded-full ${
            isSpeaking
              ? 'bg-[var(--accent)] animate-pulse'
              : isReady
              ? 'bg-[var(--success-text)]'
              : 'bg-yellow-400 animate-pulse'
          }`}
        />
        <span className="text-xs font-semibold text-[var(--surface-light-fg)]">{name}</span>
        <span className="text-xs text-[var(--surface-light-muted)]">· {subtitle}</span>
      </div>

      {/* Subtle status text */}
      {isSpeaking && (
        <p
          style={{ marginTop: 6, fontSize: 11, letterSpacing: '0.06em' }}
          className="text-[var(--accent)] animate-pulse font-medium tracking-widest uppercase"
        >
          Speaking…
        </p>
      )}
    </div>
  );
};

HeyGenAvatarInner.displayName = 'HeyGenAvatar';

export const HeyGenAvatar = forwardRef<HeyGenAvatarHandle, HeyGenAvatarProps>(HeyGenAvatarInner);
