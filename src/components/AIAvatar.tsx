'use client';

import { useEffect, useState } from 'react';

interface AIAvatarProps {
  name?: string;
  subtitle?: string;
  /** 'sm' = 130px for split-view, 'lg' = 210px for full-view */
  size?: 'sm' | 'lg';
}

/**
 * Animated AI interviewer avatar.
 * Self-detects speech via window.speechSynthesis.speaking so it
 * automatically lip-syncs with TTS without any prop threading.
 */
export function AIAvatar({ name = 'Ethan', subtitle = 'Intervion AI', size = 'lg' }: AIAvatarProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [blink, setBlink] = useState(false);
  const [mouth, setMouth] = useState(0); // 0 = closed, 1 = fully open

  // Poll browser TTS state
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const iv = setInterval(() => setIsSpeaking(window.speechSynthesis.speaking), 50);
    return () => clearInterval(iv);
  }, []);

  // Random blink every 2.5–5.5 s
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t = setTimeout(() => { setBlink(true); setTimeout(() => setBlink(false), 110); schedule(); }, 2500 + Math.random() * 3000);
    };
    schedule();
    return () => clearTimeout(t);
  }, []);

  // Mouth animation while speaking
  useEffect(() => {
    if (!isSpeaking) { setMouth(0); return; }
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      setMouth(Math.random() * 0.8 + 0.1);
      t = setTimeout(tick, 70 + Math.random() * 110);
    };
    tick();
    return () => clearTimeout(t);
  }, [isSpeaking]);

  const D = size === 'sm' ? 130 : 210;
  const ey = blink ? 0.06 : 1; // eye vertical scale
  const mh = mouth * 10;       // mouth open height (px in 200-unit viewBox)

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* CSS animations */}
      <style>{`
        @keyframes av_speak { 0%,100% { transform: scaleY(.25); } 50% { transform: scaleY(1); } }
        @keyframes av_breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.012); } }
      `}</style>

      {/* Ambient glow ring */}
      <div
        className="absolute rounded-full pointer-events-none transition-opacity duration-500"
        style={{
          width: D + 28, height: D + 28,
          top: -14, left: -14,
          background: isSpeaking
            ? 'radial-gradient(circle, rgba(99,102,241,.28) 0%, transparent 68%)'
            : 'radial-gradient(circle, rgba(99,102,241,.08) 0%, transparent 68%)',
        }}
      />

      {/* Avatar circle */}
      <div
        className="relative overflow-hidden rounded-full shadow-2xl transition-shadow duration-300"
        style={{
          width: D, height: D,
          border: `2px solid ${isSpeaking ? 'rgba(99,102,241,.7)' : 'rgba(99,102,241,.22)'}`,
          boxShadow: isSpeaking
            ? '0 0 24px rgba(99,102,241,.45), 0 12px 40px rgba(0,0,0,.5)'
            : '0 8px 32px rgba(0,0,0,.45)',
          animation: 'av_breathe 3.5s ease-in-out infinite',
        }}
      >
        <svg
          width={D} height={D}
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="avBg" cx="50%" cy="28%" r="72%">
              <stop offset="0%" stopColor="#232741" />
              <stop offset="100%" stopColor="#0d0f1e" />
            </radialGradient>
            <radialGradient id="avSkin" cx="43%" cy="32%" r="64%">
              <stop offset="0%" stopColor="#f6c8a6" />
              <stop offset="58%" stopColor="#e9a87c" />
              <stop offset="100%" stopColor="#c87c50" />
            </radialGradient>
            <linearGradient id="avSuit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1c2d48" />
              <stop offset="100%" stopColor="#0b1825" />
            </linearGradient>
            <radialGradient id="avHair" cx="50%" cy="0%" r="80%">
              <stop offset="0%" stopColor="#322418" />
              <stop offset="100%" stopColor="#190e08" />
            </radialGradient>
            <clipPath id="avClip"><circle cx="100" cy="100" r="100" /></clipPath>
          </defs>

          {/* Background */}
          <circle cx="100" cy="100" r="100" fill="url(#avBg)" />

          <g clipPath="url(#avClip)">
            {/* Suit body */}
            <path d="M0,200 L0,155 L44,142 L67,165 L100,158 L133,165 L156,142 L200,155 L200,200 Z" fill="url(#avSuit)" />
            {/* White shirt between lapels */}
            <path d="M84,155 L91,200 L109,200 L116,155 Q100,161 84,155 Z" fill="#edf0f7" />
            {/* Tie */}
            <path d="M97,156 L94,200 L100,205 L106,200 L103,156 Z" fill="#5b63d3" />
            <path d="M96,156 L94,165 L100,162 L106,165 L104,156 Z" fill="#4a52c0" />
            {/* Lapels */}
            <path d="M84,155 L44,142 L67,165 Z" fill="#11202e" />
            <path d="M116,155 L156,142 L133,165 Z" fill="#11202e" />
            {/* Shirt collar */}
            <path d="M87,155 L92,148 L100,151 L108,148 L113,155" stroke="#ccd1e0" strokeWidth="1.5" fill="none" />

            {/* Neck */}
            <rect x="88" y="136" width="24" height="22" rx="4" fill="#d8956e" />

            {/* Head */}
            <ellipse cx="100" cy="93" rx="46" ry="53" fill="url(#avSkin)" />

            {/* Hair top */}
            <path d="M54,81 Q56,32 100,29 Q144,32 146,81 Q139,52 100,50 Q61,52 54,81 Z" fill="url(#avHair)" />
            {/* Hair sides */}
            <path d="M54,81 Q50,68 54,54 Q57,45 64,42 Q57,57 57,76 Z" fill="#190e08" />
            <path d="M146,81 Q150,68 146,54 Q143,45 136,42 Q143,57 143,76 Z" fill="#190e08" />
            {/* Slight side parting line */}
            <path d="M100,29 Q105,44 103,65" stroke="#0d0808" strokeWidth="1" fill="none" opacity="0.5" />

            {/* Left ear */}
            <ellipse cx="54" cy="96" rx="7" ry="9.5" fill="#cc8860" />
            <path d="M57,90 Q60,96 57,103" stroke="#ab6e48" strokeWidth="1.5" fill="none" />
            {/* Right ear */}
            <ellipse cx="146" cy="96" rx="7" ry="9.5" fill="#cc8860" />
            <path d="M143,90 Q140,96 143,103" stroke="#ab6e48" strokeWidth="1.5" fill="none" />

            {/* Left eyebrow — slightly arched */}
            <path d="M62,71 Q72,64 82,69" stroke="#3a2616" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Right eyebrow */}
            <path d="M118,69 Q128,64 138,71" stroke="#3a2616" strokeWidth="3" strokeLinecap="round" fill="none" />

            {/* Left eye */}
            <ellipse cx="76" cy="87" rx="11" ry={9.5 * ey} fill="white" />
            <ellipse cx="77" cy="87" rx="6.5" ry={6.5 * ey} fill="#3c2a1a" />
            <ellipse cx="77" cy="87" rx="4" ry={4 * ey} fill="#0e0606" />
            <ellipse cx="79.5" cy={85} rx="2" ry={2 * ey} fill="white" opacity="0.82" />
            {blink && <ellipse cx="76" cy="87" rx="11" ry="9.5" fill="url(#avSkin)" />}

            {/* Right eye */}
            <ellipse cx="124" cy="87" rx="11" ry={9.5 * ey} fill="white" />
            <ellipse cx="123" cy="87" rx="6.5" ry={6.5 * ey} fill="#3c2a1a" />
            <ellipse cx="123" cy="87" rx="4" ry={4 * ey} fill="#0e0606" />
            <ellipse cx="125.5" cy={85} rx="2" ry={2 * ey} fill="white" opacity="0.82" />
            {blink && <ellipse cx="124" cy="87" rx="11" ry="9.5" fill="url(#avSkin)" />}

            {/* Nose bridge + nostrils */}
            <path d="M96,100 Q100,115 104,100" stroke="#a86a42" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M92,112 Q97,118 100,116 Q103,118 108,112" stroke="#a86a42" strokeWidth="1.5" fill="none" strokeLinecap="round" />

            {/* Cheek shading — subtle */}
            <ellipse cx="68" cy="108" rx="12" ry="7" fill="#d9866a" opacity="0.18" />
            <ellipse cx="132" cy="108" rx="12" ry="7" fill="#d9866a" opacity="0.18" />

            {/* Mouth */}
            {mh < 1.5 ? (
              /* Neutral/slight smile — closed */
              <path d="M83,125 Q92,133 100,131 Q108,133 117,125" stroke="#8a4e4e" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            ) : (
              <>
                {/* Jaw drop area */}
                <path d={`M83,125 Q100,${125 + mh * 1.9} 117,125`} fill="#6b2e2e" />
                {/* Upper lip */}
                <path d="M83,125 Q91,120 100,122 Q109,120 117,125" fill="#c06a6a" />
                {/* Mouth cavity */}
                <ellipse cx="100" cy={126 + mh} rx="14.5" ry={mh + 2} fill="#290808" />
                {/* Upper teeth */}
                <rect x="87" y="125" width="26" height={Math.min(mh * 0.8 + 1, 7)} rx="2" fill="#f2ede7" />
                {/* Lower lip */}
                <path d={`M83,125 Q100,${126 + mh * 2 + 2} 117,125`} stroke="#c06a6a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </>
            )}

            {/* Subtle chin line */}
            <path d="M65,135 Q100,158 135,135" stroke="#b8825e" strokeWidth="0.5" fill="none" opacity="0.25" />
          </g>

          {/* Subtle inner ring */}
          <circle cx="100" cy="100" r="98.5" stroke="rgba(99,102,241,.18)" strokeWidth="3" fill="none" />
        </svg>

        {/* Speaking sound bars — overlay bottom of circle */}
        {isSpeaking && (
          <div className="absolute bottom-3 left-0 right-0 flex items-end justify-center gap-[3px]">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-[3px] rounded-full bg-white/75"
                style={{
                  height: 10,
                  transformOrigin: 'bottom',
                  animation: 'av_speak .55s ease-in-out infinite alternate',
                  animationDelay: `${i * 0.09}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Name badge */}
      <div className="mt-3 flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--surface-light-card)] px-4 py-1.5 shadow-sm">
        <div
          className="h-2 w-2 rounded-full transition-colors duration-300"
          style={{ background: isSpeaking ? '#818cf8' : '#4ade80' }}
        />
        <span className="text-xs font-semibold text-[var(--surface-light-fg)]">{name}</span>
        <span className="text-xs text-[var(--surface-light-muted)]">· {subtitle}</span>
      </div>

      {isSpeaking && (
        <p className="mt-1 text-[10px] font-medium text-[var(--accent)] tracking-wide animate-pulse">
          Speaking…
        </p>
      )}
    </div>
  );
}
