'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { AudioRecorderHandle } from '@/components/AudioRecorder';
import type { VoicePipelinePhase } from '@/components/interview/InterviewStatusBar';
import {
  TTS_AFTER_SPEAK_MIC_DELAY_MS,
  TTS_POST_SPEECH_MIC_DELAY_MS,
} from '@/lib/ttsConfig';

type AiTurnLike = {
  isCodingQuestion?: boolean;
  codingStarterCode?: string | null;
  codingLanguage?: string | null;
} | null | undefined;

export interface UseInterviewVoiceLoopOptions {
  voiceEnabled: boolean;
  live: boolean;
  interviewLang: string;
  audioRecorderRef: RefObject<AudioRecorderHandle | null>;
  introPlaybackActiveRef: RefObject<boolean>;
  getLatestAiTurn: () => AiTurnLike;
}

function isCodingTurn(turn: AiTurnLike): boolean {
  return Boolean(turn?.isCodingQuestion || turn?.codingStarterCode || turn?.codingLanguage);
}

/**
 * Single owner of mic open/close for the live interview room.
 * Flow: interviewer speaks → delay → mic opens → user speaks → transcribe → submit → repeat.
 */
export function useInterviewVoiceLoop({
  voiceEnabled,
  live,
  interviewLang,
  audioRecorderRef,
  introPlaybackActiveRef,
  getLatestAiTurn,
}: UseInterviewVoiceLoopOptions) {
  const [micOn, setMicOn] = useState(false);
  const [autoMicPending, setAutoMicPending] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoicePipelinePhase>('idle');
  const [captureError, setCaptureError] = useState('');

  const userMutedRef = useRef(false);
  const autoListeningRef = useRef(false);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenWindowRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openGenerationRef = useRef(0);
  const phaseRef = useRef<VoicePipelinePhase>('idle');
  const micOnRef = useRef(false);
  const noSpeechRetryRef = useRef(0);
  const idleStopRef = useRef(false);
  const voiceEnabledRef = useRef(voiceEnabled);
  const liveRef = useRef(live);
  const submittingRef = useRef(false);
  const transcribingRef = useRef(false);
  const lastClipHadSpeechRef = useRef(false);
  const userInitiatedMicRef = useRef(false);
  const getLatestAiTurnRef = useRef(getLatestAiTurn);
  const lastSpeakStartAtRef = useRef(0);

  useEffect(() => {
    phaseRef.current = voicePhase;
  }, [voicePhase]);
  useEffect(() => {
    micOnRef.current = micOn;
  }, [micOn]);
  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);
  useEffect(() => {
    liveRef.current = live;
  }, [live]);
  useEffect(() => {
    getLatestAiTurnRef.current = getLatestAiTurn;
  }, [getLatestAiTurn]);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const bumpGeneration = useCallback(() => {
    openGenerationRef.current += 1;
  }, []);

  const canAutoOpen = useCallback((): boolean => {
    if (!voiceEnabledRef.current || !liveRef.current) return false;
    if (userMutedRef.current) return false;
    if (introPlaybackActiveRef.current) return false;
    if (submittingRef.current || transcribingRef.current) return false;
    if (isCodingTurn(getLatestAiTurnRef.current())) return false;
    if (phaseRef.current === 'speaking') return false;
    return true;
  }, [introPlaybackActiveRef]);

  const closeMic = useCallback(
    (cancelRecording = true) => {
      bumpGeneration();
      clearTimers();
      autoListeningRef.current = false;
      setAutoMicPending(false);
      const recorder = audioRecorderRef.current;
      if (cancelRecording && !transcribingRef.current && !submittingRef.current && !recorder?.processing) {
        recorder?.cancel();
      }
      if (listenWindowRef.current) {
        clearTimeout(listenWindowRef.current);
        listenWindowRef.current = null;
      }
      setMicOn(false);
    },
    [audioRecorderRef, bumpGeneration, clearTimers]
  );

  const openMic = useCallback(
    async (userInitiated = false): Promise<boolean> => {
      if (!userInitiated && !canAutoOpen()) return false;

      const recorder = audioRecorderRef.current;
      if (recorder?.listening && (autoListeningRef.current || userInitiated)) {
        setMicOn(true);
        setAutoMicPending(false);
        setVoicePhase('listening');
        setCaptureError('');
        return true;
      }
      if (recorder?.busy && !recorder?.listening) return false;

      if (userInitiated) {
        userMutedRef.current = false;
        userInitiatedMicRef.current = true;
      } else if (userMutedRef.current) {
        return false;
      } else {
        userInitiatedMicRef.current = false;
      }

      const gen = openGenerationRef.current;
      autoListeningRef.current = true;
      setAutoMicPending(true);
      setCaptureError('');

      await recorder?.warmUp?.();
      if (gen !== openGenerationRef.current) return false;

      const started = (await recorder?.start()) ?? false;
      if (gen !== openGenerationRef.current) return false;

      if (started && recorder?.listening) {
        setMicOn(true);
        setAutoMicPending(false);
        setVoicePhase('listening');
        phaseRef.current = 'listening';

        if (listenWindowRef.current) clearTimeout(listenWindowRef.current);
        listenWindowRef.current = setTimeout(() => {
          if (autoListeningRef.current) {
            autoListeningRef.current = false;
            audioRecorderRef.current?.stop();
            setMicOn(false);
          }
        }, 90000);
        return true;
      }

      autoListeningRef.current = false;
      setAutoMicPending(false);
      return false;
    },
    [audioRecorderRef, canAutoOpen]
  );

  const tryOpenWithRetry = useCallback(
    (gen: number, attempt: number) => {
      if (gen !== openGenerationRef.current) return;

      if (micOnRef.current || audioRecorderRef.current?.listening) {
        setAutoMicPending(false);
        return;
      }

      if (!canAutoOpen()) {
        if (attempt < 20) {
          retryTimerRef.current = setTimeout(() => tryOpenWithRetry(gen, attempt + 1), 300);
        } else {
          setAutoMicPending(false);
        }
        return;
      }

      void openMic(false).then((ok) => {
        if (gen !== openGenerationRef.current) return;
        if (!ok && attempt < 20) {
          retryTimerRef.current = setTimeout(() => tryOpenWithRetry(gen, attempt + 1), 400);
        } else if (!ok) {
          setAutoMicPending(false);
        }
      });
    },
    [audioRecorderRef, canAutoOpen, openMic]
  );

  /** Schedule mic open after TTS — the ONLY auto-open entry point. */
  const scheduleOpenMicAfterQuestion = useCallback(
    (delayMs: number = TTS_POST_SPEECH_MIC_DELAY_MS) => {
      if (!voiceEnabledRef.current) return;
      if (transcribingRef.current || submittingRef.current) return;
      const recorder = audioRecorderRef.current;
      if (recorder?.listening || recorder?.processing) return;
      bumpGeneration();
      clearTimers();
      const gen = openGenerationRef.current;
      setAutoMicPending(true);
      setCaptureError('');

      openTimerRef.current = setTimeout(() => {
        if (gen !== openGenerationRef.current) return;
        if (transcribingRef.current || submittingRef.current) return;
        tryOpenWithRetry(gen, 0);
      }, Math.max(0, delayMs));
    },
    [audioRecorderRef, bumpGeneration, clearTimers, tryOpenWithRetry]
  );

  const onInterviewerSpeakStart = useCallback(() => {
    const now = Date.now();
    if (now - lastSpeakStartAtRef.current < 500) return;
    lastSpeakStartAtRef.current = now;

    if (transcribingRef.current || submittingRef.current) return;

    clearTimers();
    const recorder = audioRecorderRef.current;
    if (recorder?.processing) return;
    if (recorder?.busy && !recorder?.listening) return;

    if (recorder?.listening) {
      autoListeningRef.current = false;
      recorder.stop();
    } else {
      closeMic(false);
    }
    setVoicePhase('speaking');
    phaseRef.current = 'speaking';
    noSpeechRetryRef.current = 0;
  }, [audioRecorderRef, clearTimers, closeMic]);

  const onInterviewerSpeakEnd = useCallback(() => {
    if (introPlaybackActiveRef.current) return;
    userMutedRef.current = false;
    setVoicePhase('idle');
    phaseRef.current = 'idle';
    scheduleOpenMicAfterQuestion(TTS_POST_SPEECH_MIC_DELAY_MS);
  }, [introPlaybackActiveRef, scheduleOpenMicAfterQuestion]);

  const onIntroQuestionReady = useCallback(() => {
    userMutedRef.current = false;
    setVoicePhase('idle');
    phaseRef.current = 'idle';
    scheduleOpenMicAfterQuestion(TTS_POST_SPEECH_MIC_DELAY_MS);
  }, [scheduleOpenMicAfterQuestion]);

  const prepareForSubmit = useCallback(() => {
    submittingRef.current = true;
    bumpGeneration();
    clearTimers();
    autoListeningRef.current = false;
    noSpeechRetryRef.current = 0;
    audioRecorderRef.current?.stop();
    closeMic(false);
    setVoicePhase('thinking');
    phaseRef.current = 'thinking';
    setCaptureError('');
  }, [audioRecorderRef, bumpGeneration, clearTimers, closeMic]);

  const onSubmitFinished = useCallback(
    (opts?: { reopen?: boolean; rejected?: boolean }) => {
      submittingRef.current = false;
      transcribingRef.current = false;
      if (opts?.rejected) {
        setVoicePhase('idle');
        phaseRef.current = 'idle';
        if (voiceEnabledRef.current) {
          window.setTimeout(() => scheduleOpenMicAfterQuestion(TTS_POST_SPEECH_MIC_DELAY_MS), 1200);
        }
        return;
      }
      setVoicePhase('idle');
      phaseRef.current = 'idle';
      if (opts?.reopen && voiceEnabledRef.current) {
        scheduleOpenMicAfterQuestion(TTS_AFTER_SPEAK_MIC_DELAY_MS);
      }
    },
    [scheduleOpenMicAfterQuestion]
  );

  const onCaptureRejected = useCallback(
    (message: string, opts?: { skipRetry?: boolean }) => {
      transcribingRef.current = false;
      submittingRef.current = false;
      autoListeningRef.current = false;
      closeMic(false);
      setVoicePhase('idle');
      phaseRef.current = 'idle';

      if (opts?.skipRetry || noSpeechRetryRef.current >= 2) {
        setCaptureError(`${message} Tap the mic icon below if you are ready to speak.`);
        return;
      }
      noSpeechRetryRef.current += 1;
      setCaptureError('');
      window.setTimeout(() => {
        if (!userMutedRef.current) scheduleOpenMicAfterQuestion(TTS_POST_SPEECH_MIC_DELAY_MS);
      }, 1000);
    },
    [closeMic, scheduleOpenMicAfterQuestion]
  );

  const toggleMic = useCallback(() => {
    bumpGeneration();
    clearTimers();
    const recorder = audioRecorderRef.current;
    if (recorder?.busy && !recorder?.listening) return;

    const active = micOnRef.current || autoListeningRef.current || recorder?.listening;
    if (active) {
      if (recorder?.listening) {
        userMutedRef.current = false;
        autoListeningRef.current = false;
        recorder.stop();
        setMicOn(false);
        setVoicePhase('transcribing');
        phaseRef.current = 'transcribing';
        transcribingRef.current = true;
        setCaptureError('');
        return;
      }
      userMutedRef.current = true;
      closeMic(true);
      setVoicePhase('idle');
      phaseRef.current = 'idle';
      setCaptureError('');
      return;
    }

    userMutedRef.current = false;
    noSpeechRetryRef.current = 0;
    void openMic(true);
  }, [audioRecorderRef, bumpGeneration, clearTimers, closeMic, openMic]);

  const onProcessing = useCallback((info: { hadSpeech: boolean; speechMs: number }) => {
    lastClipHadSpeechRef.current = info.hadSpeech;
    transcribingRef.current = true;
    autoListeningRef.current = false;
    setMicOn(false);
    setVoicePhase('transcribing');
    phaseRef.current = 'transcribing';
    setCaptureError('');
  }, []);

  const onTranscriptionError = useCallback(
    (msg: string) => {
      transcribingRef.current = false;
      const noSpeech = /no audio detected|empty recording|no speech/i.test(msg);
      if (noSpeech) {
        onCaptureRejected(
          interviewLang === 'ur' ? 'Aap ki awaaz clear nahi aayi.' : 'I did not catch that.'
        );
        return;
      }
      setCaptureError(
        msg.includes('timed out')
          ? interviewLang === 'ur'
            ? 'Transcription mein waqt zyada lag gaya.'
            : 'Transcription timed out.'
          : interviewLang === 'ur'
            ? 'Transcription fail ho gayi.'
            : 'Transcription failed.'
      );
      setVoicePhase('idle');
      phaseRef.current = 'idle';
      if (voiceEnabledRef.current) {
        window.setTimeout(() => scheduleOpenMicAfterQuestion(TTS_POST_SPEECH_MIC_DELAY_MS), 800);
      }
    },
    [interviewLang, onCaptureRejected, scheduleOpenMicAfterQuestion]
  );

  const onNoSpeech = useCallback(
    (wasIdleStop: boolean) => {
      if (userMutedRef.current && !wasIdleStop) return;
      if (!voiceEnabledRef.current && !wasIdleStop) return;
      onCaptureRejected(
        wasIdleStop
          ? interviewLang === 'ur'
            ? '20 second khamoshi — koi jawab nahi mila.'
            : 'No answer detected after silence.'
          : interviewLang === 'ur'
            ? 'Aap ka jawab sun nahi paya.'
            : 'I did not hear your answer.',
        { skipRetry: wasIdleStop }
      );
    },
    [interviewLang, onCaptureRejected]
  );

  const onIdleTimeout = useCallback(() => {
    idleStopRef.current = true;
    autoListeningRef.current = false;
    setAutoMicPending(false);
  }, []);

  const onListeningChange = useCallback((listening: boolean) => {
    if (listening) {
      userMutedRef.current = false;
      setMicOn(true);
      setVoicePhase('listening');
      phaseRef.current = 'listening';
      setAutoMicPending(false);
      return;
    }
    setMicOn(false);
    if (userMutedRef.current) {
      setVoicePhase((prev) => (prev === 'listening' || prev === 'transcribing' ? 'idle' : prev));
      return;
    }
    if (phaseRef.current === 'listening') {
      setVoicePhase('transcribing');
      phaseRef.current = 'transcribing';
    }
  }, []);

  const resetNoSpeechRetries = useCallback(() => {
    noSpeechRetryRef.current = 0;
  }, []);

  const onTranscriptReady = useCallback(() => {
    transcribingRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      bumpGeneration();
      clearTimers();
      if (listenWindowRef.current) clearTimeout(listenWindowRef.current);
    };
  }, [bumpGeneration, clearTimers]);

  return {
    micOn,
    autoMicPending,
    voicePhase,
    setVoicePhase,
    captureError,
    setCaptureError,
    lastClipHadSpeechRef,
    userInitiatedMicRef,
    idleStopRef,
    onInterviewerSpeakStart,
    onInterviewerSpeakEnd,
    onIntroQuestionReady,
    scheduleOpenMicAfterQuestion,
    prepareForSubmit,
    onSubmitFinished,
    onCaptureRejected,
    toggleMic,
    closeMic,
    onProcessing,
    onTranscriptionError,
    onNoSpeech,
    onIdleTimeout,
    onListeningChange,
    resetNoSpeechRetries,
    onTranscriptReady,
    openMicForVoiceOff: () => void openMic(false),
  };
}
