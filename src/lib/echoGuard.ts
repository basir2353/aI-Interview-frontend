import { normalizeInterviewLanguage, type InterviewLanguageCode } from '@/lib/interviewLanguages';

/** Normalize text for overlap checks (STT echo vs last AI question). */
function normalizeForEcho(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * True when transcript likely came from speaker echo of the interviewer's last line
 * rather than the candidate speaking.
 */
export function isLikelyInterviewerEcho(
  transcript: string,
  interviewerText: string,
  interviewLanguage?: InterviewLanguageCode | string
): boolean {
  const t = normalizeForEcho(transcript);
  const q = normalizeForEcho(interviewerText);
  if (!t || !q || t.length < 4) return false;
  if (t === q) return true;

  const lang = normalizeInterviewLanguage(interviewLanguage ?? 'en-US');
  const overlapThreshold = lang === 'en-US' ? 0.45 : 0.58;

  if (q.length >= 12 && (q.includes(t) || t.includes(q))) {
    if (t.length < q.length * 0.55) return false;
    return true;
  }

  const qWords = q.split(' ').filter((w) => w.length > 3);
  if (qWords.length === 0) return false;
  const tWords = new Set(t.split(' ').filter((w) => w.length > 3));
  const overlap = qWords.filter((w) => tWords.has(w)).length;
  return overlap / qWords.length >= overlapThreshold;
}
