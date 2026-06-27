export const INTERVIEWER_VOICE_STORAGE_KEY = 'interviewerVoicePreference';

/** Conversational interview pace — slightly under 1.0; no long gaps between lines. */
export const INTERVIEWER_SPEECH_PROFILE = {
  /** ~150 WPM — a touch slower than default 1.0, not sluggish */
  rate: 0.91,
  pitch: 1.0,
  volume: 1.0,
  /** Short breath between sentences (~120ms, not a full 1s pause) */
  pauseAfterSentenceMs: 120,
} as const;

export function splitTextForNaturalSpeech(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const sentences = trimmed.match(/[^.!?…]+(?:[.!?…]+|$)/g);
  if (!sentences?.length) return [trimmed];
  return sentences.map((s) => s.trim()).filter(Boolean);
}

/** Timeout fallback for TTS — accounts for slower rate + inter-sentence pauses. */
export function estimateInterviewerSpeechDurationMs(text: string): number {
  const { rate, pauseAfterSentenceMs } = INTERVIEWER_SPEECH_PROFILE;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const segments = splitTextForNaturalSpeech(text);
  const pauseMs = Math.max(0, segments.length - 1) * pauseAfterSentenceMs;
  const msPerWord = 480 / rate;
  return Math.max(3500, Math.min(120000, words * msPerWord + 700 + pauseMs));
}

export function applyInterviewerSpeechSettings(utterance: SpeechSynthesisUtterance): void {
  const { rate, pitch, volume } = INTERVIEWER_SPEECH_PROFILE;
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = volume;
}

export const NATURAL_VOICE_HINTS = [
  'Microsoft Aria Online (Natural)',
  'Microsoft Jenny Online (Natural)',
  'Microsoft Aria',
  'Microsoft Jenny',
  'Google UK English Female',
  'Google UK English Male',
  'Samantha',
  'Karen',
  'Ava',
  'Daniel',
  'Serena',
  'Moira',
];

interface SavedVoicePreference {
  name: string;
  lang?: string;
}

export function readSavedVoicePreference(): SavedVoicePreference | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(INTERVIEWER_VOICE_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SavedVoicePreference;
    if (!parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSavedVoicePreference(voice: SpeechSynthesisVoice | null): void {
  if (typeof window === 'undefined') return;
  if (!voice) {
    window.localStorage.removeItem(INTERVIEWER_VOICE_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(
    INTERVIEWER_VOICE_STORAGE_KEY,
    JSON.stringify({ name: voice.name, lang: voice.lang })
  );
}

export function pickPreferredInterviewerVoice(
  voices: SpeechSynthesisVoice[],
  hints: string[] = NATURAL_VOICE_HINTS
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;

  const saved = readSavedVoicePreference();
  if (saved) {
    const exactSaved = voices.find(
      (v) => v.name === saved.name && (!saved.lang || v.lang === saved.lang)
    );
    if (exactSaved) return exactSaved;
  }

  for (const hint of hints) {
    const exact = voices.find((v) => v.name.toLowerCase().includes(hint.toLowerCase()));
    if (exact) return exact;
  }

  const enUS = voices.find(
    (v) =>
      v.lang.toLowerCase().startsWith('en-us') &&
      !v.name.toLowerCase().includes('google us english')
  );
  if (enUS) return enUS;

  const enAny = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
  return enAny ?? voices[0] ?? null;
}

/**
 * Some browsers load voices asynchronously. If we speak too early, the first
 * utterance can use a robotic default voice. Wait briefly for voices to load.
 */
export async function waitForSpeechVoices(
  maxWaitMs = 1200,
  pollIntervalMs = 80
): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];

  const synth = window.speechSynthesis;
  const startedAt = Date.now();
  let voices = synth.getVoices();

  while (!voices.length && Date.now() - startedAt < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    voices = synth.getVoices();
  }

  return voices;
}
