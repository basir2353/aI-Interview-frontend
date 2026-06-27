import { useCallback, useEffect, useRef } from 'react';
import type { Turn } from '@/types';
import { cancelInterviewerSpeech, speakInterviewerText } from '@/lib/interviewerSpeech';

interface UseInterviewerVoiceOptions {
  onAutoSpeakStart?: () => void;
  onAutoSpeakEnd?: () => void;
  /** Turn IDs to skip (e.g. intro + first question spoken manually on live entry). */
  skipTurnIds?: Set<string> | null;
  lang?: string;
}

/**
 * Speaks new AI interviewer turns after intro. Exposes markTurnSpoken so the
 * intro sequence can register turns already delivered out-of-band.
 */
export function useInterviewerVoice(
  turns: Turn[] | undefined,
  voiceEnabled: boolean,
  options?: UseInterviewerVoiceOptions
) {
  const lastSpokenTurnId = useRef<string | null>(null);
  const onAutoSpeakStartRef = useRef(options?.onAutoSpeakStart);
  const onAutoSpeakEndRef = useRef(options?.onAutoSpeakEnd);
  const skipTurnIds = options?.skipTurnIds;
  const lang = options?.lang;

  useEffect(() => {
    onAutoSpeakStartRef.current = options?.onAutoSpeakStart;
    onAutoSpeakEndRef.current = options?.onAutoSpeakEnd;
  }, [options?.onAutoSpeakStart, options?.onAutoSpeakEnd]);

  const stopSpeaking = useCallback(() => {
    cancelInterviewerSpeech();
  }, []);

  const markTurnSpoken = useCallback((turnId: string) => {
    lastSpokenTurnId.current = turnId;
  }, []);

  const speakText = useCallback(
    (text: string, language?: string) => {
      if (!text?.trim()) return;
      void speakInterviewerText(text, { lang: language || lang });
    },
    [lang]
  );

  /** Speak a specific AI turn and invoke pipeline callbacks. */
  const speakTurn = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      await speakInterviewerText(text, {
        lang,
        onStart: () => onAutoSpeakStartRef.current?.(),
        onEnd: () => onAutoSpeakEndRef.current?.(),
      });
    },
    [lang]
  );

  useEffect(() => {
    if (!turns?.length || !voiceEnabled) {
      if (!voiceEnabled) {
        lastSpokenTurnId.current = null;
        stopSpeaking();
      }
      return;
    }

    const lastAiTurn = [...turns].reverse().find((t) => t.role === 'ai' && !t.isIntro);
    if (!lastAiTurn) return;
    if (lastAiTurn.id === lastSpokenTurnId.current) return;
    if (skipTurnIds?.has(lastAiTurn.id)) return;

    lastSpokenTurnId.current = lastAiTurn.id;
    const fullText = (lastAiTurn.content || '').trim();
    if (!fullText) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      void speakTurn(fullText);
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [turns, voiceEnabled, stopSpeaking, skipTurnIds, speakTurn]);

  return { stopSpeaking, speakText, speakTurn, markTurnSpoken };
}
