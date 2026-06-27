'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { InterviewState, InterviewReport } from '@/types';
import { AudioRecorder, type AudioRecorderHandle } from '@/components/AudioRecorder';
import { VideoPreview } from '@/components/VideoPreview';
import { CodeEditor } from '@/components/CodeEditor';
import { AIAvatar } from '@/components/interview/AIAvatar';
import { useInterviewerVoice } from '@/hooks/useInterviewerVoice';
import { useInterviewFaceAnalysis } from '@/hooks/useInterviewFaceAnalysis';
import { waitForSpeechVoices } from '@/lib/voicePreferences';
import { speakInterviewerText } from '@/lib/interviewerSpeech';
import { DraggableAvatarPanel } from '@/components/interview/DraggableAvatarPanel';
import { LiveAnalysisBlock } from '@/components/interview/LiveAnalysisBlock';
import { InterviewDeviceCheck } from '@/components/interview/InterviewDeviceCheck';
import { InterviewInstructionsOverlay } from '@/components/interview/InterviewInstructionsOverlay';
import { motion } from 'framer-motion';
import { setInterviewRoomOnboarding } from '@/lib/interviewOnboardingGate';
import { useInterviewImmersiveMode } from '@/hooks/useInterviewImmersiveMode';
import { useInterviewRoomTheme } from '@/hooks/useInterviewRoomTheme';
import {
  InterviewStatusBar,
  type VoicePipelinePhase,
} from '@/components/interview/InterviewStatusBar';

export default function LiveInterviewPage() {
  const params = useParams();
  const id = params.id as string;

  const [state, setState] = useState<InterviewState | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [codeAnswer, setCodeAnswer] = useState('');
  const [codeNotes, setCodeNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());
  /** When user has finished speaking: submit immediately for natural, efficient flow */
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null);
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const [cameraUserIdle, setCameraUserIdle] = useState(false);
  const [activeTab, setActiveTab] = useState<'interview' | 'code' | 'notepad'>('interview');
  const [waveMessageShown, setWaveMessageShown] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  /** device-check → instructions (fullscreen notes) → live room */
  const [roomPhase, setRoomPhase] = useState<'device-check' | 'instructions' | 'live'>(() => {
    if (typeof window !== 'undefined' && window.sessionStorage.getItem('interviewBeginLive') === '1') {
      return 'instructions';
    }
    return 'device-check';
  });
  const [notepadNotes, setNotepadNotes] = useState('');
  /** When true, user has clicked "Open code" so we show Code tab + editor/terminal even if no coding question yet */
  const [codePanelRequested, setCodePanelRequested] = useState(false);
  const [interviewLang, setInterviewLang] = useState<string>(() => {
    if (typeof window === 'undefined') return 'en-US';
    return window.localStorage.getItem('interviewLanguage') || 'en-US';
  });
  const [voicePhase, setVoicePhase] = useState<VoicePipelinePhase>('idle');
  /** On-screen question text — synced when AI speaks or state updates. */
  const [displayQuestion, setDisplayQuestion] = useState('');
  const [introSpeaking, setIntroSpeaking] = useState(false);
  const [liveCaption, setLiveCaption] = useState('');
  /** True once the live UI has painted — intro TTS waits for this. */
  const [liveScreenReady, setLiveScreenReady] = useState(false);

  useInterviewImmersiveMode(roomPhase === 'live' || roomPhase === 'instructions');
  useInterviewRoomTheme(true);

  const pipelineBusyRef = useRef(false);
  const userMutedRef = useRef(false);

  const audioRecorderRef = useRef<AudioRecorderHandle>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const autoListenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoListeningRef = useRef(false);
  const noSpeechRetryRef = useRef(0);
  const submitInFlightRef = useRef(false);
  const autoListenQuestionIdRef = useRef<string | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingAnswerRef = useRef<string | null>(null);
  const cameraAnalysisFrameRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);
  const lastCodingQuestionIdRef = useRef<string | null>(null);
  const endedByUnloadRef = useRef(false);
  const introPipelineRanRef = useRef(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (roomPhase !== 'live') {
      introPipelineRanRef.current = false;
    }
  }, [roomPhase]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const [videoReadyTick, setVideoReadyTick] = useState(0);
  const onCameraVideoReady = useCallback(() => setVideoReadyTick((n) => n + 1), []);
  const avatarDragBoundsRef = useRef<HTMLDivElement>(null);

  const { faceAnalysis, modelsLoaded, loadError } = useInterviewFaceAnalysis({
    videoRef: cameraVideoRef,
    enabled: cameraOn,
    intervalMs: 120,
    onWaveDetected: () => setWaveMessageShown(true),
    videoReadyTick,
  });

  useEffect(() => {
    if (!waveMessageShown) return;
    const t = setTimeout(() => setWaveMessageShown(false), 2500);
    return () => clearTimeout(t);
  }, [waveMessageShown]);

  const clearAutoListenTimeout = useCallback(() => {
    if (autoListenTimeoutRef.current) {
      clearTimeout(autoListenTimeoutRef.current);
      autoListenTimeoutRef.current = null;
    }
  }, []);

  const startAutoListeningWindow = useCallback(() => {
    const latestAi = [...(state?.turns ?? [])].reverse().find((t) => t.role === 'ai');
    const isCodingTurn = Boolean(
      latestAi?.isCodingQuestion || latestAi?.codingStarterCode || latestAi?.codingLanguage
    );
    if (!voiceEnabled || loading || pipelineBusyRef.current || isCodingTurn) return;
    if (audioRecorderRef.current?.listening) return;
    clearAutoListenTimeout();
    autoListeningRef.current = true;
    setVoicePhase('listening');

    const tryStartMic = async (attempt = 0) => {
      if (!autoListeningRef.current) return;
      const started = (await audioRecorderRef.current?.start()) ?? false;
      if (started || audioRecorderRef.current?.listening) {
        setMicOn(true);
        return;
      }
      if (attempt < 8) {
        window.setTimeout(() => void tryStartMic(attempt + 1), 350);
        return;
      }
      autoListeningRef.current = false;
      setMicOn(false);
      setVoicePhase('idle');
      setError('Could not open the microphone. Please click the mic button or check browser permissions.');
    };

    void tryStartMic();

    const listenWindowMs = 125000;
    autoListenTimeoutRef.current = setTimeout(() => {
      audioRecorderRef.current?.stop();
      clearAutoListenTimeout();
    }, listenWindowMs);
  }, [voiceEnabled, loading, clearAutoListenTimeout, state]);

  /** Intro beats + first question are spoken manually on live entry — skip auto-TTS for those. */
  const manualSpokenAiTurnIds = useMemo(() => {
    const aiTurns = state?.turns?.filter((t) => t.role === 'ai') ?? [];
    if (!aiTurns.length) return null;
    const introTurns = aiTurns.filter((t) => t.isIntro);
    const firstQuestion = aiTurns.find((t) => !t.isIntro);
    if (introTurns.length >= 1 && firstQuestion) {
      return new Set([...introTurns.map((t) => t.id), firstQuestion.id]);
    }
    return new Set(aiTurns.slice(0, Math.min(2, aiTurns.length)).map((t) => t.id));
  }, [state?.turns]);
  const skipTurnIds = manualSpokenAiTurnIds;

  const syncDisplayQuestionFromState = useCallback((s: InterviewState | null | undefined) => {
    if (!s?.turns?.length) return;
    const lastAi =
      [...s.turns].reverse().find((t) => t.role === 'ai' && !t.isIntro) ??
      [...s.turns].reverse().find((t) => t.role === 'ai');
    if (lastAi?.content?.trim()) {
      setDisplayQuestion(lastAi.content.trim());
    }
  }, []);

  const handleAiSpeakText = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setDisplayQuestion(trimmed);
    setLiveCaption(trimmed);
    setIntroSpeaking(false);
  }, []);

  /** No auto-TTS during device-check / instructions — avoids overlap with the post-onboarding intro. */
  const voiceAutoPlayActive = voiceEnabled && roomPhase === 'live';
  const { stopSpeaking, markTurnSpoken } = useInterviewerVoice(state?.turns, voiceAutoPlayActive, {
    onSpeakText: handleAiSpeakText,
    onAutoSpeakStart: () => {
      clearAutoListenTimeout();
      autoListeningRef.current = false;
      noSpeechRetryRef.current = 0;
      audioRecorderRef.current?.cancel();
      setMicOn(false);
      setVoicePhase('speaking');
    },
    onAutoSpeakEnd: () => {
      noSpeechRetryRef.current = 0;
      userMutedRef.current = false;
      setLiveCaption('');
      setTimeout(() => {
        if (!voiceEnabled || loadingRef.current || pipelineBusyRef.current) return;
        startAutoListeningWindow();
      }, 200);
    },
    skipTurnIds,
    lang: interviewLang,
  });

  /** Stable refs for intro pipeline — state updates must not cancel in-flight intro TTS. */
  const startAutoListeningWindowRef = useRef(startAutoListeningWindow);
  const clearAutoListenTimeoutRef = useRef(clearAutoListenTimeout);
  const markTurnSpokenRef = useRef(markTurnSpoken);
  const syncDisplayQuestionFromStateRef = useRef(syncDisplayQuestionFromState);
  useEffect(() => {
    startAutoListeningWindowRef.current = startAutoListeningWindow;
    clearAutoListenTimeoutRef.current = clearAutoListenTimeout;
    markTurnSpokenRef.current = markTurnSpoken;
    syncDisplayQuestionFromStateRef.current = syncDisplayQuestionFromState;
  }, [startAutoListeningWindow, clearAutoListenTimeout, markTurnSpoken, syncDisplayQuestionFromState]);

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const voiceStatusPhase: VoicePipelinePhase = loading ? 'thinking' : voicePhase;
  const voiceStatusDetail =
    loading && answerText
      ? `"${answerText.slice(0, 120)}${answerText.length > 120 ? '…' : ''}"`
      : countdownRemaining > 0
        ? `Next question in ${countdownRemaining}s`
        : undefined;

  const loadState = useCallback(async () => {
    if (!id) return;
    try {
      const s = await api.getState(id);
      setState(s);
    } catch {
      setState(null);
    }
  }, [id]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    const onboarding = roomPhase === 'device-check' || roomPhase === 'instructions' || roomPhase === 'live';
    setInterviewRoomOnboarding(onboarding);
    return () => setInterviewRoomOnboarding(false);
  }, [roomPhase]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const brand = 'Intervion';
    if (roomPhase === 'device-check') document.title = `Camera & mic · ${brand}`;
    else if (roomPhase === 'instructions') document.title = `Interview notes · ${brand}`;
    else document.title = `Live interview · ${brand}`;
  }, [roomPhase]);

  const notepadStorageKey = id ? `intervion_notes_${id}` : '';
  const notepadLoadedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!notepadStorageKey || typeof window === 'undefined' || notepadLoadedRef.current === notepadStorageKey) return;
    notepadLoadedRef.current = notepadStorageKey;
    const saved = window.localStorage.getItem(notepadStorageKey);
    if (saved != null) setNotepadNotes(saved);
  }, [notepadStorageKey]);
  useEffect(() => {
    if (!notepadStorageKey || typeof window === 'undefined') return;
    window.localStorage.setItem(notepadStorageKey, notepadNotes);
  }, [notepadStorageKey, notepadNotes]);

  useEffect(() => {
    syncDisplayQuestionFromState(state);
  }, [state, syncDisplayQuestionFromState]);

  useEffect(() => {
    if (!state?.turns) return;
    const aiTurns = state.turns.filter((t) => t.role === 'ai');
    const introTurns = aiTurns.filter((t) => t.isIntro);
    const questionTurn = aiTurns.find((t) => !t.isIntro);
    console.log('[Intro] State turns', {
      total: state.turns.length,
      aiTurns: aiTurns.length,
      introBeats: introTurns.length,
      hasQuestion: Boolean(questionTurn),
      welcomeDelivered: state.welcomeDelivered,
    });
  }, [state?.turns, state?.welcomeDelivered]);

  useEffect(() => {
    if (!state) return;
    const lastAi = [...(state.turns ?? [])].reverse().find((t) => t.role === 'ai');
    const isCodingTurn = Boolean(lastAi?.isCodingQuestion || lastAi?.codingStarterCode || lastAi?.codingLanguage);
    if (isCodingTurn) setActiveTab('code');
  }, [state?.turns]);

  useEffect(() => {
    if (!state || loading) return;
    const lastAiTurn =
      [...state.turns].reverse().find((t) => t.role === 'ai' && !t.isIntro) ??
      [...state.turns].reverse().find((t) => t.role === 'ai');
    if (!lastAiTurn) return;
    if (autoListenQuestionIdRef.current === lastAiTurn.id) return;
    autoListenQuestionIdRef.current = lastAiTurn.id;

    // When voice is ON: do not start listening here — wait for the full question to be spoken, then onAutoSpeakEnd will start listening.
    // When voice is OFF: start listening now so the user can answer without TTS.
    const isCodingTurn = Boolean(
      lastAiTurn.isCodingQuestion || lastAiTurn.codingStarterCode || lastAiTurn.codingLanguage
    );
    if (!voiceEnabled && !isCodingTurn) {
      startAutoListeningWindow();
    }

    if (isCodingTurn) {
      clearAutoListenTimeout();
      autoListeningRef.current = false;
      audioRecorderRef.current?.stop();
    }
  }, [state, loading, voiceEnabled, startAutoListeningWindow]);

  useEffect(() => {
    const lastAiTurn = [...(state?.turns ?? [])].reverse().find((t) => t.role === 'ai');
    if (!lastAiTurn) return;
    const isCodingTurn = Boolean(
      lastAiTurn.isCodingQuestion || lastAiTurn.codingStarterCode || lastAiTurn.codingLanguage
    );
    if (!isCodingTurn) return;
    if (lastCodingQuestionIdRef.current === lastAiTurn.id) return;
    lastCodingQuestionIdRef.current = lastAiTurn.id;
    setCodeAnswer(lastAiTurn.codingStarterCode?.trim() || '');
    setCodeNotes('');
  }, [state]);

  const submitAnswerText = useCallback(async (rawText: string) => {
    const text = rawText.trim();
    if (!text || loading || submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    pipelineBusyRef.current = true;
    setPendingAnswer(null);
    setCountdownRemaining(0);
    pendingAnswerRef.current = null;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    stopSpeaking();
    clearAutoListenTimeout();
    autoListeningRef.current = false;
    noSpeechRetryRef.current = 0;
    audioRecorderRef.current?.stop();
    setMicOn(false);
    setVoicePhase('thinking');
    setError('');
    setLoading(true);
    try {
      const res = await api.submitAnswer(id, text);
      if (res.report) {
        setReport(res.report);
        setState(null);
      } else {
        if (res.state) {
          setState(res.state);
          syncDisplayQuestionFromState(res.state);
        } else if (res.nextReply) {
          setDisplayQuestion(res.nextReply.trim());
          loadState();
        }
      }
      setAnswerText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
      setVoicePhase('idle');
      if (voiceEnabled) {
        setTimeout(() => startAutoListeningWindow(), 500);
      }
    } finally {
      setLoading(false);
      pipelineBusyRef.current = false;
      submitInFlightRef.current = false;
    }
  }, [audioRecorderRef, clearAutoListenTimeout, id, loadState, loading, stopSpeaking, voiceEnabled, startAutoListeningWindow, syncDisplayQuestionFromState]);

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      const cleaned = text.trim();
      if (!cleaned) return;
      setMicOn(false);
      setVoicePhase('transcribing');
      setAnswerText(cleaned);
      autoListeningRef.current = false;
      noSpeechRetryRef.current = 0;
      clearAutoListenTimeout();
      setError('');
      setCameraUserIdle(false);
      setPendingAnswer(null);
      setCountdownRemaining(0);
      pendingAnswerRef.current = null;
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      // Submit immediately so the interview feels natural and efficient
      void submitAnswerText(cleaned);
    },
    [clearAutoListenTimeout, submitAnswerText]
  );

  const handleSubmitAnswer = () => {
    void submitAnswerText(answerText);
  };

  const handleSubmitCodeAnswer = () => {
    const solution = codeAnswer.trim();
    if (!solution) {
      setError('Please write your code before submitting.');
      return;
    }
    const lastAiTurn = [...(state?.turns ?? [])].reverse().find((t) => t.role === 'ai');
    const language = (lastAiTurn?.codingLanguage || 'javascript').toLowerCase();
    const note = codeNotes.trim();
    const formatted = [
      `Coding solution (${language}):`,
      `\`\`\`${language}\n${solution}\n\`\`\``,
      note ? `Explanation:\n${note}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    void submitAnswerText(formatted);
  };

  const handleEndInterview = async () => {
    stopSpeaking();
    clearAutoListenTimeout();
    autoListeningRef.current = false;
    noSpeechRetryRef.current = 0;
    audioRecorderRef.current?.stop();
    setLoading(true);
    try {
      const res = await api.endInterview(id);
      endedByUnloadRef.current = true;
      if (res.report) setReport(res.report);
      setState(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to end');
    } finally {
      setLoading(false);
    }
  };

  const handleMicToggle = () => {
    clearAutoListenTimeout();
    if (micOn) {
      userMutedRef.current = true;
      autoListeningRef.current = false;
      audioRecorderRef.current?.cancel();
      setMicOn(false);
      if (voicePhase === 'listening') setVoicePhase('idle');
      return;
    }
    userMutedRef.current = false;
    noSpeechRetryRef.current = 0;
    if (loading || pipelineBusyRef.current) return;
    startAutoListeningWindow();
  };

  const handleCameraToggle = () => {
    setCameraOn((p) => !p);
  };

  const handleStartScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      screenStreamRef.current = stream;
      setScreenStream(stream);
      toast.success('Screen shared');
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        stream.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
        setScreenStream(null);
        toast.success('Screen share ended');
      });
    } catch (err) {
      if (err instanceof Error && err.name !== 'NotAllowedError') {
        toast.error('Could not share screen');
      } else {
        toast('Share cancelled', { icon: '🖥️' });
      }
    }
  }, []);

  const handleStopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    toast.success('Screen share ended');
  }, []);

  const enterInstructionsPhase = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopSpeaking();
    clearAutoListenTimeout();
    autoListeningRef.current = false;
    noSpeechRetryRef.current = 0;
    audioRecorderRef.current?.cancel();
    setMicOn(false);
    introPipelineRanRef.current = false;
    setLiveScreenReady(false);
    setRoomPhase('instructions');
  }, [stopSpeaking, clearAutoListenTimeout]);

  const enterLiveRoom = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopSpeaking();
    introPipelineRanRef.current = false;
    setLiveScreenReady(false);
    void audioRecorderRef.current?.warmUp?.();
    if (typeof document !== 'undefined' && document.documentElement.requestFullscreen) {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
    setRoomPhase('live');
  }, [stopSpeaking]);

  const advanceFromDeviceCheck = useCallback(() => {
    enterInstructionsPhase();
  }, [enterInstructionsPhase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem('interviewBeginLive') !== '1') return;
    window.sessionStorage.removeItem('interviewBeginLive');
    if (roomPhase === 'device-check') {
      enterInstructionsPhase();
    }
  }, [enterInstructionsPhase, roomPhase]);

  useEffect(() => {
    if (roomPhase !== 'instructions') return;
    void audioRecorderRef.current?.warmUp?.();
  }, [roomPhase]);

  useEffect(() => {
    if (roomPhase !== 'live') {
      setLiveScreenReady(false);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        timer = setTimeout(() => {
          if (!cancelled) setLiveScreenReady(true);
        }, 400);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
  }, [roomPhase]);

  useEffect(() => {
    if (!screenStream || !screenVideoRef.current) return;
    screenVideoRef.current.srcObject = screenStream;
    return () => {
      screenVideoRef.current && (screenVideoRef.current.srcObject = null);
    };
  }, [screenStream]);

  // Live room: deliver welcome once, speak all intro beats + Q1, then open mic.
  // Do NOT list `state` in deps — setState during begin-live must not cancel this pipeline.
  useEffect(() => {
    if (roomPhase !== 'live' || !liveScreenReady || report || typeof window === 'undefined') return;
    if (introPipelineRanRef.current) return;
    introPipelineRanRef.current = true;

    let cancelled = false;

    const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    const finishIntroAndOpenMic = (questionTurnId?: string) => {
      if (cancelled) return;
      setIntroSpeaking(false);
      setLiveCaption('');
      setVoicePhase('listening');
      userMutedRef.current = false;
      if (questionTurnId) markTurnSpokenRef.current(questionTurnId);
      startAutoListeningWindowRef.current();
    };

    const speakSegment = async (text: string, isIntroBeat: boolean) => {
      await speakInterviewerText(text, {
        lang: interviewLang,
        onStart: () => {
          clearAutoListenTimeoutRef.current();
          autoListeningRef.current = false;
          audioRecorderRef.current?.cancel();
          setMicOn(false);
          setVoicePhase('speaking');
          setIntroSpeaking(isIntroBeat);
          setLiveCaption(text);
          if (!isIntroBeat) setDisplayQuestion(text);
        },
      });
    };

    const runVoiceIntro = async (liveState: InterviewState) => {
      const aiTurns = liveState.turns?.filter((t) => t.role === 'ai') ?? [];
      const introTurns = aiTurns.filter((t) => t.isIntro);
      const questionTurn = aiTurns.find((t) => !t.isIntro);
      const segments =
        introTurns.length >= 1
          ? [...introTurns.map((t) => t.content.trim()).filter(Boolean), ...(questionTurn?.content?.trim() ? [questionTurn.content.trim()] : [])]
          : aiTurns[0]?.content?.trim()
            ? [aiTurns[0].content.trim(), ...(aiTurns[1]?.content?.trim() ? [aiTurns[1].content.trim()] : [])]
            : [];

      if (segments.length === 0) {
        finishIntroAndOpenMic(questionTurn?.id);
        return;
      }

      const introSegmentCount = introTurns.length >= 1 ? introTurns.length : Math.max(0, segments.length - 1);

      try {
        setIntroSpeaking(true);
        await waitForSpeechVoices();
        for (let i = 0; i < segments.length; i++) {
          if (cancelled) return;
          const isIntroBeat = i < introSegmentCount;
          setLiveCaption(segments[i]);
          setIntroSpeaking(isIntroBeat);
          await speakSegment(segments[i], isIntroBeat);
          await pause(isIntroBeat ? 350 : 180);
        }
        if (questionTurn?.content?.trim()) {
          setDisplayQuestion(questionTurn.content.trim());
        }
        await pause(150);
        finishIntroAndOpenMic(questionTurn?.id ?? aiTurns[aiTurns.length - 1]?.id);
      } catch (e) {
        console.error('[Intro] Speech pipeline error', e);
        finishIntroAndOpenMic(questionTurn?.id ?? aiTurns[aiTurns.length - 1]?.id);
      }
    };

    const beginAndSpeak = async () => {
      try {
        let liveState: InterviewState | null = null;
        try {
          liveState = await api.getState(id);
        } catch {
          liveState = null;
        }

        const needsWelcome =
          !liveState?.welcomeDelivered ||
          !liveState?.turns.some((t) => t.role === 'ai' && t.isIntro);

        if (needsWelcome) {
          const res = await api.beginLiveInterview(id);
          if (cancelled) return;
          liveState = res.state;
          setState(res.state);
          syncDisplayQuestionFromStateRef.current(res.state);
        } else if (liveState) {
          setState(liveState);
          syncDisplayQuestionFromStateRef.current(liveState);
        }

        if (!liveState) {
          console.error('[Intro] No interview state available');
          introPipelineRanRef.current = false;
          return;
        }

        await runVoiceIntro(liveState);
      } catch (e) {
        console.error('[Intro] Failed to begin live interview', e);
        introPipelineRanRef.current = false;
        if (!cancelled) finishIntroAndOpenMic();
      }
    };

    void beginAndSpeak();

    return () => {
      cancelled = true;
    };
  }, [roomPhase, liveScreenReady, report, id, interviewLang]);

  useEffect(() => {
    return () => {
      clearAutoListenTimeout();
      autoListeningRef.current = false;
      noSpeechRetryRef.current = 0;
      audioRecorderRef.current?.stop();
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    };
  }, [clearAutoListenTimeout]);

  // When user closes tab or navigates away, end the interview so results appear on recruiter dashboard
  useEffect(() => {
    if (!id || typeof window === 'undefined') return;

    const endInterviewOnLeave = () => {
      if (endedByUnloadRef.current) return;
      endedByUnloadRef.current = true;
      const base = '/api/proxy';
      const url = `${window.location.origin}${base}/interview/${id}/end`;
      fetch(url, { method: 'POST', keepalive: true });
    };

    window.addEventListener('beforeunload', endInterviewOnLeave);
    window.addEventListener('pagehide', endInterviewOnLeave);
    return () => {
      window.removeEventListener('beforeunload', endInterviewOnLeave);
      window.removeEventListener('pagehide', endInterviewOnLeave);
    };
  }, [id]);

  // Camera-based idle detection while waiting before next question
  useEffect(() => {
    if (!pendingAnswer || !cameraOn || !cameraVideoRef.current) return;
    const video = cameraVideoRef.current;
    if (video.readyState < 2) return; // HAVE_CURRENT_DATA or more
    const w = 40;
    const h = 30;
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let lastPixels: Uint8ClampedArray | null = null;
    let idleFrames = 0;
    const IDLE_FRAMES_NEEDED = 10; // ~1s at 10fps
    const MOTION_THRESHOLD = 8;

    const SAMPLE_MS = 150;
    const tick = () => {
      if (!video.videoWidth || !pendingAnswerRef.current) return;
      try {
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          ctx = canvas.getContext('2d');
        }
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const pixels = imageData.data;
        if (lastPixels) {
          let diff = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            diff += Math.abs(pixels[i]! - lastPixels[i]!);
            diff += Math.abs(pixels[i + 1]! - lastPixels[i + 1]!);
            diff += Math.abs(pixels[i + 2]! - lastPixels[i + 2]!);
          }
          const meanDiff = diff / (pixels.length / 4);
          if (meanDiff < MOTION_THRESHOLD) {
            idleFrames += 1;
            if (idleFrames >= IDLE_FRAMES_NEEDED) setCameraUserIdle(true);
          } else {
            idleFrames = 0;
          }
        }
        lastPixels = new Uint8ClampedArray(pixels);
      } catch {
        // ignore
      }
      cameraAnalysisFrameRef.current = window.setTimeout(tick, SAMPLE_MS);
    };
    cameraAnalysisFrameRef.current = window.setTimeout(tick, SAMPLE_MS);
    return () => {
      if (cameraAnalysisFrameRef.current) {
        clearTimeout(cameraAnalysisFrameRef.current);
        cameraAnalysisFrameRef.current = null;
      }
    };
  }, [pendingAnswer, cameraOn]);

  if (report) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-dark">
        <header className="sticky top-0 z-10 border-b border-[var(--app-border)] bg-[var(--background)]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-sm font-medium text-[var(--app-muted)] hover:text-[var(--foreground)]">← Home</Link>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">Interview complete</h1>
            <Link href={`/report/${report.interviewId}`} className="text-sm font-medium text-[var(--landing-accent)] hover:text-[var(--landing-accent-hover)]">
              View full report →
            </Link>
          </div>
        </header>
        <main className="mx-auto flex-1 max-w-2xl px-6 py-12">
          <div className="glass-card mb-6 rounded-2xl p-6 shadow-card">
            <p className="mb-4 leading-relaxed text-[var(--app-muted)]">{report.summary}</p>
            <p className="text-sm text-[var(--app-muted)]">
              Score: {report.overallScore}/{report.maxScore} • Recommendation: {report.recommendation}
            </p>
          </div>
          <Link
            href="/recruiter"
            className="inline-block rounded-xl bg-[var(--landing-accent-solid)] px-6 py-3 font-medium text-white hover:bg-[var(--landing-accent)]"
          >
            Back to recruiter dashboard
          </Link>
        </main>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--interview-bg)]">
        <div className="w-full max-w-md space-y-4 px-6 text-center">
          <div className="mx-auto h-12 w-12 animate-pulse rounded-2xl bg-[var(--interview-border)]" />
          <div className="space-y-2">
            <div className="mx-auto h-4 w-48 animate-pulse rounded-lg bg-[var(--interview-border)]" />
            <div className="mx-auto h-3 w-64 animate-pulse rounded-lg bg-[var(--interview-border)]/70" />
          </div>
          <Link href="/interview" className="inline-block text-sm font-medium text-[var(--interview-accent)] hover:underline">
            Back to start
          </Link>
        </div>
      </div>
    );
  }

  const lastAiTurn = [...(state.turns ?? [])].reverse().find((t) => t.role === 'ai' && !t.isIntro)
    ?? [...(state.turns ?? [])].reverse().find((t) => t.role === 'ai');
  const lastCandidateTurn = [...(state.turns ?? [])].reverse().find((t) => t.role === 'candidate');
  const currentQuestion = displayQuestion || lastAiTurn?.content || 'Preparing your next question...';
  const panelLabel =
    voicePhase === 'speaking' && introSpeaking ? 'Introduction' : 'Current question';
  const panelText =
    voicePhase === 'speaking' && liveCaption ? liveCaption : currentQuestion;
  const codingTurnActive = Boolean(
    lastAiTurn?.isCodingQuestion || lastAiTurn?.codingStarterCode || lastAiTurn?.codingLanguage
  );
  const roleStr = state.role != null ? String(state.role).toLowerCase() : '';
  const isTechnical = roleStr === 'technical' || /technical/.test(roleStr);
  const firstAiContent = state.turns?.find((t) => t.role === 'ai')?.content ?? '';
  const contentSuggestsTechnical = /technical/i.test(firstAiContent);
  /** Technical interviews: show Code tab from the start. Non-technical: show Notepad tab unless user opened code panel. */
  const showCodeTab = Boolean(isTechnical || codingTurnActive || contentSuggestsTechnical || codePanelRequested);
  const showNotepadTab = Boolean(!showCodeTab);
  /** Recruiter default is Ethan; `zara` only when explicitly set on the schedule. */
  const interviewerPersona = state.interviewerPersona === 'zara' ? 'zara' : 'ethan';
  const interviewerDisplayName =
    interviewerPersona === 'zara' ? 'ZaraAlex (Intervion AI)' : 'Ethan (Intervion AI)';
  const interviewerFirstName = interviewerPersona === 'zara' ? 'ZaraAlex' : 'Ethan';
  const interviewerInitial = interviewerPersona === 'zara' ? 'Z' : 'E';
  /** Always show Interview + (Code or Notepad) tab bar when we have interview state. */
  const showTabBar = true;
  /** When true, use 50/50 split: left = interview, right = code editor + terminal. */
  const codePanelOpen = Boolean(showCodeTab && activeTab === 'code');

  if (roomPhase === 'device-check') {
    return (
      <InterviewDeviceCheck
        onNext={advanceFromDeviceCheck}
        cameraOn={cameraOn}
        onCameraOnChange={setCameraOn}
        cameraVideoRef={cameraVideoRef}
        onVideoReady={onCameraVideoReady}
        nextLabel="Continue to interview notes"
      />
    );
  }

  const voiceRecorderNode = (
    <AudioRecorder
      ref={audioRecorderRef}
      onTranscript={handleVoiceTranscript}
      silenceMs={2200}
      minRecordMs={600}
      minSpeechMs={400}
      maxRecordMs={120000}
      stopDelayMs={180}
      onNoSpeech={() => {
        if (!autoListeningRef.current || !voiceEnabled || loading) return;
        if (noSpeechRetryRef.current >= 3) {
          autoListeningRef.current = false;
          setVoicePhase('idle');
          setMicOn(false);
          setError('I could not hear your answer clearly. Please speak a little louder or unmute your mic.');
          return;
        }
        noSpeechRetryRef.current += 1;
        setError('');
        setVoicePhase('listening');
        setTimeout(() => {
          if (!autoListeningRef.current || loading || !voiceEnabled) return;
          startAutoListeningWindow();
        }, 200);
      }}
      disabled={loading || roomPhase !== 'live'}
      autoStart={false}
      onListeningChange={(listening) => {
        if (listening) {
          userMutedRef.current = false;
          setMicOn(true);
          setVoicePhase('listening');
          return;
        }
        if (userMutedRef.current || voicePhase === 'speaking') {
          setMicOn(false);
          return;
        }
        if (autoListeningRef.current) {
          setMicOn(false);
          setVoicePhase((prev) => (prev === 'listening' ? 'transcribing' : prev));
          return;
        }
        setMicOn(false);
      }}
      hideButton
    />
  );

  const elapsedSeconds = state.startedAt
    ? Math.max(0, Math.floor((nowTs - new Date(state.startedAt).getTime()) / 1000))
    : 0;
  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const seconds = String(elapsedSeconds % 60).padStart(2, '0');

  return (
    <>
      {roomPhase === 'instructions' ? (
        <InterviewInstructionsOverlay
          showCodeTab={showCodeTab}
          codingTurnActive={false}
          showNotepadTab={showNotepadTab}
          interviewLang={interviewLang}
          onShareScreen={() => void handleStartScreenShare()}
          onSoundsGood={enterLiveRoom}
        />
      ) : (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col bg-[var(--interview-bg)] text-[var(--interview-fg)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {!liveScreenReady && (
        <div className="absolute inset-0 z-[260] flex flex-col items-center justify-center gap-4 bg-[var(--interview-bg)]/95 backdrop-blur-sm">
          <div className="h-10 w-10 animate-pulse rounded-2xl bg-[var(--interview-border)]" />
          <p className="text-sm font-medium text-[var(--interview-muted)]">Your interview room is ready…</p>
        </div>
      )}
      <header className="shrink-0 flex flex-col gap-3 border-b border-[var(--interview-border)] bg-[var(--interview-card)]/90 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex shrink-0 items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <p className="text-lg font-semibold tracking-tight text-[var(--interview-fg)] sm:text-xl">Intervion</p>
          </div>
          <select
            value={interviewLang}
            onChange={(e) => {
              const v = e.target.value;
              setInterviewLang(v);
              if (typeof window !== 'undefined') window.localStorage.setItem('interviewLanguage', v);
            }}
            className="shrink-0 rounded-lg border border-[var(--interview-border)] bg-[var(--interview-card)] px-3 py-1.5 text-sm text-[var(--interview-fg)]"
            title="Interview language"
          >
            <option value="en-US">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="hi">हिन्दी</option>
            <option value="ar">العربية</option>
          </select>
          {showTabBar && (
            <div className="flex w-full min-w-0 shrink-0 basis-full flex-wrap items-center gap-1 rounded-xl border border-[var(--interview-border)] bg-[var(--interview-card)] p-1 shadow-[var(--interview-shadow)] sm:basis-auto sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('interview')}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
                  activeTab === 'interview'
                    ? 'bg-[var(--interview-accent)] text-white shadow-sm'
                    : 'text-[var(--interview-muted)] hover:text-[var(--interview-fg)]'
                }`}
              >
                Interview
              </button>
              {showCodeTab ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
                    activeTab === 'code'
                      ? 'bg-[var(--interview-accent)] text-white shadow-sm'
                      : 'text-[var(--interview-muted)] hover:text-[var(--interview-fg)]'
                  }`}
                >
                  Code
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('notepad')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
                    activeTab === 'notepad'
                      ? 'bg-[var(--interview-accent)] text-white shadow-sm'
                      : 'text-[var(--interview-muted)] hover:text-[var(--interview-fg)]'
                  }`}
                >
                  Notepad
                </button>
              )}
            </div>
          )}
        </div>
        <div className="shrink-0 rounded-2xl border border-[var(--interview-border)] bg-[var(--interview-card)] px-4 py-2 text-sm font-medium tabular-nums text-[var(--interview-muted)] shadow-[var(--interview-shadow)]">
          {minutes}:{seconds}
        </div>
      </header>

      <div className="relative min-h-0 flex-1 px-4 pb-24 pt-2 sm:px-6">
        {codePanelOpen ? (
          <div className="flex h-full w-full flex-row gap-3 sm:gap-4">
            {/* Left half — interview: camera, screen share, current question (narrow cards) */}
            <div className="flex min-w-0 flex-1 flex-col items-center overflow-hidden">
              <div className="w-full max-w-[320px] sm:max-w-[380px] flex flex-col gap-4">
              <div className="flex shrink-0 items-center justify-center py-2">
                {lastAiTurn?.avatarVideo ? (
                  <AIAvatar
                    videoUrl={lastAiTurn.avatarVideo}
                    name={interviewerFirstName}
                    subtitle="Intervion AI"
                    size="sm"
                    presentation="orb"
                    initialLetter={interviewerInitial}
                  />
                ) : (
                  <AIAvatar
                    name={interviewerFirstName}
                    subtitle="Intervion AI"
                    size="sm"
                    presentation="orb"
                    initialLetter={interviewerInitial}
                  />
                )}
              </div>
              {screenStream && (
                <div className="shrink-0 w-full overflow-hidden rounded-xl border-2 border-[var(--accent)] bg-[var(--surface-light-card)] shadow-lg">
                  <div className="flex items-center justify-between border-b border-[var(--surface-light-border)] bg-[var(--accent-muted)] px-3 py-2 text-xs font-semibold text-[var(--accent)]">
                    <span>Sharing screen</span>
                    <button
                      type="button"
                      onClick={handleStopScreenShare}
                      className="rounded-lg bg-[var(--accent)] px-2 py-1 text-white hover:bg-[var(--accent-hover)]"
                    >
                      Stop sharing
                    </button>
                  </div>
                  <div className="aspect-video bg-[var(--background)]">
                    <video ref={screenVideoRef} autoPlay muted playsInline className="h-full w-full object-contain" />
                  </div>
                </div>
              )}
              <div className="shrink-0 space-y-2">
                <div className="overflow-hidden rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] shadow-xl backdrop-blur">
                  <div className="border-b border-[var(--surface-light-border)] px-3 py-2 text-xs font-medium text-[var(--surface-light-muted)]">
                    Your camera
                  </div>
                  <div className="relative h-[180px] sm:h-[210px] bg-[var(--background)]">
                    <VideoPreview
                      compact
                      compactLayout="fill"
                      active={cameraOn}
                      onActiveChange={setCameraOn}
                      micMuted={!micOn}
                      videoRef={cameraVideoRef}
                      onVideoReady={onCameraVideoReady}
                    />
                  </div>
                </div>
                {cameraOn && (
                  <LiveAnalysisBlock
                    faceAnalysis={faceAnalysis}
                    modelsLoaded={modelsLoaded}
                    loadError={loadError}
                    waveMessageShown={waveMessageShown}
                    compact
                  />
                )}
                <div className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-2.5 shadow-sm overflow-hidden">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-1">{interviewerDisplayName}</p>
                  <p className="text-sm font-medium text-[var(--surface-light-fg)] line-clamp-2">Current question</p>
                  <p className="text-xs text-[var(--surface-light-muted)] whitespace-pre-wrap max-h-32 overflow-y-auto">{currentQuestion}</p>
                </div>
              </div>
              </div>
            </div>
            {/* Right half — code editor + terminal */}
            <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-3 shadow-sm">
              {codingTurnActive ? (
                <>
                  <div className="shrink-0 rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-3 py-2 text-sm text-[var(--surface-light-fg)] shadow-sm whitespace-pre-wrap overflow-auto max-h-24">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-1">{interviewerDisplayName}</p>
                    {currentQuestion}
                  </div>
                  <div className="min-h-0 flex-1 flex flex-col">
                    <CodeEditor value={codeAnswer} onChange={setCodeAnswer} disabled={loading} minHeight="200px" />
                  </div>
                  <textarea
                    rows={2}
                    value={codeNotes}
                    onChange={(e) => setCodeNotes(e.target.value)}
                    placeholder="Optional explanation"
                    className="w-full shrink-0 rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-3 py-2 text-xs text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)]"
                  />
                  <div className="shrink-0 flex items-center justify-between gap-2">
                    <p className="text-xs text-[var(--surface-light-muted)]">Submit your code as answer.</p>
                    <button
                      onClick={handleSubmitCodeAnswer}
                      disabled={loading}
                      className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                    >
                      {loading ? 'Submitting…' : 'Submit code answer'}
                    </button>
                  </div>
                  {error && (
                    <p className="rounded-lg border border-[var(--error-border)] bg-[var(--error-bg)] px-3 py-2 text-xs text-[var(--error-text)]">{error}</p>
                  )}
                </>
              ) : codePanelRequested ? (
                <>
                  <div className="shrink-0 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-muted)] px-3 py-2 text-sm text-[var(--surface-light-fg)]">
                    <p className="font-semibold text-[var(--accent)]">Code editor &amp; terminal</p>
                    <p className="mt-0.5 text-xs text-[var(--surface-light-muted)]">Write code and click <strong>Run</strong> to see output. When a coding question is asked, submit here.</p>
                  </div>
                  <div className="min-h-0 flex-1 flex flex-col">
                    <CodeEditor value={codeAnswer} onChange={setCodeAnswer} disabled={loading} minHeight="200px" />
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-muted)] px-4 py-4 text-sm text-[var(--surface-light-fg)]">
                  <p className="font-semibold text-[var(--accent)]">Code</p>
                  <p className="mt-2 text-[var(--surface-light-muted)]">Coding questions will appear here when the interviewer asks one.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div ref={avatarDragBoundsRef} className="absolute inset-0 overflow-hidden">
              <DraggableAvatarPanel
                storageKey={id ? `intervion_avatar_pos_${id}` : 'intervion_avatar_pos'}
                dragBoundsRef={avatarDragBoundsRef}
              >
                <div className="flex h-full min-h-[280px] w-full items-center justify-center px-4">
                  {lastAiTurn?.avatarVideo ? (
                    <AIAvatar
                      videoUrl={lastAiTurn.avatarVideo}
                      name={interviewerFirstName}
                      subtitle="Intervion AI"
                      size="lg"
                      presentation="orb"
                      initialLetter={interviewerInitial}
                    />
                  ) : (
                    <AIAvatar
                      name={interviewerFirstName}
                      subtitle="Intervion AI"
                      size="lg"
                      presentation="orb"
                      initialLetter={interviewerInitial}
                    />
                  )}
                </div>
              </DraggableAvatarPanel>
            </div>

            {screenStream && (
              <div className="absolute left-6 top-20 z-20 w-[320px] overflow-hidden rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface-light-card)] shadow-xl">
                <div className="flex items-center justify-between border-b border-[var(--surface-light-border)] bg-[var(--accent-muted)] px-3 py-2 text-xs font-semibold text-[var(--accent)]">
                  <span>Sharing screen</span>
                  <button
                    type="button"
                    onClick={handleStopScreenShare}
                    className="rounded-lg bg-[var(--accent)] px-2 py-1 text-white hover:bg-[var(--accent-hover)]"
                  >
                    Stop sharing
                  </button>
                </div>
                <div className="aspect-video bg-[var(--background)]">
                  <video ref={screenVideoRef} autoPlay muted playsInline className="h-full w-full object-contain" />
                </div>
              </div>
            )}

            <div className="absolute bottom-8 left-6 w-[min(92vw,380px)] min-w-[280px] space-y-2 sm:min-w-[300px]">
          <div className="overflow-hidden rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] shadow-xl backdrop-blur-md ring-1 ring-black/5">
            <div className="border-b border-[var(--surface-light-border)] px-3 py-2 text-xs font-medium text-[var(--surface-light-muted)]">
              Your camera
            </div>
            <div className="relative h-[200px] sm:h-[240px] bg-[var(--background)]">
              <VideoPreview
                compact
                compactLayout="fill"
                active={cameraOn}
                onActiveChange={setCameraOn}
                micMuted={!micOn}
                videoRef={cameraVideoRef}
                onVideoReady={onCameraVideoReady}
              />
            </div>
          </div>
          {cameraOn && (
            <LiveAnalysisBlock
              faceAnalysis={faceAnalysis}
              modelsLoaded={modelsLoaded}
              loadError={loadError}
              waveMessageShown={waveMessageShown}
            />
          )}
        </div>

        {showCodeTab && activeTab === 'code' ? (
          <div className="absolute right-6 top-20 bottom-28 w-[560px] min-w-[520px] space-y-3">
            {codingTurnActive ? (
              <>
                <div className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-sm text-[var(--surface-light-fg)] shadow-sm whitespace-pre-wrap">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-2">{interviewerDisplayName}</p>
                  {currentQuestion}
                </div>
                <div className="h-[calc(100%-170px)]">
                  <CodeEditor value={codeAnswer} onChange={setCodeAnswer} disabled={loading} minHeight="260px" />
                </div>
                <textarea
                  rows={3}
                  value={codeNotes}
                  onChange={(e) => setCodeNotes(e.target.value)}
                  placeholder="Optional explanation for your approach"
                  className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--surface-light-muted)]">Submit your code as interview answer.</p>
                  <button
                    onClick={handleSubmitCodeAnswer}
                    disabled={loading}
                    className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                  >
                    {loading ? 'Submitting…' : 'Submit code answer'}
                  </button>
                </div>
                {error && (
                  <p className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">{error}</p>
                )}
              </>
            ) : codePanelRequested ? (
              <>
                <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-muted)] px-4 py-3 text-sm text-[var(--surface-light-fg)]">
                  <p className="font-semibold text-[var(--accent)]">Code editor &amp; terminal</p>
                  <p className="mt-1 text-[var(--surface-light-muted)]">Write code and click <strong>Run</strong> to see output below. When a coding question is asked, submit your solution here.</p>
                </div>
                <div className="h-[calc(100%-120px)]">
                  <CodeEditor value={codeAnswer} onChange={setCodeAnswer} disabled={loading} minHeight="260px" />
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-muted)] px-4 py-4 text-sm text-[var(--surface-light-fg)]">
                {currentQuestion ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-1">{interviewerDisplayName}</p>
                    <p className="font-semibold text-[var(--accent)]">Voice question (answer in Interview tab)</p>
                    <p className="mt-2 leading-7">{currentQuestion}</p>
                    <p className="mt-3 text-xs text-[var(--surface-light-muted)]">Switch to the <strong>Interview</strong> tab and use your microphone to answer. Or click the <strong>code</strong> button in the control bar to open the editor.</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-[var(--accent)]">Code</p>
                    <p className="mt-2 text-[var(--surface-light-muted)]">Coding questions will appear here when the interviewer asks one. Use the <strong>Interview</strong> tab for voice questions.</p>
                    <p className="mt-2 text-xs text-[var(--surface-light-muted)]">You can open the code editor anytime with the <strong>{'</>'}</strong> button in the control bar below.</p>
                  </>
                )}
              </div>
            )}
          </div>
        ) : codingTurnActive && !showCodeTab ? (
          <div className="absolute right-6 top-20 bottom-28 w-[560px] min-w-[520px] space-y-3">
            <div className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-sm text-[var(--surface-light-fg)] shadow-sm">
              {currentQuestion}
            </div>
            <div className="h-[calc(100%-170px)]">
              <CodeEditor value={codeAnswer} onChange={setCodeAnswer} disabled={loading} minHeight="260px" />
            </div>
            <textarea
              rows={3}
              value={codeNotes}
              onChange={(e) => setCodeNotes(e.target.value)}
              placeholder="Optional explanation for your approach"
              className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--surface-light-muted)]">Submit your code as interview answer.</p>
              <button
                onClick={handleSubmitCodeAnswer}
                disabled={loading}
                className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {loading ? 'Submitting…' : 'Submit code answer'}
              </button>
            </div>
            {error && (
              <p className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">{error}</p>
            )}
          </div>
        ) : showNotepadTab && activeTab === 'notepad' ? (
          <div className="absolute right-6 top-20 bottom-28 w-[560px] min-w-[520px] flex flex-col gap-3">
            <div className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-1">{interviewerDisplayName}</p>
              <p className="text-sm text-[var(--surface-light-muted)]">Use this notepad for your own notes. Notes are saved on your device only.</p>
            </div>
            <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] overflow-hidden">
              <textarea
                value={notepadNotes}
                onChange={(e) => setNotepadNotes(e.target.value)}
                placeholder="Your notes (saved automatically on this device)..."
                className="flex-1 w-full min-h-[260px] p-4 text-sm text-[var(--surface-light-fg)] bg-[var(--surface-light-input)] border-0 outline-none focus:ring-0 resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="absolute right-8 top-1/2 w-[400px] max-h-[85vh] -translate-y-1/2 space-y-4 overflow-y-auto rounded-2xl border border-[var(--interview-border)] bg-[var(--interview-card)]/95 p-5 shadow-[var(--interview-shadow)] backdrop-blur-sm">
            {showCodeTab && codingTurnActive && (
              <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-muted)] px-4 py-3 text-sm text-[var(--surface-light-fg)]">
                <p className="font-semibold text-[var(--accent)]">Coding problem active</p>
                <p className="mt-1 text-[var(--surface-light-muted)]">Switch to the <strong>Code</strong> tab to solve the problem.</p>
              </div>
            )}
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">{interviewerDisplayName}</p>
            <p className="text-[15px] font-medium text-[var(--interview-fg)]">{panelLabel}</p>
            <p className="text-[15px] leading-7 text-[var(--interview-fg)] whitespace-pre-wrap">{panelText}</p>
            {lastCandidateTurn?.content && (
              <div className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--accent-muted)] px-4 py-3 text-sm text-[var(--surface-light-fg)]">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Your last answer (submitted)</p>
                <p className="leading-relaxed">{lastCandidateTurn.content}</p>
              </div>
            )}
            <InterviewStatusBar
              phase={voiceStatusPhase}
              micOn={micOn}
              detail={voiceStatusDetail}
            />
            {error && (
              <p className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">{error}</p>
            )}
          </div>
        )}
          </>
        )}

        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-[var(--interview-border)] bg-[var(--interview-card)]/95 px-4 py-2 shadow-[var(--interview-shadow)] backdrop-blur-sm">
          <button
            onClick={handleMicToggle}
            disabled={loading || codingTurnActive}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition ${
              micOn ? 'bg-[var(--interview-accent)] hover:opacity-90' : 'bg-[var(--interview-muted)] hover:opacity-90'
            } disabled:opacity-50`}
            title="Toggle microphone"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.75a6.75 6.75 0 006.75-6.75V8.25m-13.5 0V12A6.75 6.75 0 0012 18.75m0 0V21m-4.5 0h9" />
            </svg>
          </button>
          <button
            onClick={handleCameraToggle}
            disabled={loading}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition ${
              cameraOn ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]' : 'bg-[var(--surface-light-muted)] hover:opacity-90'
            } disabled:opacity-50`}
            title="Toggle camera"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-9 4h8a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={screenStream ? handleStopScreenShare : handleStartScreenShare}
            disabled={loading}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition ${
              screenStream ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[var(--surface-light-muted)] hover:opacity-90'
            } disabled:opacity-50`}
            title={screenStream ? 'Stop sharing screen' : 'Share screen'}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              if (codePanelOpen) {
                setActiveTab('interview');
                if (!codingTurnActive) setCodePanelRequested(false);
                return;
              }
              setCodePanelRequested(true);
              setActiveTab('code');
            }}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition ${
              codePanelOpen ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]' : 'bg-[var(--surface-light-muted)] hover:opacity-90'
            } disabled:opacity-50`}
            title={codePanelOpen ? 'Hide code editor' : 'Open code editor & terminal'}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>
          <button
            onClick={handleEndInterview}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--error-text)] text-white transition hover:opacity-90 disabled:opacity-50"
            title="End interview"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
      )}
      {voiceRecorderNode}
    </>
  );
}
