'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { getInterviewNoteLines, getInterviewNotesSpeechScript } from '@/lib/interviewNoteLines';
import { pickPreferredInterviewerVoice, waitForSpeechVoices } from '@/lib/voicePreferences';

export type InterviewInstructionsOverlayProps = {
  showCodeTab: boolean;
  codingTurnActive: boolean;
  showNotepadTab: boolean;
  interviewLang: string;
  onShareScreen: () => void;
  onSoundsGood: () => void;
};

/**
 * Full-screen interview notes + screen share prompt (immersive, F11-style).
 * Reads notes aloud on mount (main interview room does not replay this script).
 */
export function InterviewInstructionsOverlay({
  showCodeTab,
  codingTurnActive,
  showNotepadTab,
  interviewLang,
  onShareScreen,
  onSoundsGood,
}: InterviewInstructionsOverlayProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const noteCtx = { showCodeTab, codingTurnActive, showNotepadTab };
  const noteLines = getInterviewNoteLines(noteCtx);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const script = getInterviewNotesSpeechScript(noteCtx);
    let cancelled = false;

    const run = async () => {
      await waitForSpeechVoices();
      if (cancelled) return;
      const voices = window.speechSynthesis.getVoices();
      const voice = pickPreferredInterviewerVoice(voices);
      const lang = interviewLang || voice?.lang || 'en-US';
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(script);
      if (voice) utterance.voice = voice;
      utterance.lang = lang;
      utterance.rate = 0.96;
      utterance.pitch = 1.03;
      window.speechSynthesis.speak(utterance);
    };

    /** Brief delay so a screen-share picker (if open from “Next”) can settle before TTS. */
    const delayTimer = setTimeout(() => {
      void run();
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(delayTimer);
      window.speechSynthesis.cancel();
    };
  }, [interviewLang, showCodeTab, codingTurnActive, showNotepadTab]);

  const shell = isLight ? 'bg-[var(--surface-light)] text-[var(--surface-light-fg)]' : 'bg-[#070510] text-white';

  const listCard = isLight
    ? 'border-[var(--surface-light-border)] bg-[var(--surface-light-card)] shadow-[0_24px_80px_-24px_rgba(15,23,42,0.12)]'
    : 'border-white/10 bg-white/[0.05] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.7)]';

  const listText = isLight ? 'text-[var(--surface-light-fg)]' : 'text-white/85';
  const muted = isLight ? 'text-[var(--surface-light-muted)]' : 'text-white/55';
  const kicker = isLight ? 'text-[var(--accent)]' : 'text-violet-300/80';
  const bullet = isLight ? 'bg-[var(--accent)]' : 'bg-violet-400';

  const secondaryBtn = isLight
    ? 'border-[var(--surface-light-border)] bg-[var(--surface-light-card)] text-[var(--surface-light-fg)] hover:bg-[var(--surface-light-input)] focus:ring-[var(--accent)]'
    : 'border-white/20 bg-white/10 text-white hover:bg-white/15 focus:ring-violet-400/70';

  const primaryFocusRing = isLight ? 'focus:ring-offset-[var(--surface-light)]' : 'focus:ring-offset-[#070510]';

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col overflow-y-auto ${shell}`}>
      <div className="pointer-events-none fixed inset-0">
        {isLight ? (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(124,58,237,0.12),transparent_55%)]" />
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(167,139,250,0.08),transparent_70%)]" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(124,58,237,0.35),transparent_55%)]" />
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(192,132,252,0.12),transparent_70%)]" />
          </>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-auto flex min-h-full w-full max-w-2xl flex-col px-6 py-14 sm:py-20"
      >
        <p className={`text-center text-xs font-semibold uppercase tracking-[0.25em] ${kicker}`}>Before we begin</p>
        <h1 className="mt-4 text-center text-3xl font-semibold tracking-tight sm:text-4xl">Interview notes</h1>
        <p className={`mx-auto mt-3 max-w-lg text-center text-sm ${muted}`}>
          These guidelines are read aloud for you. If the screen-share dialog appears, choose what to share — you can also use the button below.
        </p>

        <motion.ul
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06 } },
          }}
          className={`mt-10 space-y-4 rounded-3xl border p-6 backdrop-blur-xl sm:p-8 ${listCard}`}
        >
          {noteLines.map((line) => (
            <motion.li
              key={line}
              variants={{
                hidden: { opacity: 0, x: -8 },
                show: { opacity: 1, x: 0, transition: { duration: 0.35 } },
              }}
              className={`flex gap-3 text-[15px] leading-relaxed ${listText}`}
            >
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${bullet}`} />
              <span>{line}</span>
            </motion.li>
          ))}
        </motion.ul>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.45 }}
          className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center"
        >
          <button
            type="button"
            onClick={onShareScreen}
            className={`rounded-2xl border px-6 py-3.5 text-sm font-semibold backdrop-blur-md transition focus:outline-none focus:ring-2 ${secondaryBtn}`}
          >
            Share your screen
          </button>
          <button
            type="button"
            onClick={onSoundsGood}
            className={`rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3.5 text-sm font-semibold text-white shadow-[0_16px_40px_-12px_rgba(139,92,246,0.55)] transition hover:shadow-[0_20px_48px_-12px_rgba(192,132,252,0.45)] focus:outline-none focus:ring-2 focus:ring-fuchsia-300/80 focus:ring-offset-2 ${primaryFocusRing}`}
          >
            Sounds good — start interview
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
