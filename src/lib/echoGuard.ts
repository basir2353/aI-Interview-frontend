import { normalizeInterviewLanguage, type InterviewLanguageCode } from '@/lib/interviewLanguages';

function normalizeForEcho(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Spoken filler / ack lines that must never be submitted as candidate answers. */
const ENGAGEMENT_ECHO_MARKERS = [
  'mm-hmm',
  'got it',
  'give me just a moment',
  'one moment',
  'one second',
  'think of a good follow',
  'still with you',
  'bear with me',
  'almost ready',
  'thank you for your time',
  'that concludes our interview',
  'جی سمجھ گیا',
  'سمجھ گیا',
  'سمجھ آ گیا',
  'بس ایک لمحہ',
  'یہ اچھا point',
  'میں یہیں ہوں',
  'سوچ رہا',
  'اگلا سوال',
  'شکریہ',
  'ٹھیک ہے',
  'dhanyavad',
  'entendido',
  'un momento',
  'merci',
  'un instant',
];

function isEngagementPhraseEcho(transcript: string): boolean {
  const t = normalizeForEcho(transcript);
  if (!t) return false;
  return ENGAGEMENT_ECHO_MARKERS.some((m) => t.includes(normalizeForEcho(m)));
}

function echoOverlap(transcript: string, interviewerText: string, lang: InterviewLanguageCode): boolean {
  const t = normalizeForEcho(transcript);
  const q = normalizeForEcho(interviewerText);
  if (!t || !q || t.length < 4) return false;
  if (t === q) return true;

  const overlapThreshold = lang === 'en-US' ? 0.42 : 0.55;

  if (q.length >= 10 && (q.includes(t) || t.includes(q))) {
    if (t.length < q.length * 0.5) return false;
    return true;
  }

  const qWords = q.split(' ').filter((w) => w.length > 2);
  if (qWords.length === 0) return false;
  const tWords = new Set(t.split(' ').filter((w) => w.length > 2));
  const overlap = qWords.filter((w) => tWords.has(w)).length;
  return overlap / qWords.length >= overlapThreshold;
}

/** Collect all AI lines the mic could pick up from speakers (questions, intro, etc.). */
export function collectInterviewerTexts(
  turns: { role: string; content?: string; isIntro?: boolean }[] | undefined,
  extras: string[] = []
): string[] {
  const fromTurns = (turns ?? [])
    .filter((t) => t.role === 'ai')
    .map((t) => (t.content ?? '').trim())
    .filter(Boolean);
  const extra = extras.map((s) => s.trim()).filter(Boolean);
  return [...new Set([...fromTurns, ...extra])];
}

/**
 * True when transcript likely came from speaker echo of interviewer speech
 * rather than the candidate speaking.
 */
export function isLikelyInterviewerEcho(
  transcript: string,
  interviewerTextOrTexts: string | string[],
  interviewLanguage?: InterviewLanguageCode | string
): boolean {
  const lang = normalizeInterviewLanguage(interviewLanguage ?? 'en-US');
  if (isEngagementPhraseEcho(transcript)) return true;

  const texts = Array.isArray(interviewerTextOrTexts)
    ? interviewerTextOrTexts
    : [interviewerTextOrTexts];

  for (const text of texts) {
    if (text?.trim() && echoOverlap(transcript, text, lang)) return true;
  }
  return false;
}
