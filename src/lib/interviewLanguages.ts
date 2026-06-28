/** Interview locale options — keep in sync with backend/src/constants/interviewLanguage.ts */

export const INTERVIEW_LANGUAGE_OPTIONS = [
  { value: 'en-US', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'ar', label: 'العربية' },
  { value: 'ur', label: 'اردو' },
] as const;

export type InterviewLanguageCode = (typeof INTERVIEW_LANGUAGE_OPTIONS)[number]['value'];

export const DEFAULT_INTERVIEW_LANGUAGE: InterviewLanguageCode = 'en-US';

export function normalizeInterviewLanguage(value: unknown): InterviewLanguageCode {
  if (typeof value !== 'string') return DEFAULT_INTERVIEW_LANGUAGE;
  const trimmed = value.trim();
  if (INTERVIEW_LANGUAGE_OPTIONS.some((o) => o.value === trimmed)) {
    return trimmed as InterviewLanguageCode;
  }
  const lower = trimmed.toLowerCase().replace('_', '-');
  if (lower === 'en' || lower.startsWith('en-') || lower === 'english') return 'en-US';
  if (lower === 'es' || lower.startsWith('es-') || lower === 'spanish' || lower === 'español') return 'es';
  if (lower === 'fr' || lower.startsWith('fr-') || lower === 'french' || lower === 'français') return 'fr';
  if (lower === 'de' || lower.startsWith('de-') || lower === 'german' || lower === 'deutsch') return 'de';
  if (lower === 'hi' || lower.startsWith('hi-') || lower === 'hindi') return 'hi';
  if (lower === 'ar' || lower.startsWith('ar-') || lower === 'arabic') return 'ar';
  if (lower === 'ur' || lower.startsWith('ur-') || lower === 'urdu') return 'ur';
  return DEFAULT_INTERVIEW_LANGUAGE;
}

export function interviewLanguageLabel(code: InterviewLanguageCode): string {
  return INTERVIEW_LANGUAGE_OPTIONS.find((o) => o.value === code)?.label ?? 'English';
}

/** Sample phrase for voice preview in each interview language. */
export function voicePreviewPhrase(code: InterviewLanguageCode): string {
  const phrases: Record<InterviewLanguageCode, string> = {
    'en-US': 'Hello, I am your interviewer. Let us begin with the first question.',
    es: 'Hola, soy su entrevistador. Comencemos con la primera pregunta.',
    fr: 'Bonjour, je suis votre intervieweur. Commençons par la première question.',
    de: 'Hallo, ich bin Ihr Interviewer. Beginnen wir mit der ersten Frage.',
    hi: 'नमस्ते, मैं आपका साक्षात्कारकर्ता हूँ। आइए पहले प्रश्न से शुरू करें।',
    ar: 'مرحباً، أنا محاورك. لنبدأ بالسؤال الأول.',
    ur: 'سلام، میں آپ کا انٹرویو لینے والا ہوں۔ آئیے پہلا سوال شروع کرتے ہیں۔',
  };
  return phrases[code];
}
export function speechSynthesisLang(code: InterviewLanguageCode): string {
  if (code === 'en-US') return 'en-US';
  if (code === 'ur') return 'ur-PK';
  if (code === 'hi') return 'hi-IN';
  if (code === 'ar') return 'ar-SA';
  return code;
}

/** Cloud TTS voice labels — female (ZaraAlex) vs male (Ethan). */
const CLOUD_TTS_FEMALE_LABEL: Record<InterviewLanguageCode, string> = {
  'en-US': 'Jenny (English, female)',
  es: 'Elvira (Español, female)',
  fr: 'Denise (Français, female)',
  de: 'Katja (Deutsch, female)',
  hi: 'Swara (हिन्दी, female)',
  ar: 'Zariyah (العربية, female)',
  ur: 'Uzma (اردو, female)',
};

const CLOUD_TTS_MALE_LABEL: Record<InterviewLanguageCode, string> = {
  'en-US': 'Guy (English, male)',
  es: 'Alvaro (Español, male)',
  fr: 'Henri (Français, male)',
  de: 'Conrad (Deutsch, male)',
  hi: 'Madhur (हिन्दी, male)',
  ar: 'Hamed (العربية, male)',
  ur: 'Asad (اردو, male)',
};

/** @deprecated use cloudTtsVoiceLabel(code, persona) */
export const CLOUD_TTS_VOICE_LABEL: Record<InterviewLanguageCode, string> = CLOUD_TTS_FEMALE_LABEL;

export function cloudTtsVoiceLabel(
  code: InterviewLanguageCode,
  persona: 'ethan' | 'zara' = 'ethan'
): string {
  const labels = persona === 'zara' ? CLOUD_TTS_FEMALE_LABEL : CLOUD_TTS_MALE_LABEL;
  return labels[code] ?? labels['en-US'];
}

/** Whisper.cpp / OpenAI STT ISO 639-1 code for transcription. */
export function whisperSttLanguage(code: InterviewLanguageCode): string {
  if (code === 'en-US') return 'en';
  return code;
}

/** Primary STT language from interview locale (better than auto for Urdu/Arabic). */
export function sttLanguageForInterview(code?: InterviewLanguageCode): string {
  return whisperSttLanguage(normalizeInterviewLanguage(code ?? DEFAULT_INTERVIEW_LANGUAGE));
}

/** Non-English interviews may mix English — backend runs a second auto pass when true. */
export function sttAllowsMixedLanguage(code?: InterviewLanguageCode): boolean {
  return normalizeInterviewLanguage(code ?? DEFAULT_INTERVIEW_LANGUAGE) !== 'en-US';
}
