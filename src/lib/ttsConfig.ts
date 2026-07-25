/** Browser Speech API rate when cloud TTS falls back (1.0 = normal). Slightly under 1 for clarity. */
export const BROWSER_TTS_RATE = 0.95;

/** HTMLAudio playback rate for cloud MP3 (1.0 = natural). */
export const CLOUD_TTS_PLAYBACK_RATE = 0.98;

/** Delay before speaking a new AI turn after state update. */
export const TTS_TURN_START_DELAY_MS = 10;

/** Pause after interviewer finishes before opening mic. */
export const TTS_AFTER_SPEAK_MIC_DELAY_MS = 15;

/** Pause between intro block and first question. */
export const TTS_INTRO_TO_QUESTION_PAUSE_MS = 10;

/** Delay before live-room intro TTS starts (UI paint). */
export const TTS_LIVE_ROOM_READY_MS = 40;
