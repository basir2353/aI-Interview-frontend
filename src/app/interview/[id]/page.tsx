'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { InterviewState, InterviewReport } from '@/types';
import { AudioRecorder, type AudioRecorderHandle } from '@/components/AudioRecorder';
import { VideoPreview } from '@/components/VideoPreview';
import { CodeEditor } from '@/components/CodeEditor';
import { HeyGenAvatar, type HeyGenAvatarHandle } from '@/components/HeyGenAvatar';
import { useInterviewerVoice } from '@/hooks/useInterviewerVoice';
import { useInterviewFaceAnalysis, type EmotionLabel } from '@/hooks/useInterviewFaceAnalysis';
import { waitForSpeechVoices, pickPreferredInterviewerVoice } from '@/lib/voicePreferences';

function emotionLabel(e: EmotionLabel): string {
  const labels: Record<EmotionLabel, string> = {
    neutral: 'Neutral',
    smiling: 'Smiling',
    concentrating: 'Concentrating',
    surprised: 'Surprised',
    speaking: 'Speaking',
    thinking: 'Thinking',
  };
  return labels[e] ?? 'Neutral';
}

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
  const [showNotesAlert, setShowNotesAlert] = useState(true);
  const [notepadNotes, setNotepadNotes] = useState('');
  /** When true, user has clicked "Open code" so we show Code tab + editor/terminal even if no coding question yet */
  const [codePanelRequested, setCodePanelRequested] = useState(false);
  const [interviewLang, setInterviewLang] = useState<string>(() => {
    if (typeof window === 'undefined') return 'en-US';
    return window.localStorage.getItem('interviewLanguage') || 'en-US';
  });

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
  const hasRunStartPromptRef = useRef(false);
  const skipFirstTurnIdRef = useRef<string | null>(null);

  // HeyGen real-person avatar — speaks AI turns, disables browser TTS once ready
  const heyGenAvatarRef = useRef<HeyGenAvatarHandle>(null);
  const [heyGenReady, setHeyGenReady] = useState(false);
  const heyGenLastSpokenRef = useRef<string | null>(null);

  const faceAnalysis = useInterviewFaceAnalysis({
    videoRef: cameraVideoRef,
    enabled: cameraOn,
    intervalMs: 120,
    onWaveDetected: () => setWaveMessageShown(true),
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
    if (!voiceEnabled || loading || isCodingTurn) return;
    clearAutoListenTimeout();
    autoListeningRef.current = true;
    setMicOn(true); // Auto-unmute so user sees mic is on and we record their answer
    audioRecorderRef.current?.start();
    // Long window so user can finish their full answer before we process (2 min + buffer)
    const listenWindowMs = 125000;
    autoListenTimeoutRef.current = setTimeout(() => {
      audioRecorderRef.current?.stop();
      clearAutoListenTimeout();
    }, listenWindowMs);
  }, [voiceEnabled, loading, clearAutoListenTimeout, state]);

  // So the hook skips speaking the first turn; we speak it after voice instructions
  if (state?.turns?.length === 1) {
    const firstAi = state.turns.find((t) => t.role === 'ai');
    if (firstAi && !skipFirstTurnIdRef.current) skipFirstTurnIdRef.current = firstAi.id;
  }
  const skipTurnIds = skipFirstTurnIdRef.current
    ? new Set<string>([skipFirstTurnIdRef.current])
    : null;
  const { stopSpeaking, speakText } = useInterviewerVoice(state?.turns, voiceEnabled && !heyGenReady, {
    onAutoSpeakStart: () => {
      clearAutoListenTimeout();
      autoListeningRef.current = false;
      noSpeechRetryRef.current = 0;
      audioRecorderRef.current?.stop();
    },
    onAutoSpeakEnd: () => {
      noSpeechRetryRef.current = 0;
      setTimeout(() => {
        if (!loading && voiceEnabled) startAutoListeningWindow();
      }, 220);
    },
    skipTurnIds,
    lang: interviewLang,
  });

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    if (state?.turns) {
      console.log(`[Page] Turns updated: ${state.turns.length} turns now present.`);
    }
  }, [state?.turns]);

  useEffect(() => {
    if (!state) return;
    const lastAi = [...(state.turns ?? [])].reverse().find((t) => t.role === 'ai');
    const isCodingTurn = Boolean(lastAi?.isCodingQuestion || lastAi?.codingStarterCode || lastAi?.codingLanguage);
    if (isCodingTurn) setActiveTab('code');
  }, [state?.turns]);

  useEffect(() => {
    if (!state || loading) return;
    const lastAiTurn = [...state.turns].reverse().find((t) => t.role === 'ai');
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
        } else if (res.nextReply) {
          loadState();
        }
      }
      setAnswerText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setLoading(false);
      submitInFlightRef.current = false;
    }
  }, [audioRecorderRef, clearAutoListenTimeout, id, loadState, loading, stopSpeaking]);

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      const cleaned = text.trim();
      if (!cleaned) return;
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
    autoListeningRef.current = false;
    noSpeechRetryRef.current = 0;
    clearAutoListenTimeout();
    audioRecorderRef.current?.toggle();
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

  useEffect(() => {
    if (!screenStream || !screenVideoRef.current) return;
    screenVideoRef.current.srcObject = screenStream;
    return () => {
      screenVideoRef.current && (screenVideoRef.current.srcObject = null);
    };
  }, [screenStream]);

  // When interview starts: voice-only instructions (no pop-up), then first question, then prompt for screen share
  useEffect(() => {
    if (!state || report || hasRunStartPromptRef.current || typeof window === 'undefined') return;
    const firstAiTurn = state.turns?.find((t) => t.role === 'ai');
    if (!firstAiTurn?.content?.trim()) return;

    hasRunStartPromptRef.current = true;

    const instructionsText =
      "Welcome to Intervion. Your interviewer will introduce themselves in a moment. You will be asked to share your screen — please choose your window or entire screen when prompted. Do not use external help during the interview. Keep your camera and mic on. Your mic will turn on automatically after each question so you can answer. Let's begin.";

    const runVoiceIntro = async () => {
      if (!window.speechSynthesis) {
        speakText(firstAiTurn.content.trim(), interviewLang);
        setTimeout(handleStartScreenShare, 1500);
        setTimeout(() => startAutoListeningWindow(), 500);
        return;
      }
      const voices = await waitForSpeechVoices();
      const voice = pickPreferredInterviewerVoice(voices);
      const lang = interviewLang || voice?.lang || 'en-US';

      return new Promise<void>((resolve) => {
        window.speechSynthesis.cancel();
        const instructionUtterance = new SpeechSynthesisUtterance(instructionsText);
        instructionUtterance.voice = voice;
        instructionUtterance.lang = lang;
        instructionUtterance.rate = 0.96;
        instructionUtterance.pitch = 1.03;
        instructionUtterance.onend = () => {
          const firstQuestionUtterance = new SpeechSynthesisUtterance(firstAiTurn.content.trim());
          firstQuestionUtterance.voice = voice;
          firstQuestionUtterance.lang = lang;
          firstQuestionUtterance.rate = 0.96;
          firstQuestionUtterance.pitch = 1.03;
          firstQuestionUtterance.onend = () => {
            startAutoListeningWindow();
            setTimeout(handleStartScreenShare, 1800);
            resolve();
          };
          firstQuestionUtterance.onerror = () => {
            startAutoListeningWindow();
            setTimeout(handleStartScreenShare, 1800);
            resolve();
          };
          window.speechSynthesis.speak(firstQuestionUtterance);
        };
        instructionUtterance.onerror = () => resolve();
        window.speechSynthesis.speak(instructionUtterance);
      });
    };

    void runVoiceIntro();
  }, [state, report, handleStartScreenShare, speakText, interviewLang, startAutoListeningWindow]);

  // Called by HeyGenAvatar when its WebRTC session is established and the avatar is ready to speak.
  // From this point forward, HeyGen speaks AI turns (browser TTS is disabled via heyGenReady).
  const handleHeyGenReady = useCallback(() => {
    // Cancel any ongoing browser TTS (welcome intro or ongoing question)
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    // Mark current last AI turn as already-spoken so HeyGen doesn't re-read it
    const currentLastAi = [...(state?.turns ?? [])].reverse().find((t) => t.role === 'ai');
    heyGenLastSpokenRef.current = currentLastAi?.id ?? null;
    setHeyGenReady(true);
  }, [state?.turns]);

  const handleHeyGenSpeakStart = useCallback(() => {
    clearAutoListenTimeout();
    autoListeningRef.current = false;
    noSpeechRetryRef.current = 0;
    audioRecorderRef.current?.stop();
  }, [clearAutoListenTimeout]);

  const handleHeyGenSpeakEnd = useCallback(() => {
    noSpeechRetryRef.current = 0;
    setTimeout(() => {
      if (!loading && voiceEnabled) startAutoListeningWindow();
    }, 220);
  }, [loading, voiceEnabled, startAutoListeningWindow]);

  // Watch for new AI turns and speak them through the HeyGen real-person avatar
  useEffect(() => {
    if (!heyGenReady || !state?.turns) return;
    const lastAiTurn = [...state.turns].reverse().find((t) => t.role === 'ai');
    if (!lastAiTurn || lastAiTurn.id === heyGenLastSpokenRef.current) return;
    heyGenLastSpokenRef.current = lastAiTurn.id;
    void heyGenAvatarRef.current?.speak(lastAiTurn.content);
  }, [state?.turns, heyGenReady]);

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

  if (!state && !report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-dark">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[var(--landing-accent)]/30 border-t-[var(--landing-accent-solid)]" />
          <p className="mb-4 text-[var(--app-muted)]">Loading interview…</p>
          <Link href="/interview" className="text-sm font-medium text-[var(--landing-accent)] hover:text-[var(--landing-accent-hover)]">Back to start</Link>
        </div>
      </div>
    );
  }

  const lastAiTurn = [...(state?.turns ?? [])].reverse().find((t) => t.role === 'ai');
  const lastCandidateTurn = [...(state?.turns ?? [])].reverse().find((t) => t.role === 'candidate');
  const currentQuestion = lastAiTurn?.content ?? 'Preparing your next question...';
  const codingTurnActive = Boolean(
    lastAiTurn?.isCodingQuestion || lastAiTurn?.codingStarterCode || lastAiTurn?.codingLanguage
  );
  const roleStr = state?.role != null ? String(state.role).toLowerCase() : '';
  const isTechnical = roleStr === 'technical' || /technical/.test(roleStr);
  const firstAiContent = state?.turns?.find((t) => t.role === 'ai')?.content ?? '';
  const contentSuggestsTechnical = /technical/i.test(firstAiContent);
  /** Technical interviews: show Code tab from the start. Non-technical: show Notepad tab unless user opened code panel. */
  const showCodeTab = Boolean(state && (isTechnical || codingTurnActive || contentSuggestsTechnical || codePanelRequested));
  const showNotepadTab = Boolean(state && !showCodeTab);
  const interviewerDisplayName = isTechnical ? 'Ethan (Intervion AI)' : 'ZaraAlex (Intervion AI)';
  /** Always show Interview + (Code or Notepad) tab bar when we have interview state. */
  const showTabBar = Boolean(state);
  /** When true, use 50/50 split: left = interview, right = code editor + terminal. */
  const codePanelOpen = (showCodeTab && activeTab === 'code') || (codingTurnActive && !showCodeTab);

  const elapsedSeconds = state?.startedAt
    ? Math.max(0, Math.floor((nowTs - new Date(state.startedAt).getTime()) / 1000))
    : 0;
  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const seconds = String(elapsedSeconds % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 flex flex-col bg-[var(--surface-light)] text-[var(--surface-light-fg)]">
      <header className="shrink-0 flex flex-col gap-3 border-b border-[var(--surface-light-border)] bg-[var(--surface-light)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex shrink-0 items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[var(--success-text)]" />
            <p className="text-lg font-bold tracking-tight sm:text-xl">Intervion</p>
          </div>
          <select
            value={interviewLang}
            onChange={(e) => {
              const v = e.target.value;
              setInterviewLang(v);
              if (typeof window !== 'undefined') window.localStorage.setItem('interviewLanguage', v);
            }}
            className="shrink-0 rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-1.5 text-sm text-[var(--surface-light-fg)]"
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
            <div className="flex w-full min-w-0 shrink-0 basis-full flex-wrap items-center gap-1 rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-1 shadow-sm sm:basis-auto sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('interview')}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4 ${
                  activeTab === 'interview'
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--surface-light-muted)] hover:text-[var(--surface-light-fg)]'
                }`}
              >
                Interview
              </button>
              {showCodeTab ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4 ${
                    activeTab === 'code'
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--surface-light-muted)] hover:text-[var(--surface-light-fg)]'
                  }`}
                >
                  Code
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('notepad')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4 ${
                    activeTab === 'notepad'
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--surface-light-muted)] hover:text-[var(--surface-light-fg)]'
                  }`}
                >
                  Notepad
                </button>
              )}
            </div>
          )}
        </div>
        <div className="shrink-0 rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-2 text-sm font-medium text-[var(--surface-light-muted)] shadow-sm">
          {minutes}:{seconds}
        </div>
      </header>

      {showNotesAlert && (
        <div className="mx-6 mt-2 flex items-start justify-between gap-4 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-muted)] px-4 py-3 text-sm">
          <div className="text-[var(--surface-light-fg)]">
            <p className="font-semibold text-[var(--accent)] mb-1">Interview notes</p>
            <ul className="list-none space-y-0.5 text-[var(--surface-light-muted)]">
              <li>• Share your screen when the browser asks — choose window or entire screen.</li>
              <li>• Do not use external AI, search, or other assistance.</li>
              {showCodeTab && !codingTurnActive && (
                <li>• <strong>Code tab:</strong> For coding questions, click <strong>Code</strong> in the header to open the editor and submit your solution.</li>
              )}
              {codingTurnActive && (
                <li>• <strong>Code tab is now active:</strong> A code editor and terminal have opened automatically — write, run, and submit your solution there.</li>
              )}
              {showNotepadTab && !codingTurnActive && (
                <li>• <strong>Notepad tab:</strong> Your notes are saved on your device only. Use it to jot down points during the interview.</li>
              )}
              {!showCodeTab && !codingTurnActive && (
                <li>• <strong>Coding question:</strong> If a coding problem is scheduled as the last question, a code editor and terminal will open automatically when it is asked.</li>
              )}
              <li>• Your mic turns on automatically after each question so you can answer.</li>
              <li>• You can stop screen share anytime via &quot;Stop sharing&quot; or the control bar.</li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setShowNotesAlert(false)}
            className="shrink-0 rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-1.5 text-xs font-medium text-[var(--surface-light-fg)] hover:bg-[var(--surface-light-muted)]"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="relative min-h-0 flex-1 px-4 pb-24 pt-2 sm:px-6">
        {codePanelOpen ? (
          <div className="flex h-full w-full flex-row gap-3 sm:gap-4">
            {/* Left half — interview: camera, screen share, current question (narrow cards) */}
            <div className="flex min-w-0 flex-1 flex-col items-center overflow-hidden">
              <div className="w-full max-w-[280px] sm:max-w-[300px] flex flex-col gap-4">
              <div className="flex shrink-0 items-center justify-center py-2">
                <HeyGenAvatar
                  ref={heyGenAvatarRef}
                  name={interviewerDisplayName.split(' ')[0]}
                  subtitle="Intervion AI"
                  avatarId={isTechnical ? 'Wayne_20240711' : 'Anna_public_3_20240108'}
                  size="sm"
                  onReady={handleHeyGenReady}
                  onSpeakStart={handleHeyGenSpeakStart}
                  onSpeakEnd={handleHeyGenSpeakEnd}
                />
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
                  <div className="h-[140px] sm:h-[160px] bg-[var(--background)]">
                    <VideoPreview
                      compact
                      active={cameraOn}
                      onActiveChange={setCameraOn}
                      micMuted={!micOn}
                      videoRef={cameraVideoRef}
                    />
                  </div>
                </div>
                {cameraOn && (
                  <div className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-2 shadow-sm">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--surface-light-muted)]">Live analysis</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${faceAnalysis.faceDetected ? 'bg-[var(--success-text)]' : 'bg-[var(--surface-light-muted)]'}`} />
                        <span>{faceAnalysis.faceDetected ? 'Face detected' : 'No face'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--surface-light-muted)]">Emotion:</span>
                        <span className="capitalize">{emotionLabel(faceAnalysis.emotion)}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-2.5 shadow-sm overflow-hidden">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-1">{interviewerDisplayName}</p>
                  <p className="text-sm font-medium text-[var(--surface-light-fg)] line-clamp-2">Current question</p>
                  <p className="text-xs text-[var(--surface-light-muted)] line-clamp-3 whitespace-pre-wrap">{currentQuestion}</p>
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
            <div className="absolute inset-0 flex items-center justify-center">
              <HeyGenAvatar
                ref={heyGenAvatarRef}
                name={interviewerDisplayName.split(' ')[0]}
                subtitle="Intervion AI"
                avatarId={isTechnical ? 'Wayne_20240711' : 'Anna_public_3_20240108'}
                size="lg"
                onReady={handleHeyGenReady}
                onSpeakStart={handleHeyGenSpeakStart}
                onSpeakEnd={handleHeyGenSpeakEnd}
              />
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

            <div className="absolute bottom-8 left-6 w-[260px] sm:w-[280px] space-y-2">
          <div className="overflow-hidden rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] shadow-lg backdrop-blur">
            <div className="border-b border-[var(--surface-light-border)] px-3 py-2 text-xs font-medium text-[var(--surface-light-muted)]">
              Your camera
            </div>
            <div className="h-[160px] sm:h-[180px] bg-[var(--background)]">
              <VideoPreview
                compact
                active={cameraOn}
                onActiveChange={setCameraOn}
                micMuted={!micOn}
                videoRef={cameraVideoRef}
              />
            </div>
          </div>
          {cameraOn && (
            <div className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-3 py-2.5 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--surface-light-muted)]">
                Live analysis
              </p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${faceAnalysis.faceDetected ? 'bg-[var(--success-text)]' : 'bg-[var(--surface-light-muted)]'}`} />
                  <span className="text-[var(--surface-light-fg)]">{faceAnalysis.faceDetected ? 'Face detected' : 'No face'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--surface-light-muted)]">Emotion:</span>
                  <span className="capitalize text-[var(--surface-light-fg)]">{emotionLabel(faceAnalysis.emotion)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--surface-light-muted)]">Lips:</span>
                  <span className="text-[var(--surface-light-fg)]">
                    {faceAnalysis.lipOpenness > 0.2 ? 'Active (speaking)' : 'Closed'}
                  </span>
                </div>
                {waveMessageShown && (
                  <p className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-muted)] px-2 py-1.5 font-medium text-[var(--accent)]">
                    <span>👋</span> Wave detected — Hello!
                  </p>
                )}
              </div>
            </div>
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
          <div className="absolute right-8 top-1/2 w-[400px] max-h-[85vh] -translate-y-1/2 space-y-4 overflow-y-auto">
            {showCodeTab && codingTurnActive && (
              <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-muted)] px-4 py-3 text-sm text-[var(--surface-light-fg)]">
                <p className="font-semibold text-[var(--accent)]">Coding problem active</p>
                <p className="mt-1 text-[var(--surface-light-muted)]">Switch to the <strong>Code</strong> tab to solve the problem.</p>
              </div>
            )}
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-1">{interviewerDisplayName}</p>
            <p className="text-[15px] font-medium text-[var(--surface-light-fg)]">Current question</p>
            <p className="text-[15px] leading-7 text-[var(--surface-light-fg)] whitespace-pre-wrap">{currentQuestion}</p>
            {lastCandidateTurn?.content && (
              <div className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--accent-muted)] px-4 py-3 text-sm text-[var(--surface-light-fg)]">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Your last answer (submitted)</p>
                <p className="leading-relaxed">{lastCandidateTurn.content}</p>
              </div>
            )}
            <div className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-sm text-[var(--surface-light-muted)] shadow-sm">
              {loading
                ? (answerText ? (
                    <>
                      <p className="font-medium text-[var(--surface-light-fg)]">Processing your answer…</p>
                      <p className="mt-1 line-clamp-2 text-[var(--surface-light-muted)]">&ldquo;{answerText.slice(0, 120)}{answerText.length > 120 ? '…' : ''}&rdquo;</p>
                    </>
                  ) : 'Processing your answer…')
                : countdownRemaining > 0
                  ? `Answer received. Next question in ${countdownRemaining}s…`
                  : micOn
                    ? 'Listening…'
                    : 'Your answer will be captured automatically when you speak.'}
              {countdownRemaining > 0 && cameraUserIdle && (
                <span className="mt-1 block text-xs text-[var(--accent)]">You’re ready. Next question in {countdownRemaining}s.</span>
              )}
            </div>
            {error && (
              <p className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">{error}</p>
            )}
          </div>
        )}
          </>
        )}

        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-2 shadow-lg backdrop-blur">
          <button
            onClick={handleMicToggle}
            disabled={loading || codingTurnActive}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition ${
              micOn ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]' : 'bg-[var(--surface-light-muted)] hover:opacity-90'
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
              setCodePanelRequested(true);
              setActiveTab('code');
            }}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition ${
              activeTab === 'code' ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]' : 'bg-[var(--surface-light-muted)] hover:opacity-90'
            } disabled:opacity-50`}
            title="Open code editor & terminal"
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

        <AudioRecorder
          ref={audioRecorderRef}
          onTranscript={handleVoiceTranscript}
          silenceMs={2800}
          minRecordMs={1500}
          minSpeechMs={1800}
          maxRecordMs={120000}
          stopDelayMs={400}
          onNoSpeech={() => {
            if (!autoListeningRef.current || !voiceEnabled || loading) return;
            if (noSpeechRetryRef.current >= 2) {
              autoListeningRef.current = false;
              setError('I could not hear your answer clearly. Please speak a little louder or unmute your mic.');
              return;
            }
            noSpeechRetryRef.current += 1;
            setError('');
            setTimeout(() => {
              if (!autoListeningRef.current || loading || !voiceEnabled) return;
              startAutoListeningWindow();
            }, 220);
          }}
          disabled={loading}
          autoStart={false}
          onListeningChange={setMicOn}
          hideButton
        />
      </div>
    </div>
  );
}
