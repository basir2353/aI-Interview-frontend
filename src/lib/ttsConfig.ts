/** Browser Speech API rate when cloud TTS falls back (1.0 = normal). */
export const BROWSER_TTS_RATE = 1.18;

/** HTMLAudio playback rate for cloud MP3 (1.0 = normal). */
export const CLOUD_TTS_PLAYBACK_RATE = 1.05;

/** Delay before speaking a new AI turn after state update. */
export const TTS_TURN_START_DELAY_MS = 40;

/** Pause after interviewer finishes before opening mic (avoids TTS speaker echo). */
export const TTS_AFTER_SPEAK_MIC_DELAY_MS = 3800;

/** Pause between intro block and first question. */
export const TTS_INTRO_TO_QUESTION_PAUSE_MS = 450;

/** Delay before live-room intro TTS starts (UI paint). */
export const TTS_LIVE_ROOM_READY_MS = 40;
