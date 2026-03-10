'use client';

import { useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

export interface AudioRecorderHandle {
  toggle: () => void;
  start: () => void;
  stop: () => void;
  listening: boolean;
}

interface AudioRecorderProps {
  onTranscript: (text: string) => void;
  onNoSpeech?: () => void;
  disabled?: boolean;
  autoStart?: boolean;
  onListeningChange?: (listening: boolean) => void;
  hideButton?: boolean;
  /** Silence duration (ms) before auto-stop. Longer = wait for user to finish speaking. Default 1300. */
  silenceMs?: number;
  /** Min record time (ms) before silence can trigger stop. Default 900. */
  minRecordMs?: number;
  /** Only allow silence to stop after at least this much speech (ms). Default 0. */
  minSpeechMs?: number;
  /** Max record duration (ms). Default 20000. */
  maxRecordMs?: number;
  /** Delay (ms) after silence before stopping, to capture trailing words. Default 250. */
  stopDelayMs?: number;
}

/**
 * Voice input: records mic audio, converts to 16k mono WAV, and sends to backend
 * via POST /api/transcribe (whisper.cpp).
 */
export const AudioRecorder = forwardRef<AudioRecorderHandle, AudioRecorderProps>(function AudioRecorder(
  {
    onTranscript,
    onNoSpeech,
    disabled,
    autoStart = false,
    onListeningChange,
    hideButton = false,
    silenceMs: silenceMsProp,
    minRecordMs: minRecordMsProp,
    minSpeechMs: minSpeechMsProp,
    maxRecordMs: maxRecordMsProp,
    stopDelayMs: stopDelayMsProp,
  },
  ref
) {
  const { start: startVoice, stop: stopVoice, isRecording, status, error } = useVoiceRecorder({
    maxRecordMs: maxRecordMsProp ?? 20000,
    autoStopOnSilence: true,
    silenceMs: silenceMsProp ?? 1300,
    stopDelayMs: stopDelayMsProp ?? 250,
    minRecordMs: minRecordMsProp ?? 900,
    minSpeechMs: minSpeechMsProp ?? 0,
    onTranscript: (text) => {
      onTranscript(text);
    },
    onError: (message, details) => {
      console.error('[AudioRecorder] Voice pipeline error:', message, details);
      if (/permission/i.test(message)) {
        alert('Could not access microphone. Please check your browser permissions.');
      }
      onNoSpeech?.();
    },
  });

  const toggle = useCallback(() => {
    if (disabled) return;
    if (isRecording) {
      console.log('[AudioRecorder] User toggled mute');
      stopVoice();
    } else {
      console.log('[AudioRecorder] User toggled unmute');
      void startVoice();
    }
  }, [disabled, isRecording, startVoice, stopVoice]);

  const start = useCallback(() => {
    if (disabled || isRecording) return;
    void startVoice();
  }, [disabled, isRecording, startVoice]);

  const stop = useCallback(() => {
    if (!isRecording) return;
    stopVoice();
  }, [isRecording, stopVoice]);

  useEffect(() => {
    if (autoStart && !disabled && !isRecording) {
      void startVoice();
    }
  }, [autoStart, disabled, isRecording, startVoice]);

  useEffect(() => {
    onListeningChange?.(isRecording);
  }, [isRecording, onListeningChange]);

  useImperativeHandle(ref, () => ({ toggle, start, stop, listening: isRecording }), [toggle, start, stop, isRecording]);

  if (hideButton) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50"
    >
      <span
        className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-500'
          }`}
      />
      {isRecording ? 'Mic on' : 'Mic off'}
      {status === 'processing' && <span className="text-xs text-slate-500">(processing)</span>}
      {error && <span className="text-xs text-rose-400">(error)</span>}
    </button>
  );
});
