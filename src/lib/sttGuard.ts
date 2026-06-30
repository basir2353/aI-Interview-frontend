import { normalizeInterviewLanguage, type InterviewLanguageCode } from '@/lib/interviewLanguages';

const HALLUCINATION_SUBSTRINGS = [
  'this is a job interview',
  'the candidate is answering questions',
  'esta es una entrevista',
  'ceci est un entretien',
  'dies ist ein vorstellungsgespr',
  'یہ نوکری کا انٹرویو',
  'امیدوار سوالات کے جواب',
  'هذا مقابلة عمل',
  'المرشح يجيب',
  'यह एक नौकरी का साक्षात्कार',
  'thank you for watching',
  'thanks for watching',
  'please subscribe',
  'subtitles by',
  'silence',
  'music',
  'can you hear me',
  'let me think',
];

const STT_VOCAB_TOKENS: Record<InterviewLanguageCode, string[]> = {
  'en-US': ['kubernetes', 'docker', 'agile', 'scrum', 'api', 'database', 'team', 'project', 'software'],
  es: ['entrevista', 'experiencia', 'proyecto', 'equipo', 'software'],
  fr: ['entretien', 'expérience', 'projet', 'équipe', 'logiciel'],
  de: ['interview', 'erfahrung', 'projekt', 'team', 'software'],
  hi: ['अनुभव', 'प्रोजेक्ट', 'टीम', 'सॉफ्टवेयर'],
  ar: ['مقابلة', 'خبرة', 'مشروع', 'فريق', 'برمجيات'],
  ur: ['docker', 'agile', 'scrum', 'ٹیم', 'پروجیکٹ', 'سافٹ', 'سافٹ ویئر', 'software', 'project'],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordsOf(text: string): string[] {
  return normalize(text).split(' ').filter((w) => w.length > 1);
}

function matchesVocabToken(word: string, token: string): boolean {
  const w = normalize(word);
  const t = normalize(token);
  if (!w || !t) return false;
  return w === t || w.includes(t) || t.includes(w);
}

export function isPromptVocabularyEcho(
  transcript: string,
  interviewLanguage?: InterviewLanguageCode | string
): boolean {
  const lang = normalizeInterviewLanguage(interviewLanguage ?? 'en-US');
  const tokens = STT_VOCAB_TOKENS[lang] ?? STT_VOCAB_TOKENS['en-US'];
  const words = wordsOf(transcript);
  if (words.length === 0) return true;
  // Real answers often mention project/team/docker — only reject very short vocab-only clips.
  if (words.length >= 5) return false;

  const hits = words.filter((w) => tokens.some((t) => matchesVocabToken(w, t))).length;
  const ratio = hits / words.length;
  if (words.length <= 3 && ratio >= 0.85) return true;
  return false;
}

export function isSttHallucination(
  transcript: string,
  interviewLanguage?: InterviewLanguageCode | string
): boolean {
  const t = normalize(transcript);
  if (!t) return true;
  if (HALLUCINATION_SUBSTRINGS.some((phrase) => t.includes(normalize(phrase)))) return true;
  return isPromptVocabularyEcho(transcript, interviewLanguage);
}

export function isAnswerTooShort(
  transcript: string,
  interviewLanguage?: InterviewLanguageCode | string
): boolean {
  const trimmed = transcript.trim();
  if (!trimmed) return true;
  const lang = normalizeInterviewLanguage(interviewLanguage ?? 'en-US');
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 3) return false;
  const minChars = lang === 'en-US' ? 18 : 12;
  if (trimmed.length >= minChars) return false;
  return true;
}

export function isInvalidCandidateTranscript(
  transcript: string,
  interviewLanguage?: InterviewLanguageCode | string
): boolean {
  return isSttHallucination(transcript, interviewLanguage) || isAnswerTooShort(transcript, interviewLanguage);
}
