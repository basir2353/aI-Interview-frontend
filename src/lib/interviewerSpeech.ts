import { pickPreferredInterviewerVoice, waitForSpeechVoices } from '@/lib/voicePreferences';

let speakGeneration = 0;

/** Cancel any in-progress interviewer TTS. */
export function cancelInterviewerSpeech(): void {
  speakGeneration += 1;
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/** Estimate how long TTS should take (ms) so we can recover if onend never fires. */
function estimateSpeechDurationMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3500, Math.min(90000, words * 450 + 1000));
}

/**
 * Speak interviewer text and resolve when finished (or cancelled).
 * Uses a generation counter so stale onend handlers cannot open the mic late.
 * Includes Chrome workarounds: resume() poll + timeout fallback when onend is lost.
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

    // Chrome often pauses the speech queue mid-utterance — keep it alive.
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
    }, estimateSpeechDurationMs(trimmed));

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
    utterance.onend = done;
    utterance.onerror = done;
    window.speechSynthesis.speak(utterance);
  });
}
