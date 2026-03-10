'use client';

import { useCallback, useRef, useState } from 'react';
import { pickPreferredInterviewerVoice, waitForSpeechVoices } from '@/lib/voicePreferences';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

const API_BASE = '/api/proxy';

function pickProfessionalVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  return pickPreferredInterviewerVoice(voices);
}

/**
 * Fully working voice-based AI interview loop:
 * Start → AI speaks question → user records → audio to backend → whisper transcribes →
 * transcript to LLM (Open Router when configured) → next question → AI speaks → loop.
 * Pass role to get questions tailored to the job role.
 */
interface VoiceLoopInterviewProps {
  /** Job/role title so the AI asks role-appropriate questions (e.g. "Software Engineer", "Sales Manager"). */
  role?: string;
}

export function VoiceLoopInterview({ role }: VoiceLoopInterviewProps) {
  const [question, setQuestion] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const getNextQuestionRef = useRef<(answer: string) => Promise<void>>(async () => {});
  const startRecordingRef = useRef<() => void>(() => {});

  const speakText = useCallback(async (text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      onEnd?.();
      return;
    }
    const voices = await waitForSpeechVoices();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = pickProfessionalVoice(voices);
    utterance.voice = selectedVoice;
    utterance.lang = selectedVoice?.lang || 'en-US';
    utterance.rate = 0.96;
    utterance.pitch = 1.03;
    utterance.volume = 1.0;
    setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      onEnd?.();
    };
    window.speechSynthesis.speak(utterance);
  }, []);

  const { start: startVoice, isRecording, requestPermission } = useVoiceRecorder({
    maxRecordMs: 20000,
    autoStopOnSilence: true,
    silenceMs: 1300,
    stopDelayMs: 250,
    minRecordMs: 900,
    onTranscript: (text) => {
      setTranscript((prev) => [...prev.filter((t) => t !== '(Listening…)'), text].filter(Boolean));
      void getNextQuestionRef.current(text);
    },
    onError: (message) => {
      setTranscript((prev) => prev.filter((t) => t !== '(Listening…)'));
      setError(message);
      void getNextQuestionRef.current('');
    },
  });

  const startRecording = useCallback(() => {
    setError(null);
    setTranscript((prev) => [...prev, '(Listening…)' as string]);
    void startVoice();
  }, [startVoice]);

  const getNextQuestion = useCallback(
    async (answer: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/voice-loop/next-question`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer, role: role || undefined }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error || 'Failed to get next question');
        }
        const data = (await res.json()) as { question?: string };
        const next = (data.question ?? '').trim() || 'Could you tell me more?';
        setQuestion(next);
        void speakText(next, () => startRecordingRef.current());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to get next question');
        setQuestion('Could you tell me more?');
        void speakText('Could you tell me more?', () => startRecordingRef.current());
      } finally {
        setIsLoading(false);
      }
    },
    [speakText, role]
  );

  getNextQuestionRef.current = getNextQuestion;
  startRecordingRef.current = startRecording;

  const startInterview = useCallback(async () => {
    setHasStarted(true);
    setError(null);
    setTranscript([]);
    setIsLoading(true);
    try {
      const permitted = await requestPermission();
      if (!permitted) {
        throw new Error('Microphone permission denied');
      }
      const res = await fetch(`${API_BASE}/voice-loop/start-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: role || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Failed to start');
      }
      const data = (await res.json()) as { question?: string };
      const first = (data.question ?? '').trim() || 'Tell me a bit about your background.';
      setQuestion(first);
      void speakText(first, () => startRecordingRef.current());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start interview');
    } finally {
      setIsLoading(false);
    }
  }, [speakText, startRecording, role]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Intervion — Voice Interview</h1>
        <p className="text-slate-400 text-sm mb-6">
          AI asks a question → you answer with your voice → next question. Loop continues.
        </p>

        {!hasStarted ? (
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={startInterview}
              disabled={isLoading}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-medium transition"
            >
              {isLoading ? 'Starting…' : 'Start interview'}
            </button>
          </div>
        ) : (
          <>
            {/* AI speaking indicator */}
            {isSpeaking && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
                <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-sm text-indigo-200">AI is speaking…</span>
              </div>
            )}

            {/* Current question */}
            {question && (
              <div className="mb-6 p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">Intervion AI</p>
                <p className="text-slate-100">{question}</p>
              </div>
            )}

            {/* Recording indicator */}
            {isRecording && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                <span className="inline-block w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span className="text-sm text-red-200">Recording (up to 10 seconds)…</span>
              </div>
            )}

            {/* Loading */}
            {isLoading && !isSpeaking && !isRecording && (
              <div className="flex items-center gap-2 mb-4 text-slate-400">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full" />
                <span className="text-sm">Processing…</span>
              </div>
            )}

            {/* Transcript */}
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Your answers</p>
              <div className="space-y-2 max-h-60 overflow-auto rounded-lg bg-slate-900/50 border border-slate-800 p-3">
                {transcript.length === 0 ? (
                  <p className="text-slate-500 text-sm">Your transcribed answers will appear here.</p>
                ) : (
                  transcript.map((line, i) => (
                    <p key={i} className="text-sm text-slate-300">
                      {line}
                    </p>
                  ))
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
