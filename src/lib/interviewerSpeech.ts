import { pickPreferredInterviewerVoice, waitForSpeechVoices } from '@/lib/voicePreferences';

let speakGeneration = 0;

/** Cancel any in-progress interviewer TTS. */
export function cancelInterviewerSpeech(): void {
  speakGeneration += 1;
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Speak interviewer text and resolve when finished (or cancelled).
 * Uses a generation counter so stale onend handlers cannot open the mic late.
 */
export async function speakInterviewerText(
  text: string,
  options?: {
    lang?: string;
    onStart?: () => void;
    onEnd?: () => void;
  }
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed || typeof window === 'undefined') {
    options?.onEnd?.();
    return;
  }

  const generation = ++speakGeneration;
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  if (!window.speechSynthesis) {
    options?.onStart?.();
    options?.onEnd?.();
    return;
  }

  await waitForSpeechVoices();

  return new Promise<void>((resolve) => {
    const finish = () => {
      if (generation !== speakGeneration) return;
      options?.onEnd?.();
      resolve();
    };

    const utterance = new SpeechSynthesisUtterance(trimmed);
    const voices = window.speechSynthesis.getVoices();
    const voice = pickPreferredInterviewerVoice(voices);
    if (voice) utterance.voice = voice;
    utterance.lang = options?.lang || voice?.lang || 'en-US';
    utterance.rate = 0.94;
    utterance.pitch = 1.03;
    utterance.onstart = () => {
      if (generation !== speakGeneration) return;
      options?.onStart?.();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  });
}
