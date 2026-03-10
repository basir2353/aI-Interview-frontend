'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, FileText, Mic, Sparkles } from 'lucide-react';

const STATUS_LINES = ['Listening...', 'Thinking...', 'Taking notes.', 'You\'re doing great 👍'];

/** 3D hero visual: interview + AI vibe with depth, neural glow, and cheeky status. */
export function HeroInterviewVisual() {
  return (
    <motion.div
      className="relative flex items-center justify-center py-8"
      style={{ perspective: '1200px' }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* AI neural glow — layered 3D depth */}
      <motion.div
        className="absolute h-[280px] w-[280px] rounded-full sm:h-[340px] sm:w-[340px]"
        style={{
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.35) 0%, rgba(99, 102, 241, 0.2) 35%, transparent 65%)',
          filter: 'blur(40px)',
          transform: 'translateZ(-60px) scale(1.1)',
        }}
        animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.08, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute h-[200px] w-[200px] rounded-full sm:h-[240px] sm:w-[240px]"
        style={{
          background: 'radial-gradient(circle, rgba(167, 139, 250, 0.25) 0%, transparent 70%)',
          filter: 'blur(25px)',
          transform: 'translateZ(-30px)',
        }}
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />

      {/* Floating 3D orbs (back layer) */}
      <motion.div
        className="absolute left-[12%] top-[22%] h-3 w-3 rounded-full bg-[var(--landing-accent)]"
        style={{ transform: 'translateZ(-80px) translateX(-20px)', boxShadow: '0 0 20px rgba(167, 139, 250, 0.6)' }}
        animate={{ y: [0, -12, 0], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[14%] top-[28%] h-2 w-2 rounded-full bg-[#818cf8]"
        style={{ transform: 'translateZ(-50px) translateX(15px)', boxShadow: '0 0 15px rgba(129, 140, 248, 0.5)' }}
        animate={{ y: [0, 8, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      />
      <motion.div
        className="absolute bottom-[28%] left-[18%] h-2.5 w-2.5 rounded-full bg-[var(--landing-accent)]/80"
        style={{ transform: 'translateZ(-40px)', boxShadow: '0 0 18px rgba(167, 139, 250, 0.5)' }}
        animate={{ y: [0, 6, 0], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
      />
      <motion.div
        className="absolute bottom-[22%] right-[16%] h-2 w-2 rounded-full bg-[#6366f1]"
        style={{ transform: 'translateZ(-70px)', boxShadow: '0 0 12px rgba(99, 102, 241, 0.5)' }}
        animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
      />

      {/* Main 3D card with proper perspective */}
      <motion.div
        className="relative"
        style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
        animate={{
          y: [0, -10, 0],
          rotateY: [0, 3, -3, 0],
          rotateX: [0, -2, 2, 0],
        }}
        transition={{
          y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          rotateY: { duration: 7, repeat: Infinity, ease: 'easeInOut' },
          rotateX: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
        }}
        whileHover={{
          rotateY: 6,
          rotateX: -3,
          scale: 1.03,
          transition: { duration: 0.35 },
        }}
      >
        {/* 3D shadow "floor" under card */}
        <motion.div
          className="absolute -bottom-4 left-1/2 h-6 w-[85%] -translate-x-1/2 rounded-full blur-xl"
          style={{
            background: 'rgba(0,0,0,0.4)',
            transform: 'translateZ(-100px) scale(0.95) rotateX(85deg)',
          }}
        />

        <motion.div
          className="relative rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)]/95 p-6 backdrop-blur-md sm:p-8"
          style={{
            transformStyle: 'preserve-3d',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.45), 0 0 0 1px rgba(139, 92, 246, 0.2), 0 20px 40px -20px rgba(124, 58, 237, 0.3)',
          }}
        >
          {/* Subtle AI circuit lines (top) */}
          <div className="absolute inset-x-4 top-3 flex justify-between opacity-60" aria-hidden>
            <svg width="40" height="8" viewBox="0 0 40 8" fill="none" className="text-[var(--landing-accent)]">
              <path d="M0 4h6M10 4h4M18 4h6M28 4h4M36 4h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              <circle cx="8" cy="4" r="1" fill="currentColor" />
              <circle cx="16" cy="4" r="1" fill="currentColor" />
              <circle cx="24" cy="4" r="1" fill="currentColor" />
              <circle cx="32" cy="4" r="1" fill="currentColor" />
            </svg>
            <svg width="40" height="8" viewBox="0 0 40 8" fill="none" className="text-[var(--landing-accent)]">
              <path d="M0 4h4M8 4h6M18 4h4M26 4h6M34 4h6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              <circle cx="6" cy="4" r="1" fill="currentColor" />
              <circle cx="14" cy="4" r="1" fill="currentColor" />
              <circle cx="22" cy="4" r="1" fill="currentColor" />
              <circle cx="30" cy="4" r="1" fill="currentColor" />
            </svg>
          </div>

          <div className="flex min-w-[260px] flex-col items-center gap-6 sm:min-w-[300px]">
            {/* Avatar + AI badge */}
            <div className="relative">
              <motion.div
                className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] via-[#6366f1] to-[#4f46e5] shadow-lg sm:h-24 sm:w-24"
                style={{ boxShadow: '0 10px 40px -10px rgba(124, 58, 237, 0.6), inset 0 1px 0 rgba(255,255,255,0.2)' }}
                animate={{
                  boxShadow: [
                    '0 10px 40px -10px rgba(124, 58, 237, 0.6), inset 0 1px 0 rgba(255,255,255,0.2)',
                    '0 16px 50px -12px rgba(99, 102, 241, 0.7), inset 0 1px 0 rgba(255,255,255,0.25)',
                    '0 10px 40px -10px rgba(124, 58, 237, 0.6), inset 0 1px 0 rgba(255,255,255,0.2)',
                  ],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Bot className="h-10 w-10 text-white sm:h-12 sm:w-12" strokeWidth={1.8} />
              </motion.div>
              <motion.span
                className="absolute -right-1 -top-1 flex items-center gap-1 rounded-full bg-[var(--landing-accent)]/25 px-2.5 py-1 text-xs font-bold text-[var(--landing-accent)]"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 260 }}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--landing-accent)] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--landing-accent)]" />
                </span>
                AI
              </motion.span>
            </div>

            {/* Waveform + cycling cheeky status */}
            <div className="flex items-end gap-1.5">
              {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.55, 0.75].map((h, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 rounded-full bg-gradient-to-t from-[var(--landing-accent)] to-[var(--landing-muted)]"
                  style={{ height: `${h * 24}px` }}
                  animate={{ height: [`${h * 24}px`, `${h * 30}px`, `${h * 24}px`] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.06, ease: 'easeInOut' }}
                />
              ))}
            </div>
            <motion.p
              className="min-h-[1.5rem] text-sm font-medium text-[var(--landing-muted)]"
              key="status"
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <StatusCycler lines={STATUS_LINES} />
            </motion.p>
          </div>
        </motion.div>
      </motion.div>

      {/* Floating 3D icons with depth */}
      {[
        { Icon: Mic, delay: 0, left: '8%', top: '32%', z: -20 },
        { Icon: FileText, delay: 0.15, right: '6%', top: '36%', z: -10 },
        { Icon: Sparkles, delay: 0.3, left: '12%', bottom: '24%', z: -15 },
        { Icon: Sparkles, delay: 0.25, right: '10%', bottom: '28%', z: -25 },
      ].map(({ Icon, delay, left, right, top, bottom, z }, i) => (
        <motion.div
          key={i}
          className="absolute flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--landing-border)] bg-[var(--landing-surface)]/90 text-[var(--landing-accent)] shadow-lg backdrop-blur-sm sm:h-12 sm:w-12"
          style={{
            left: left ?? undefined,
            right: right ?? undefined,
            top: top ?? undefined,
            bottom: bottom ?? undefined,
            transform: `translateZ(${z}px)`,
            boxShadow: '0 8px 24px -8px rgba(0,0,0,0.35)',
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 + delay }}
          whileHover={{ scale: 1.15, rotate: i % 2 === 0 ? 8 : -8, z: 20 }}
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
        </motion.div>
      ))}
    </motion.div>
  );
}

/** Cycles through status lines for cheeky AI vibe. */
function StatusCycler({ lines }: { lines: string[] }) {
  return (
    <motion.span
      animate={{ opacity: [1, 0.7, 1] }}
      transition={{ duration: 0.4 }}
    >
      <StatusLoop lines={lines} />
    </motion.span>
  );
}

function StatusLoop({ lines }: { lines: string[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % lines.length), 2200);
    return () => clearInterval(t);
  }, [lines.length]);
  return <>{lines[idx]}</>;
}
