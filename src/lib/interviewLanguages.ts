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
  const lower = trimmed.toLowerCase();
  if (lower === 'en' || lower === 'en-us') return 'en-US';
  if (lower === 'es') return 'es';
  if (lower === 'fr') return 'fr';
  if (lower === 'de') return 'de';
  if (lower === 'hi') return 'hi';
  if (lower === 'ar') return 'ar';
  if (lower === 'ur') return 'ur';
  return DEFAULT_INTERVIEW_LANGUAGE;
}

export function interviewLanguageLabel(code: InterviewLanguageCode): string {
  return INTERVIEW_LANGUAGE_OPTIONS.find((o) => o.value === code)?.label ?? 'English';
}

/** BCP-47 tag for browser speech synthesis. */
export function speechSynthesisLang(code: InterviewLanguageCode): string {
  if (code === 'en-US') return 'en-US';
  if (code === 'ur') return 'ur-PK';
  if (code === 'hi') return 'hi-IN';
  if (code === 'ar') return 'ar-SA';
  return code;
}
