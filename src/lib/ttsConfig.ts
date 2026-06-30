/** Browser Speech API rate when cloud TTS falls back (1.0 = normal). */
export const BROWSER_TTS_RATE = 1.18;

/** HTMLAudio playback rate for cloud MP3 (1.0 = normal). */
export const CLOUD_TTS_PLAYBACK_RATE = 1.05;

/** Delay before speaking a new AI turn after state update. */
export const TTS_TURN_START_DELAY_MS = 40;

/** Pause after interviewer finishes before opening mic (avoids TTS speaker echo). */
export const TTS_AFTER_SPEAK_MIC_DELAY_MS = 1800;

/** Shorter guard when TTS already finished (intro / manual speak path). */
export const TTS_POST_SPEECH_MIC_DELAY_MS = 500;

/** Pause between intro block and first question. */
export const TTS_INTRO_TO_QUESTION_PAUSE_MS = 450;

/** Delay before live-room intro TTS starts (UI paint). */
export const TTS_LIVE_ROOM_READY_MS = 40;

/** Sustained silence after speech before auto-stop + transcribe (interview room). */
export const INTERVIEW_SILENCE_AUTO_STOP_MS = 2_200;

/** Max time mic stays open with no detected speech before auto-stop + transcribe attempt. */
export const INTERVIEW_NO_SPEECH_IDLE_MS = 15_000;
