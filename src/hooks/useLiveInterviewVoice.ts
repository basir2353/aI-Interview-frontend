'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { InterviewState, InterviewerPersona, Turn } from '@/types';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { cancelInterviewerSpeech, speakInterviewerText } from '@/lib/interviewerSpeech';
import {
  TTS_INTRO_TO_QUESTION_PAUSE_MS,
  TTS_POST_SPEECH_MIC_DELAY_MS,
  INTERVIEW_SILENCE_AUTO_STOP_MS,
  INTERVIEW_NO_SPEECH_IDLE_MS,
} from '@/lib/ttsConfig';
import type { VoicePipelinePhase } from '@/components/interview/InterviewStatusBar';
import { humanStatusLabel } from '@/lib/interviewEngagement';
import { collectInterviewerTexts, isLikelyInterviewerEcho } from '@/lib/echoGuard';
import { isSttHallucination } from '@/lib/sttGuard';

type HumanStatusPhase = 'idle' | 'listening' | 'openingMic' | 'thinking' | 'speaking';

export interface UseLiveInterviewVoiceOptions {
  interviewId: string;
  active: boolean;
  liveScreenReady: boolean;
  voiceEnabled: boolean;
  lang: string;
  persona: InterviewerPersona | string;
  turns: Turn[] | undefined;
  loading: boolean;
  displayQuestion: string;
  interviewerCaption: string;
  sttLanguage: string;
  sttMixed: boolean;
  interviewerFirstName: string;
  prefetchedStateRef: RefObject<InterviewState | null>;
  fetchState: () => Promise<InterviewState | null>;
  beginLiveInterview: () => Promise<InterviewState>;
  onStateFromIntro: (state: InterviewState) => void;
  onQuestionDisplay: (text: string) => void;
  onIntroUi: (opts: { introSpeaking: boolean; caption: string }) => void;
  onIntroComplete: () => void;
  onSubmitAnswer: (text: string) => Promise<void>;
  onSubmitFailed: (opts?: { rejected?: boolean }) => void;
}

function lastAiQuestionTurn(turns: Turn[] | undefined): Turn | undefined {
  if (!turns?.length) return undefined;
  return (
    [...turns].reverse().find((t) => t.role === 'ai' && !t.isIntro) ??
    [...turns].reverse().find((t) => t.role === 'ai')
  );
}

function isCodingTurn(turn: Turn | null | undefined): boolean {
  return Boolean(turn?.isCodingQuestion || turn?.codingStarterCode || turn?.codingLanguage);
}

/**
 * Single owner of the live interview voice loop:
 * speak question → pause → open mic → listen → transcribe → submit → repeat.
 */
export function useLiveInterviewVoice({
  interviewId,
  active,
  liveScreenReady,
  voiceEnabled,
  lang,
  persona,
  turns,
  loading,
  displayQuestion,
  interviewerCaption,
  sttLanguage,
  sttMixed,
  interviewerFirstName,
  prefetchedStateRef,
  fetchState,
  beginLiveInterview,
  onStateFromIntro,
  onQuestionDisplay,
  onIntroUi,
  onIntroComplete,
  onSubmitAnswer,
  onSubmitFailed,
}: UseLiveInterviewVoiceOptions) {
  const [micOn, setMicOn] = useState(false);
  const [openingMic, setOpeningMic] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoicePipelinePhase>('idle');
  const [captureError, setCaptureError] = useState('');

  const generationRef = useRef(0);
  const phaseRef = useRef<VoicePipelinePhase>('idle');
  const micTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenCapRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introRanRef = useRef(false);
  const introDoneRef = useRef(false);
  const introActiveRef = useRef(false);
  const lastSpokenTurnIdRef = useRef<string | null>(null);
  const submittingRef = useRef(false);
  const userMutedRef = useRef(false);
  const userInitiatedMicRef = useRef(false);
  const lastClipHadSpeechRef = useRef(false);
  const noSpeechRetriesRef = useRef(0);
  const idleStopRef = useRef(false);
  const pendingTurnSpeakRef = useRef<string | null>(null);
  const entryCancelledRef = useRef(false);

  const voiceEnabledRef = useRef(voiceEnabled);
  const activeRef = useRef(active);
  const loadingRef = useRef(loading);
  const langRef = useRef(lang);
  const personaRef = useRef(persona);
  const turnsRef = useRef(turns);
  const displayQuestionRef = useRef(displayQuestion);
  const captionRef = useRef(interviewerCaption);

  const onSubmitAnswerRef = useRef(onSubmitAnswer);
  const scheduleMicOpenRef = useRef<(delay?: number) => void>(() => undefined);
  const handleCaptureRejectedRef = useRef<(msg: string, opts?: { skipRetry?: boolean }) => void>(
    () => undefined
  );

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);
  useEffect(() => {
    personaRef.current = persona;
  }, [persona]);
  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);
  useEffect(() => {
    displayQuestionRef.current = displayQuestion;
  }, [displayQuestion]);
  useEffect(() => {
    captionRef.current = interviewerCaption;
  }, [interviewerCaption]);
  useEffect(() => {
    phaseRef.current = voicePhase;
  }, [voicePhase]);
  useEffect(() => {
    onSubmitAnswerRef.current = onSubmitAnswer;
  }, [onSubmitAnswer]);

  const bumpGeneration = useCallback(() => {
    generationRef.current += 1;
  }, []);

  const clearMicTimers = useCallback(() => {
    if (micTimerRef.current) {
      clearTimeout(micTimerRef.current);
      micTimerRef.current = null;
    }
    if (listenCapRef.current) {
      clearTimeout(listenCapRef.current);
      listenCapRef.current = null;
    }
  }, []);

  const setPhase = useCallback((phase: VoicePipelinePhase) => {
    phaseRef.current = phase;
    setVoicePhase(phase);
  }, []);

  const canOpenMic = useCallback((): boolean => {
    if (!voiceEnabledRef.current || !activeRef.current) return false;
    if (userMutedRef.current) return false;
    if (introActiveRef.current) return false;
    if (submittingRef.current || loadingRef.current) return false;
    if (phaseRef.current === 'speaking') return false;
    if (isCodingTurn(lastAiQuestionTurn(turnsRef.current))) return false;
    return true;
  }, []);

  const validateTranscript = useCallback((text: string): string | null => {
    const cleaned = text.trim();
    if (!cleaned) return null;

    const substantial =
      cleaned.length >= 10 || cleaned.split(/\s+/).filter(Boolean).length >= 2;
    if (!lastClipHadSpeechRef.current && !userInitiatedMicRef.current && !substantial) {
      return null;
    }

    const currentQuestion =
      displayQuestionRef.current.trim() ||
      lastAiQuestionTurn(turnsRef.current)?.content?.trim() ||
      '';
    const echoSources = currentQuestion
      ? [currentQuestion, captionRef.current.trim()].filter(Boolean)
      : collectInterviewerTexts(turnsRef.current, [displayQuestionRef.current, captionRef.current]);

    if (isLikelyInterviewerEcho(cleaned, echoSources, langRef.current) && cleaned.length < 120) {
      return null;
    }
    if (isSttHallucination(cleaned, langRef.current) && !substantial) {
      return null;
    }
    return cleaned;
  }, []);

  const handleTranscriptRef = useRef<(raw: string) => void>(() => undefined);

  const recorder = useVoiceRecorder({
    autoStopOnSilence: true,
    silenceMs: INTERVIEW_SILENCE_AUTO_STOP_MS,
    stopDelayMs: 350,
    minRecordMs: 500,
    minSpeechMs: 200,
    minTranscribeMs: 600,
    minSpeechMsForTranscribe: 250,
    maxRecordMs: 120_000,
    noSpeechIdleMs: INTERVIEW_NO_SPEECH_IDLE_MS,
    disableAdaptiveVad: false,
    transcribeLanguage: sttLanguage,
    transcribeMixed: sttMixed,
    interviewId,
    onIdleTimeout: () => {
      idleStopRef.current = true;
      setOpeningMic(false);
      handleCaptureRejectedRef.current(
        langRef.current === 'ur'
          ? '20 second khamoshi — koi jawab nahi mila.'
          : 'No answer detected after silence.',
        { skipRetry: true }
      );
    },
    onProcessing: (info) => {
      lastClipHadSpeechRef.current = info.hadSpeech;
      setMicOn(false);
      setOpeningMic(false);
      setPhase('transcribing');
    },
    onTranscript: (text) => handleTranscriptRef.current(text),
    onError: (message) => {
      const noSpeech = /no audio detected|empty recording|no speech/i.test(message);
      if (noSpeech) {
        handleCaptureRejectedRef.current(
          langRef.current === 'ur' ? 'Aap ki awaaz clear nahi aayi.' : 'I did not catch that.'
        );
        return;
      }
      setCaptureError(
        message.includes('timed out')
          ? langRef.current === 'ur'
            ? 'Transcription mein waqt zyada lag gaya.'
            : 'Transcription timed out.'
          : langRef.current === 'ur'
            ? 'Transcription fail ho gayi.'
            : 'Transcription failed.'
      );
      setPhase('idle');
      scheduleMicOpenRef.current();
    },
  });

  const stopRecording = useCallback(
    (cancel = false) => {
      if (cancel) recorder.cancel();
      else if (recorder.isRecording) recorder.stop();
      setMicOn(false);
    },
    [recorder]
  );

  const openMicInternal = useCallback(
    async (gen: number) => {
      if (gen !== generationRef.current) return;
      if (!canOpenMic()) {
        setOpeningMic(false);
        return;
      }
      if (recorder.isBusy && !recorder.isRecording) {
        setOpeningMic(false);
        return;
      }

      await recorder.warmUp();
      if (gen !== generationRef.current) return;

      const started = await recorder.start();
      if (gen !== generationRef.current) return;

      if (started && recorder.isRecording) {
        setMicOn(true);
        setOpeningMic(false);
        setPhase('listening');
        userInitiatedMicRef.current = false;

        if (listenCapRef.current) clearTimeout(listenCapRef.current);
        listenCapRef.current = setTimeout(() => {
          if (recorder.isRecording) recorder.stop();
        }, 90_000);
        return;
      }

      setOpeningMic(false);
      if (noSpeechRetriesRef.current < 2) {
        noSpeechRetriesRef.current += 1;
        scheduleMicOpenRef.current(800);
      } else {
        setCaptureError(
          langRef.current === 'ur'
            ? 'Mic nahi khul saka — neeche mic icon dabayein.'
            : 'Could not open mic — tap the mic icon below.'
        );
      }
    },
    [canOpenMic, recorder, setPhase]
  );

  const scheduleMicOpen = useCallback(
    (delayMs = TTS_POST_SPEECH_MIC_DELAY_MS) => {
      clearMicTimers();
      if (!canOpenMic()) {
        setOpeningMic(false);
        return;
      }
      if (recorder.isRecording || recorder.isProcessing) return;

      const gen = generationRef.current;
      setOpeningMic(true);
      setCaptureError('');

      micTimerRef.current = setTimeout(() => {
        micTimerRef.current = null;
        if (gen !== generationRef.current) return;
        if (!canOpenMic()) {
          setOpeningMic(false);
          return;
        }
        void openMicInternal(gen);
      }, Math.max(0, delayMs));
    },
    [canOpenMic, clearMicTimers, openMicInternal, recorder.isProcessing, recorder.isRecording]
  );

  useEffect(() => {
    scheduleMicOpenRef.current = scheduleMicOpen;
  }, [scheduleMicOpen]);

  const handleCaptureRejected = useCallback(
    (message: string, opts?: { skipRetry?: boolean }) => {
      bumpGeneration();
      clearMicTimers();
      stopRecording(true);
      submittingRef.current = false;
      setPhase('idle');
      setOpeningMic(false);

      if (opts?.skipRetry || noSpeechRetriesRef.current >= 2) {
        setCaptureError(`${message} Tap the mic icon below if you are ready to speak.`);
        return;
      }
      noSpeechRetriesRef.current += 1;
      setCaptureError('');
      scheduleMicOpen(1000);
    },
    [bumpGeneration, clearMicTimers, scheduleMicOpen, setPhase, stopRecording]
  );

  useEffect(() => {
    handleCaptureRejectedRef.current = handleCaptureRejected;
  }, [handleCaptureRejected]);

  const handleTranscript = useCallback(
    async (raw: string) => {
      if (!raw.trim()) {
        submittingRef.current = false;
        setPhase('idle');
        scheduleMicOpen();
        return;
      }

      const cleaned = validateTranscript(raw);
      if (!cleaned) {
        handleCaptureRejected(
          langRef.current === 'ur' ? 'Aap ka jawab sun nahi paya.' : 'That did not sound like a real answer.'
        );
        return;
      }

      noSpeechRetriesRef.current = 0;
      setCaptureError('');
      bumpGeneration();
      clearMicTimers();
      stopRecording(false);
      submittingRef.current = true;
      setPhase('thinking');

      try {
        await onSubmitAnswerRef.current(cleaned);
        submittingRef.current = false;
        setPhase('idle');
      } catch {
        submittingRef.current = false;
        setPhase('idle');
      }
    },
    [
      bumpGeneration,
      clearMicTimers,
      handleCaptureRejected,
      scheduleMicOpen,
      setPhase,
      stopRecording,
      validateTranscript,
    ]
  );

  useEffect(() => {
    handleTranscriptRef.current = (raw) => {
      void handleTranscript(raw);
    };
  }, [handleTranscript]);

  const pauseForInterviewer = useCallback(() => {
    clearMicTimers();
    setOpeningMic(false);
    if (recorder.isRecording) stopRecording(false);
    else if (recorder.isBusy && !recorder.isProcessing) recorder.cancel();
    setMicOn(false);
    setPhase('speaking');
    noSpeechRetriesRef.current = 0;
  }, [clearMicTimers, recorder, setPhase, stopRecording]);

  const onSpeechEnd = useCallback(() => {
    if (introActiveRef.current) return;
    userMutedRef.current = false;
    setPhase('idle');
    if (voiceEnabledRef.current) scheduleMicOpen();
  }, [scheduleMicOpen, setPhase]);

  const speakText = useCallback(
    async (text: string, turnId: string | null, onStartUi?: () => void) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const gen = ++generationRef.current;
      pauseForInterviewer();

      try {
        await speakInterviewerText(trimmed, {
          lang: langRef.current,
          persona: personaRef.current,
          onStart: () => {
            if (gen !== generationRef.current) return;
            if (turnId) lastSpokenTurnIdRef.current = turnId;
            onStartUi?.();
          },
          onEnd: () => {
            if (gen !== generationRef.current) return;
            onSpeechEnd();
          },
        });
      } catch (e) {
        console.error('[LiveVoice] TTS error', e);
        if (gen === generationRef.current) onSpeechEnd();
      }
    },
    [onSpeechEnd, pauseForInterviewer]
  );

  const speakFollowUpTurn = useCallback(
    async (turn: Turn) => {
      if (pendingTurnSpeakRef.current === turn.id) return;
      pendingTurnSpeakRef.current = turn.id;
      onQuestionDisplay(turn.content.trim());
      onIntroUi({ introSpeaking: false, caption: '' });
      await speakText(turn.content, turn.id);
      pendingTurnSpeakRef.current = null;
    },
    [onIntroUi, onQuestionDisplay, speakText]
  );

  useEffect(() => {
    if (!active || !voiceEnabled || !introDoneRef.current) return;
    if (loading || submittingRef.current || introActiveRef.current) return;
    if (phaseRef.current === 'speaking' || phaseRef.current === 'transcribing') return;

    const turn = lastAiQuestionTurn(turns);
    if (!turn || turn.isIntro) return;
    if (lastSpokenTurnIdRef.current === turn.id) return;
    if (isCodingTurn(turn)) {
      lastSpokenTurnIdRef.current = turn.id;
      bumpGeneration();
      clearMicTimers();
      stopRecording(true);
      setOpeningMic(false);
      setPhase('idle');
      return;
    }

    void speakFollowUpTurn(turn);
  }, [
    active,
    voiceEnabled,
    turns,
    loading,
    speakFollowUpTurn,
    bumpGeneration,
    clearMicTimers,
    stopRecording,
    setPhase,
  ]);

  const finishIntro = useCallback(
    (questionTurn?: Turn) => {
      introActiveRef.current = false;
      introDoneRef.current = true;
      onIntroComplete();
      onIntroUi({ introSpeaking: false, caption: '' });
      if (questionTurn?.content?.trim()) {
        onQuestionDisplay(questionTurn.content.trim());
        lastSpokenTurnIdRef.current = questionTurn.id;
      }
      if (typeof window !== 'undefined' && interviewId) {
        window.sessionStorage.setItem(`intervion_intro_spoken_${interviewId}`, '1');
      }
      setPhase('idle');
      if (voiceEnabledRef.current && questionTurn && !isCodingTurn(questionTurn)) {
        scheduleMicOpen();
      }
    },
    [interviewId, onIntroComplete, onIntroUi, onQuestionDisplay, scheduleMicOpen, setPhase]
  );

  const runLiveEntry = useCallback(async () => {
    if (introRanRef.current) return;
    introRanRef.current = true;
    entryCancelledRef.current = false;

    try {
      let liveState = prefetchedStateRef.current;
      if (!liveState) {
        liveState = await fetchState();
      }
      if (entryCancelledRef.current) return;

      const needsWelcome =
        !liveState?.welcomeDelivered ||
        !liveState?.turns.some((t) => t.role === 'ai' && t.isIntro);

      if (needsWelcome) {
        liveState = await beginLiveInterview();
        if (entryCancelledRef.current) return;
        onStateFromIntro(liveState);
      } else if (liveState) {
        onStateFromIntro(liveState);
      }

      if (!liveState) {
        introRanRef.current = false;
        return;
      }

      const welcomeComplete =
        liveState.welcomeDelivered &&
        liveState.turns.some((t) => t.role === 'ai' && t.isIntro) &&
        liveState.turns.some((t) => t.role === 'ai' && !t.isIntro);
      const introSpokenLocally =
        typeof window !== 'undefined' &&
        window.sessionStorage.getItem(`intervion_intro_spoken_${interviewId}`) === '1';

      const questionTurn = liveState.turns.find((t) => t.role === 'ai' && !t.isIntro);
      const introTurns = liveState.turns.filter((t) => t.role === 'ai' && t.isIntro);
      const introText = introTurns.map((t) => t.content.trim()).filter(Boolean).join(' ');
      const questionText = questionTurn?.content?.trim() ?? '';

      if (welcomeComplete && !needsWelcome && introSpokenLocally) {
        if (questionTurn) lastSpokenTurnIdRef.current = questionTurn.id;
        introDoneRef.current = true;
        onIntroComplete();
        if (questionText) onQuestionDisplay(questionText);
        if (voiceEnabled && questionTurn && !isCodingTurn(questionTurn)) {
          scheduleMicOpen();
        }
        return;
      }

      introActiveRef.current = true;
      if (questionTurn) lastSpokenTurnIdRef.current = questionTurn.id;

      if (!introText && !questionText) {
        finishIntro(questionTurn);
        return;
      }

      const speakIntroBlock = async (text: string, duringIntro: boolean) => {
        const gen = ++generationRef.current;
        pauseForInterviewer();
        await speakInterviewerText(text, {
          lang: langRef.current,
          persona: personaRef.current,
          onStart: () => {
            if (gen !== generationRef.current) return;
            onIntroUi({
              introSpeaking: duringIntro,
              caption: duringIntro ? text : '',
            });
            if (!duringIntro) onQuestionDisplay(text);
            else onQuestionDisplay('');
          },
          onEnd: () => undefined,
        });
      };

      if (introText) {
        await speakIntroBlock(introText, true);
        if (entryCancelledRef.current) return;
        if (questionText) {
          await new Promise((r) => window.setTimeout(r, TTS_INTRO_TO_QUESTION_PAUSE_MS));
        }
      }

      if (questionText) {
        await speakIntroBlock(questionText, false);
        if (entryCancelledRef.current) return;
      }

      finishIntro(questionTurn);
    } catch (e) {
      console.error('[LiveVoice] Intro pipeline failed', e);
      introRanRef.current = false;
      finishIntro(lastAiQuestionTurn(turnsRef.current));
    }
  }, [
    beginLiveInterview,
    fetchState,
    finishIntro,
    interviewId,
    onIntroComplete,
    onIntroUi,
    onQuestionDisplay,
    onStateFromIntro,
    pauseForInterviewer,
    prefetchedStateRef,
    scheduleMicOpen,
    voiceEnabled,
  ]);

  useEffect(() => {
    if (!active || !liveScreenReady) return;
    void runLiveEntry();
    return () => {
      entryCancelledRef.current = true;
    };
  }, [active, liveScreenReady, runLiveEntry]);

  useEffect(() => {
    if (!active) {
      introRanRef.current = false;
      introDoneRef.current = false;
    }
  }, [active]);

  useEffect(() => {
    if (recorder.isRecording) {
      setMicOn(true);
      setOpeningMic(false);
      if (phaseRef.current !== 'speaking') setPhase('listening');
    } else if (!recorder.isProcessing && phaseRef.current === 'listening') {
      setMicOn(false);
      setPhase('transcribing');
    }
  }, [recorder.isRecording, recorder.isProcessing, setPhase, active]);

  const toggleMic = useCallback(() => {
    bumpGeneration();
    clearMicTimers();
    setCaptureError('');

    if (recorder.isRecording) {
      userInitiatedMicRef.current = true;
      recorder.stop();
      setMicOn(false);
      setPhase('transcribing');
      return;
    }
    if (recorder.isBusy) return;

    if (micOn || openingMic) {
      userMutedRef.current = true;
      stopRecording(true);
      setOpeningMic(false);
      setPhase('idle');
      return;
    }

    userMutedRef.current = false;
    userInitiatedMicRef.current = true;
    noSpeechRetriesRef.current = 0;
    void openMicInternal(++generationRef.current);
  }, [
    bumpGeneration,
    clearMicTimers,
    micOn,
    openingMic,
    openMicInternal,
    recorder,
    setPhase,
    stopRecording,
  ]);

  const stopAll = useCallback(() => {
    bumpGeneration();
    clearMicTimers();
    cancelInterviewerSpeech();
    stopRecording(true);
    setOpeningMic(false);
    setPhase('idle');
    introActiveRef.current = false;
  }, [bumpGeneration, clearMicTimers, setPhase, stopRecording]);

  const warmUpMic = useCallback(() => {
    void recorder.warmUp();
  }, [recorder]);

  const notifySubmitFailed = useCallback(
    (opts?: { rejected?: boolean }) => {
      submittingRef.current = false;
      setPhase('idle');
      if (opts?.rejected) {
        handleCaptureRejected('Could not use that recording.');
      } else if (voiceEnabledRef.current) {
        scheduleMicOpen();
      }
      onSubmitFailed(opts);
    },
    [handleCaptureRejected, onSubmitFailed, scheduleMicOpen, setPhase]
  );

  const resetIntroForReentry = useCallback(() => {
    introRanRef.current = false;
    introDoneRef.current = false;
    introActiveRef.current = false;
    lastSpokenTurnIdRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      bumpGeneration();
      clearMicTimers();
      cancelInterviewerSpeech();
    };
  }, [bumpGeneration, clearMicTimers]);

  const humanStatusPhase: HumanStatusPhase =
    voicePhase === 'speaking'
      ? 'speaking'
      : micOn
        ? 'listening'
        : openingMic
          ? 'openingMic'
          : voicePhase === 'thinking' || voicePhase === 'transcribing'
            ? 'thinking'
            : 'idle';

  const humanStatusText = humanStatusLabel(lang, humanStatusPhase, interviewerFirstName);

  return {
    micOn,
    openingMic,
    voicePhase,
    captureError,
    setCaptureError,
    humanStatusPhase,
    humanStatusText,
    toggleMic,
    stopAll,
    warmUpMic,
    resetIntroForReentry,
    notifySubmitFailed,
    idleStopRef,
    onNoSpeech: (wasIdleStop: boolean) => {
      if (userMutedRef.current && !wasIdleStop) return;
      if (!voiceEnabledRef.current && !wasIdleStop) return;
      handleCaptureRejected(
        wasIdleStop
          ? langRef.current === 'ur'
            ? '20 second khamoshi — koi jawab nahi mila.'
            : 'No answer detected after silence.'
          : langRef.current === 'ur'
            ? 'Aap ka jawab sun nahi paya.'
            : 'I did not hear your answer.',
        { skipRetry: wasIdleStop }
      );
    },
  };
}
