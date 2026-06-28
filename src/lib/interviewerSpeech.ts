import {
  applyInterviewerSpeechSettings,
  estimateInterviewerSpeechDurationMs,
  pickInterviewerVoiceForLanguage,
  primarySpeechLanguage,
  waitForSpeechVoices,
} from '@/lib/voicePreferences';
import { normalizeInterviewLanguage, speechSynthesisLang } from '@/lib/interviewLanguages';
import {
  speakViaServerTts,
  stopServerTtsPlayback,
  setInterviewerSpeaking,
  primeInterviewAudio,
} from '@/lib/serverTts';

let speakGeneration = 0;

function resolveSynthesisLang(lang?: string): string {
  if (!lang?.trim()) return 'en-US';
  if (lang.includes('-')) return lang;
  return speechSynthesisLang(normalizeInterviewLanguage(lang));
}

function resolveInterviewLanguageCode(lang?: string) {
  return normalizeInterviewLanguage(lang || 'en-US');
}

function stopCurrentPlayback(): void {
  stopServerTtsPlayback();
  setInterviewerSpeaking(false);
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/** Cancel any in-progress interviewer TTS (cloud + browser). */
export function cancelInterviewerSpeech(): void {
  speakGeneration += 1;
  stopCurrentPlayback();
}

async function speakViaBrowser(
  trimmed: string,
  synthesisLang: string,
  generation: number,
  options?: { onStart?: () => void; onEnd?: () => void }
): Promise<void> {
  if (!window.speechSynthesis) {
    options?.onStart?.();
    options?.onEnd?.();
    return;
  }

  await waitForSpeechVoices(primarySpeechLanguage(synthesisLang) === 'en' ? 1200 : 2800);

  return new Promise<void>((resolve) => {
    let settled = false;
    let resumeInterval: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const done = () => {
      if (settled || generation !== speakGeneration) return;
      settled = true;
      if (resumeInterval) clearInterval(resumeInterval);
      if (timeoutId) clearTimeout(timeoutId);
      setInterviewerSpeaking(false);
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
      window.speechSynthesis.cancel();
      done();
    }, estimateInterviewerSpeechDurationMs(trimmed));

    const utterance = new SpeechSynthesisUtterance(trimmed);
    const voices = window.speechSynthesis.getVoices();
    const voice = pickInterviewerVoiceForLanguage(voices, synthesisLang);
    utterance.lang = synthesisLang;
    if (voice) utterance.voice = voice;
    applyInterviewerSpeechSettings(utterance);

    utterance.onstart = () => {
      if (generation !== speakGeneration) return;
      setInterviewerSpeaking(true);
      options?.onStart?.();
    };
    utterance.onend = done;
    utterance.onerror = done;
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Speak interviewer text using cloud TTS (all languages, all browsers).
 * Falls back to browser Speech Synthesis if the server is unreachable.
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
  stopCurrentPlayback();

  const interviewLang = resolveInterviewLanguageCode(options?.lang);
  const synthesisLang = resolveSynthesisLang(options?.lang);

  const serverTimeoutMs = Math.min(120000, estimateInterviewerSpeechDurationMs(trimmed) + 15000);

  try {
    await Promise.race([
      speakViaServerTts(trimmed, interviewLang, {
        onStart: () => {
          if (generation !== speakGeneration) return;
          options?.onStart?.();
        },
        onEnd: () => {
          if (generation !== speakGeneration) return;
          options?.onEnd?.();
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Server TTS timeout')), serverTimeoutMs)
      ),
    ]);
    return;
  } catch (err) {
    if (generation !== speakGeneration) return;
    console.warn('[TTS] Cloud TTS unavailable, using browser fallback', err);
  }

  if (generation !== speakGeneration) return;
  await speakViaBrowser(trimmed, synthesisLang, generation, options);
}

export { subscribeInterviewerSpeaking, setInterviewerSpeaking, primeInterviewAudio } from '@/lib/serverTts';
