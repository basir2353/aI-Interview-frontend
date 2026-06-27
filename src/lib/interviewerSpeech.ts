import {
  applyInterviewerSpeechSettings,
  estimateInterviewerSpeechDurationMs,
  pickPreferredInterviewerVoice,
  waitForSpeechVoices,
} from '@/lib/voicePreferences';

let speakGeneration = 0;

/** Cancel any in-progress interviewer TTS. */
export function cancelInterviewerSpeech(): void {
  speakGeneration += 1;
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Speak interviewer text in one continuous utterance (no extra pauses).
 * Slightly slower rate than browser default — speed only, same flow as before.
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
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  if (!window.speechSynthesis) {
    options?.onStart?.();
    options?.onEnd?.();
    return;
  }

  await waitForSpeechVoices();

  return new Promise<void>((resolve) => {
    let settled = false;
    let resumeInterval: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const done = () => {
      if (settled || generation !== speakGeneration) return;
      settled = true;
      if (resumeInterval) clearInterval(resumeInterval);
      if (timeoutId) clearTimeout(timeoutId);
      options?.onEnd?.();
      resolve();
    };

    resumeInterval = setInterval(() => {
      if (generation !== speakGeneration) return;
      const synth = window.speechSynthesis;
      if (synth.paused) synth.resume();
    }, 800);

    timeoutId = setTimeout(() => {
      if (generation !== speakGeneration || settled) return;
      console.warn('[TTS] Utterance timeout — advancing pipeline', { preview: trimmed.slice(0, 72) });
      window.speechSynthesis.cancel();
      done();
    }, estimateInterviewerSpeechDurationMs(trimmed));

    const utterance = new SpeechSynthesisUtterance(trimmed);
    const voices = window.speechSynthesis.getVoices();
    const voice = pickPreferredInterviewerVoice(voices);
    if (voice) utterance.voice = voice;
    utterance.lang = options?.lang || voice?.lang || 'en-US';
    applyInterviewerSpeechSettings(utterance);

    utterance.onstart = () => {
      if (generation !== speakGeneration) return;
      options?.onStart?.();
    };
    utterance.onend = done;
    utterance.onerror = done;
    window.speechSynthesis.speak(utterance);
  });
}
