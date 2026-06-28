export const INTERVIEWER_VOICE_STORAGE_KEY = 'interviewerVoicePreference';
const INTERVIEWER_VOICE_BY_LANG_KEY = 'interviewerVoiceByLanguage';

/** Browser default pace — rate 1.0, no extra pauses. */
export const INTERVIEWER_SPEECH_PROFILE = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
} as const;

/** Timeout fallback for TTS at the configured speech rate. */
export function estimateInterviewerSpeechDurationMs(text: string): number {
  const { rate } = INTERVIEWER_SPEECH_PROFILE;
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const chars = trimmed.length;
  const hasRtl = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u4E00-\u9FFF]/.test(trimmed);
  const msPerWord = 450 / rate;
  const fromWords = words * msPerWord + 1000;
  const fromChars = hasRtl ? (chars / 11) * (1000 / rate) + 800 : 0;
  const estimated = hasRtl ? Math.max(fromWords, fromChars) : fromWords;
  return Math.max(3500, Math.min(120000, estimated));
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
  return readSavedVoicePreferenceForLanguage('en-US');
}

function readLegacyVoicePreference(): SavedVoicePreference | null {
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

/** Saved recruiter/candidate voice choice for a specific interview language. */
export function readSavedVoicePreferenceForLanguage(lang?: string): SavedVoicePreference | null {
  if (typeof window === 'undefined') return null;
  const primary = primarySpeechLanguage(lang);

  if (primary === 'en') {
    const legacy = readLegacyVoicePreference();
    if (legacy) return legacy;
  }

  const raw = window.localStorage.getItem(INTERVIEWER_VOICE_BY_LANG_KEY);
  if (!raw) return null;
  try {
    const map = JSON.parse(raw) as Record<string, SavedVoicePreference>;
    const pref = map[primary];
    if (!pref?.name) return null;
    return pref;
  } catch {
    return null;
  }
}

export function writeSavedVoicePreference(voice: SpeechSynthesisVoice | null): void {
  writeSavedVoicePreferenceForLanguage(voice, voice?.lang ?? 'en-US');
}

export function writeSavedVoicePreferenceForLanguage(
  voice: SpeechSynthesisVoice | null,
  lang?: string
): void {
  if (typeof window === 'undefined') return;
  const primary = primarySpeechLanguage(lang ?? voice?.lang);

  const raw = window.localStorage.getItem(INTERVIEWER_VOICE_BY_LANG_KEY);
  let map: Record<string, SavedVoicePreference> = {};
  if (raw) {
    try {
      map = JSON.parse(raw) as Record<string, SavedVoicePreference>;
    } catch {
      map = {};
    }
  }

  if (!voice) {
    delete map[primary];
    window.localStorage.setItem(INTERVIEWER_VOICE_BY_LANG_KEY, JSON.stringify(map));
    if (primary === 'en') window.localStorage.removeItem(INTERVIEWER_VOICE_STORAGE_KEY);
    return;
  }

  const pref = { name: voice.name, lang: voice.lang };
  map[primary] = pref;
  window.localStorage.setItem(INTERVIEWER_VOICE_BY_LANG_KEY, JSON.stringify(map));
  if (primary === 'en') {
    window.localStorage.setItem(INTERVIEWER_VOICE_STORAGE_KEY, JSON.stringify(pref));
  }
}

export function voiceKeyFor(voice: SpeechSynthesisVoice): string {
  return `${voice.name}||${voice.lang}`;
}

export function voiceFromKey(
  voices: SpeechSynthesisVoice[],
  key: string
): SpeechSynthesisVoice | null {
  const [name, lang] = key.split('||');
  return voices.find((v) => v.name === name && v.lang === lang) ?? null;
}

/** Voices installed on this device that match the interview language. */
export function filterVoicesForLanguage(
  voices: SpeechSynthesisVoice[],
  lang?: string
): SpeechSynthesisVoice[] {
  if (!voices.length) return [];
  const primary = primarySpeechLanguage(lang);
  const matching = voices.filter((v) => voiceMatchesPrimaryLang(v.lang, primary));
  return matching;
}

export function pickPreferredInterviewerVoice(
  voices: SpeechSynthesisVoice[],
  hints: string[] = NATURAL_VOICE_HINTS
): SpeechSynthesisVoice | null {
  return pickInterviewerVoiceForLanguage(voices, 'en-US', hints);
}

/** Primary BCP-47 subtag for voice matching (en-US → en, ar-SA → ar). */
export function primarySpeechLanguage(lang?: string): string {
  if (!lang?.trim()) return 'en';
  const norm = lang.trim().toLowerCase().replace('_', '-');
  if (norm.startsWith('en')) return 'en';
  return norm.split('-')[0] || 'en';
}

function voiceMatchesPrimaryLang(voiceLang: string, primary: string): boolean {
  const vl = voiceLang.toLowerCase().replace('_', '-');
  if (primary === 'en') return vl.startsWith('en');
  return vl.startsWith(primary);
}

/** Preferred voice name fragments per interview language (OS/browser dependent). */
const LANGUAGE_VOICE_HINTS: Record<string, string[]> = {
  en: NATURAL_VOICE_HINTS,
  ar: [
    'Microsoft Hoda',
    'Microsoft Naayf',
    'Microsoft Salma',
    'Google العربية',
    'Google Arabic',
    'Arabic',
    'ar-SA',
    'ar-EG',
  ],
  ur: ['Microsoft Gul', 'Google Urdu', 'Urdu', 'ur-PK'],
  hi: ['Microsoft Swara', 'Microsoft Hemant', 'Google Hindi', 'hi-IN', 'Hindi'],
  fr: ['Microsoft Denise', 'Microsoft Henri', 'Google français', 'French', 'fr-FR'],
  de: ['Microsoft Katja', 'Microsoft Conrad', 'Google Deutsch', 'German', 'de-DE'],
  es: ['Microsoft Elvira', 'Microsoft Pablo', 'Google español', 'Spanish', 'es-ES'],
};

/**
 * Pick a speech synthesis voice for the interview language.
 * Never falls back to English when the interview is Arabic/Urdu/etc.
 */
export function pickInterviewerVoiceForLanguage(
  voices: SpeechSynthesisVoice[],
  lang?: string,
  englishHints: string[] = NATURAL_VOICE_HINTS
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;

  const primary = primarySpeechLanguage(lang);
  const normalizedLang = (lang || 'en-US').toLowerCase().replace('_', '-');
  const matching = voices.filter((v) => voiceMatchesPrimaryLang(v.lang, primary));

  if (primary === 'en') {
    return pickEnglishInterviewerVoice(voices, englishHints);
  }

  const saved = readSavedVoicePreferenceForLanguage(lang);
  if (saved) {
    const exactSaved = matching.find(
      (v) => v.name === saved.name && (!saved.lang || v.lang === saved.lang)
    );
    if (exactSaved) return exactSaved;
  }

  if (!matching.length) return null;

  const hints = LANGUAGE_VOICE_HINTS[primary] ?? [];
  for (const hint of hints) {
    const hit = matching.find((v) => v.name.toLowerCase().includes(hint.toLowerCase()));
    if (hit) return hit;
  }

  const exactLocale = matching.find((v) => v.lang.toLowerCase().replace('_', '-') === normalizedLang);
  if (exactLocale) return exactLocale;

  const prefixLocale = matching.find((v) =>
    v.lang.toLowerCase().replace('_', '-').startsWith(`${primary}-`)
  );
  if (prefixLocale) return prefixLocale;

  return matching[0] ?? null;
}

/** English-only picker (respects saved recruiter preview preference). */
function pickEnglishInterviewerVoice(
  voices: SpeechSynthesisVoice[],
  hints: string[]
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;

  const saved = readSavedVoicePreference();
  if (saved) {
    const exactSaved = voices.find(
      (v) =>
        v.name === saved.name &&
        (!saved.lang || v.lang === saved.lang) &&
        voiceMatchesPrimaryLang(v.lang, 'en')
    );
    if (exactSaved) return exactSaved;
  }

  const enVoices = voices.filter((v) => voiceMatchesPrimaryLang(v.lang, 'en'));

  for (const hint of hints) {
    const exact = enVoices.find((v) => v.name.toLowerCase().includes(hint.toLowerCase()));
    if (exact) return exact;
  }

  const enUS = enVoices.find(
    (v) =>
      v.lang.toLowerCase().startsWith('en-us') &&
      !v.name.toLowerCase().includes('google us english')
  );
  if (enUS) return enUS;

  return enVoices[0] ?? voices[0] ?? null;
}

export function hasVoiceForLanguage(voices: SpeechSynthesisVoice[], lang?: string): boolean {
  const primary = primarySpeechLanguage(lang);
  if (primary === 'en') return voices.some((v) => voiceMatchesPrimaryLang(v.lang, 'en'));
  return voices.some((v) => voiceMatchesPrimaryLang(v.lang, primary));
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
