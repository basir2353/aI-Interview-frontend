import { useCallback, useEffect, useRef } from 'react';
import type { Turn } from '@/types';
import { pickPreferredInterviewerVoice, waitForSpeechVoices } from '@/lib/voicePreferences';

function pickProfessionalVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  return pickPreferredInterviewerVoice(voices);
}

/** Speak text using the browser's SpeechSynthesis (works without backend TTS). */
async function speakWithBrowser(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  lang?: string
) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const voices = await waitForSpeechVoices();
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const selectedVoice = pickProfessionalVoice(voices);
  utterance.voice = selectedVoice;
  utterance.lang = lang || selectedVoice?.lang || 'en-US';
  utterance.rate = 0.96;
  utterance.pitch = 1.03;
  utterance.volume = 1.0;
  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

interface UseInterviewerVoiceOptions {
  onAutoSpeakStart?: () => void;
  onAutoSpeakEnd?: () => void;
  /** Turn IDs to skip (e.g. first turn when page speaks it after voice instructions). */
  skipTurnIds?: Set<string> | null;
  /** Language code for TTS (e.g. 'en-US', 'es', 'fr'). */
  lang?: string;
}

/**
 * Speaks the AI interviewer's questions and responses aloud.
 * Exposes speakText() so the UI can play a question on click or after voice instructions.
 */
export function useInterviewerVoice(
  turns: Turn[] | undefined,
  voiceEnabled: boolean,
  options?: UseInterviewerVoiceOptions
) {
  const lastSpokenTurnId = useRef<string | null>(null);
  const onAutoSpeakStartRef = useRef<(() => void) | undefined>(options?.onAutoSpeakStart);
  const onAutoSpeakEndRef = useRef<(() => void) | undefined>(options?.onAutoSpeakEnd);
  const skipTurnIds = options?.skipTurnIds;
  const lang = options?.lang;

  useEffect(() => {
    onAutoSpeakStartRef.current = options?.onAutoSpeakStart;
    onAutoSpeakEndRef.current = options?.onAutoSpeakEnd;
  }, [options?.onAutoSpeakStart, options?.onAutoSpeakEnd]);

  useEffect(() => {
    void waitForSpeechVoices();
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  /** Speak a specific text (optional lang for multi-language). */
  const speakText = useCallback(
    (text: string, language?: string) => {
      if (!text?.trim()) return;
      stopSpeaking();
      void speakWithBrowser(text, undefined, undefined, language || lang);
    },
    [stopSpeaking, lang]
  );

  useEffect(() => {
    if (!turns?.length || !voiceEnabled) {
      if (!voiceEnabled) {
        lastSpokenTurnId.current = null;
        stopSpeaking();
      }
      return;
    }

    const lastAiTurn = [...turns].reverse().find((t) => t.role === 'ai');
    if (!lastAiTurn) return;
    if (lastAiTurn.id === lastSpokenTurnId.current) return;
    if (skipTurnIds?.has(lastAiTurn.id)) return;

    lastSpokenTurnId.current = lastAiTurn.id;

    const fullText = (lastAiTurn.content || '').trim();
    if (!fullText) return;

    const speak = async () => {
      stopSpeaking();
      await speakWithBrowser(
        fullText,
        onAutoSpeakStartRef.current,
        onAutoSpeakEndRef.current,
        lang
      );
    };

    const t = setTimeout(speak, 220);
    return () => clearTimeout(t);
  }, [turns, voiceEnabled, stopSpeaking, skipTurnIds, lang]);

  return { stopSpeaking, speakText };
}
