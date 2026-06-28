import type { InterviewLanguageCode } from '@/lib/interviewLanguages';
import { normalizeInterviewLanguage } from '@/lib/interviewLanguages';

const TTS_SPEAKING_EVENT = 'intervion-tts-speaking';

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
  language: InterviewLanguageCode | string
): Promise<ArrayBuffer> {
  const lang = normalizeInterviewLanguage(language);
  const res = await fetch('/api/proxy/ai/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.trim().slice(0, 4000), language: lang }),
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
  activeAudio = audio;

  return new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      stopServerTtsPlayback();
      options?.onEnd?.();
      resolve();
    };

    audio.onplay = () => {
      setInterviewerSpeaking(true);
      options?.onStart?.();
    };
    audio.onended = done;
    audio.onerror = done;
    void audio.play().catch(done);
  });
}

export async function speakViaServerTts(
  text: string,
  language: InterviewLanguageCode | string,
  options?: { onStart?: () => void; onEnd?: () => void }
): Promise<void> {
  const buffer = await fetchServerTtsAudio(text, language);
  await playServerTtsAudio(buffer, options);
}
