'use client';

import { useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

export interface AudioRecorderHandle {
  toggle: () => void;
  start: () => void;
  stop: () => void;
  /** Stop mic without sending audio for transcription (manual mute). */
  cancel: () => void;
  warmUp: () => Promise<boolean>;
  listening: boolean;
}

interface AudioRecorderProps {
  onTranscript: (text: string) => void;
  onNoSpeech?: () => void;
  disabled?: boolean;
  autoStart?: boolean;
  onListeningChange?: (listening: boolean) => void;
  hideButton?: boolean;
  silenceMs?: number;
  minRecordMs?: number;
  minSpeechMs?: number;
  maxRecordMs?: number;
  stopDelayMs?: number;
}

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
  const { start: startVoice, stop: stopVoice, cancel: cancelVoice, warmUp, isRecording, status, error } =
    useVoiceRecorder({
      maxRecordMs: maxRecordMsProp ?? 120000,
      autoStopOnSilence: true,
      silenceMs: silenceMsProp ?? 2200,
      stopDelayMs: stopDelayMsProp ?? 180,
      minRecordMs: minRecordMsProp ?? 600,
      minSpeechMs: minSpeechMsProp ?? 400,
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
      stopVoice();
    } else {
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

  const cancel = useCallback(() => {
    cancelVoice();
  }, [cancelVoice]);

  useEffect(() => {
    if (autoStart && !disabled && !isRecording) {
      void startVoice();
    }
  }, [autoStart, disabled, isRecording, startVoice]);

  useEffect(() => {
    onListeningChange?.(isRecording);
  }, [isRecording, onListeningChange]);

  useImperativeHandle(
    ref,
    () => ({ toggle, start, stop, cancel, warmUp, listening: isRecording }),
    [toggle, start, stop, cancel, warmUp, isRecording]
  );

  if (hideButton) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50"
    >
      <span className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
      {isRecording ? 'Mic on' : 'Mic off'}
      {status === 'processing' && <span className="text-xs text-slate-500">(processing)</span>}
      {error && <span className="text-xs text-rose-400">(error)</span>}
    </button>
  );
});
