import type { InterviewState } from '@/types';

export const DEFAULT_INTERVIEW_DURATION_MINUTES = 16;
export const MAX_INTERVIEW_DURATION_MINUTES = 17;

export const INTERVIEW_TIME_UP_MESSAGE =
  "Thank you for your time today. We've reached the end of our scheduled interview. It was great speaking with you, and we'll be in touch with next steps soon. This interview is now complete. Take care!";

export function resolveInterviewDurationMinutes(scheduled?: number): number {
  const raw = scheduled ?? DEFAULT_INTERVIEW_DURATION_MINUTES;
  return Math.min(Math.max(raw, 1), MAX_INTERVIEW_DURATION_MINUTES);
}

export function getInterviewLiveStartAt(state: InterviewState): string {
  return state.liveStartedAt ?? state.startedAt;
}

export function getInterviewElapsedSeconds(state: InterviewState, nowMs: number = Date.now()): number {
  const startMs = new Date(getInterviewLiveStartAt(state)).getTime();
  if (!Number.isFinite(startMs)) return 0;
  return Math.max(0, Math.floor((nowMs - startMs) / 1000));
}

export function getInterviewRemainingSeconds(state: InterviewState, nowMs: number = Date.now()): number {
  const limitSeconds = resolveInterviewDurationMinutes(state.durationMinutes) * 60;
  return Math.max(0, limitSeconds - getInterviewElapsedSeconds(state, nowMs));
}

export function isInterviewTimeExpired(state: InterviewState, nowMs: number = Date.now()): boolean {
  return getInterviewRemainingSeconds(state, nowMs) <= 0;
}
