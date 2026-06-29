/** Whisper often returns its prompt on silence — must never auto-submit these. */
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
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isSttHallucination(transcript: string): boolean {
  const t = normalize(transcript);
  if (!t) return true;
  return HALLUCINATION_SUBSTRINGS.some((phrase) => t.includes(normalize(phrase)));
}

export function isAnswerTooShort(transcript: string): boolean {
  const trimmed = transcript.trim();
  if (!trimmed) return true;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 3) return false;
  if (trimmed.length >= 18) return false;
  return words.length < 2 || trimmed.length < 10;
}

export function isInvalidCandidateTranscript(transcript: string): boolean {
  return isSttHallucination(transcript) || isAnswerTooShort(transcript);
}
