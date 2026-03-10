export const INTERVIEWER_VOICE_STORAGE_KEY = 'interviewerVoicePreference';

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
