import type { InterviewLanguageCode } from '@/lib/interviewLanguages';
import type { InterviewerPersona } from '@/types';
import { normalizeInterviewLanguage } from '@/lib/interviewLanguages';
import { CLOUD_TTS_PLAYBACK_RATE } from '@/lib/ttsConfig';

const TTS_SPEAKING_EVENT = 'intervion-tts-speaking';

/** Minimal silent WAV — unlocks HTMLAudio autoplay after a user gesture. */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQAAAAA=';

let audioPrimed = false;

/** Call on button click (Sounds good, Preview, etc.) so later TTS can autoplay. */
export function primeInterviewAudio(): void {
  if (audioPrimed || typeof window === 'undefined') return;
  audioPrimed = true;
  try {
    const silent = new Audio(SILENT_WAV);
    silent.volume = 0.001;
    void silent.play().catch(() => {
      audioPrimed = false;
    });
    const Ctx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      void ctx.resume();
    }
  } catch {
    audioPrimed = false;
  }
}

export function setInterviewerSpeaking(active: boolean): void {
  if (typeof document === 'undefined') return;
  document.dispatchEvent(new CustomEvent(TTS_SPEAKING_EVENT, { detail: { speaking: active } }));
}

export function subscribeInterviewerSpeaking(onChange: (speaking: boolean) => void): () => void {
  if (typeof document === 'undefined') return () => undefined;
  const handler = (e: Event) => {
    const speaking = Boolean((e as CustomEvent<{ speaking?: boolean }>).detail?.speaking);
    onChange(speaking);
  };
  document.addEventListener(TTS_SPEAKING_EVENT, handler);
  return () => document.removeEventListener(TTS_SPEAKING_EVENT, handler);
}

/** Fetch MP3 from backend Edge TTS (Urdu, Arabic, all supported languages). */
export async function fetchServerTtsAudio(
  text: string,
  language: InterviewLanguageCode | string,
  persona?: InterviewerPersona | string
): Promise<ArrayBuffer> {
  const lang = normalizeInterviewLanguage(language);
  const body: Record<string, string> = {
    text: text.trim().slice(0, 4000),
    language: lang,
  };
  if (persona) body.persona = persona === 'zara' ? 'zara' : 'ethan';
  const res = await fetch('/api/proxy/ai/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || 'TTS request failed');
  }
  return res.arrayBuffer();
}

let activeAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;

export function stopServerTtsPlayback(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = '';
    activeAudio = null;
  }
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
  setInterviewerSpeaking(false);
}

export async function playServerTtsAudio(
  buffer: ArrayBuffer,
  options?: { onStart?: () => void; onEnd?: () => void }
): Promise<void> {
  stopServerTtsPlayback();
  const blob = new Blob([buffer], { type: 'audio/mpeg' });
  const url = URL.createObjectURL(blob);
  activeObjectUrl = url;
  const audio = new Audio(url);
  audio.preload = 'auto';
  audio.playbackRate = CLOUD_TTS_PLAYBACK_RATE;
  activeAudio = audio;

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      stopServerTtsPlayback();
      options?.onEnd?.();
      resolve();
    };
    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      stopServerTtsPlayback();
      reject(err instanceof Error ? err : new Error('Audio playback failed'));
    };

    audio.onplay = () => {
      setInterviewerSpeaking(true);
      options?.onStart?.();
    };
    audio.onended = done;
    audio.onerror = () => fail(new Error('Audio element error'));
    void audio.play().catch(fail);
  });
}

export async function speakViaServerTts(
  text: string,
  language: InterviewLanguageCode | string,
  options?: { onStart?: () => void; onEnd?: () => void; persona?: InterviewerPersona | string }
): Promise<void> {
  const buffer = await fetchServerTtsAudio(text, language, options?.persona);
  await playServerTtsAudio(buffer, options);
}
