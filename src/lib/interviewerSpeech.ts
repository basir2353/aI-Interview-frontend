import {
  applyInterviewerSpeechSettings,
  estimateInterviewerSpeechDurationMs,
  INTERVIEWER_SPEECH_PROFILE,
  pickPreferredInterviewerVoice,
  splitTextForNaturalSpeech,
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

const pause = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function speakSingleUtterance(
  text: string,
  generation: number,
  options: { lang?: string; onSegmentStart?: () => void }
): Promise<void> {
  return new Promise<void>((resolve) => {
    if (generation !== speakGeneration || !window.speechSynthesis) {
      resolve();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const voice = pickPreferredInterviewerVoice(voices);
    if (voice) utterance.voice = voice;
    utterance.lang = options.lang || voice?.lang || 'en-US';
    applyInterviewerSpeechSettings(utterance);

    let started = false;
    utterance.onstart = () => {
      if (generation !== speakGeneration) return;
      if (!started) {
        started = true;
        options.onSegmentStart?.();
      }
    };
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Speak interviewer text with human pacing: slower rate + brief pauses between sentences.
 * Resolves when finished (or cancelled). Includes Chrome resume() + timeout fallbacks.
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
    let onStartFired = false;

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

    const segments = splitTextForNaturalSpeech(trimmed);

    void (async () => {
      for (let i = 0; i < segments.length; i += 1) {
        if (generation !== speakGeneration || settled) return;

        await speakSingleUtterance(segments[i]!, generation, {
          lang: options?.lang,
          onSegmentStart: () => {
            if (onStartFired) return;
            onStartFired = true;
            options?.onStart?.();
          },
        });

        if (i < segments.length - 1 && generation === speakGeneration && !settled) {
          await pause(INTERVIEWER_SPEECH_PROFILE.pauseAfterSentenceMs);
        }
      }
      done();
    })();
  });
}
