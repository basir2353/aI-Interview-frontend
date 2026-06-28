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

/** Cloud TTS voice labels (Microsoft Edge neural — works in every browser). */
export const CLOUD_TTS_VOICE_LABEL: Record<InterviewLanguageCode, string> = {
  'en-US': 'Jenny (English)',
  es: 'Elvira (Español)',
  fr: 'Denise (Français)',
  de: 'Katja (Deutsch)',
  hi: 'Swara (हिन्दी)',
  ar: 'Zariyah (العربية)',
  ur: 'Uzma (اردو)',
};

export function cloudTtsVoiceLabel(code: InterviewLanguageCode): string {
  return CLOUD_TTS_VOICE_LABEL[code] ?? CLOUD_TTS_VOICE_LABEL['en-US'];
}
