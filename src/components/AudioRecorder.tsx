'use client';

import { useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

export interface AudioRecorderHandle {
  toggle: () => void;
  start: () => Promise<boolean>;
  stop: () => void;
  /** Stop mic without sending audio for transcription (manual mute). */
  cancel: () => void;
  warmUp: () => Promise<boolean>;
  listening: boolean;
  /** Recording or uploading/transcribing — block duplicate mic starts. */
  busy: boolean;
  processing: boolean;
}

interface AudioRecorderProps {
  onTranscript: (text: string) => void;
  onNoSpeech?: () => void;
  onProcessing?: () => void;
  onTranscriptionError?: (message: string) => void;
  disabled?: boolean;
  autoStart?: boolean;
  onListeningChange?: (listening: boolean) => void;
  hideButton?: boolean;
  silenceMs?: number;
  minRecordMs?: number;
  minSpeechMs?: number;
  minTranscribeMs?: number;
  minSpeechMsForTranscribe?: number;
  disableAdaptiveVad?: boolean;
  /** When false, recording stops only when user clicks stop (push-to-talk). */
  autoStopOnSilence?: boolean;
  maxRecordMs?: number;
  stopDelayMs?: number;
  /** ISO 639-1 language for STT (ur, ar, en). */
  transcribeLanguage?: string;
  /** Allow mixed-language answers (e.g. Arabic + English). */
  transcribeMixed?: boolean;
}

function isNoSpeechError(message: string): boolean {
  return /no audio detected|empty recording|empty transcript|recording too short|no speech detected/i.test(message);
}

export const AudioRecorder = forwardRef<AudioRecorderHandle, AudioRecorderProps>(function AudioRecorder(
  {
    onTranscript,
    onNoSpeech,
    onProcessing,
    onTranscriptionError,
    disabled,
    autoStart = false,
    onListeningChange,
    hideButton = false,
    silenceMs: silenceMsProp,
    minRecordMs: minRecordMsProp,
    minSpeechMs: minSpeechMsProp,
    minTranscribeMs: minTranscribeMsProp,
    minSpeechMsForTranscribe: minSpeechMsForTranscribeProp,
    disableAdaptiveVad: disableAdaptiveVadProp,
    autoStopOnSilence: autoStopOnSilenceProp,
    maxRecordMs: maxRecordMsProp,
    stopDelayMs: stopDelayMsProp,
    transcribeLanguage,
    transcribeMixed,
  },
  ref
) {
  const {
    start: startVoice,
    stop: stopVoice,
    cancel: cancelVoice,
    warmUp,
    isRecording,
    isProcessing,
    isBusy,
    status,
    error,
  } = useVoiceRecorder({
    maxRecordMs: maxRecordMsProp ?? 120000,
    autoStopOnSilence: autoStopOnSilenceProp ?? true,
    silenceMs: silenceMsProp ?? 2200,
    stopDelayMs: stopDelayMsProp ?? 180,
    minRecordMs: minRecordMsProp ?? 600,
    minSpeechMs: minSpeechMsProp ?? 400,
    minTranscribeMs: minTranscribeMsProp ?? 1200,
    minSpeechMsForTranscribe: minSpeechMsForTranscribeProp ?? 2000,
    disableAdaptiveVad: disableAdaptiveVadProp ?? false,
    transcribeLanguage,
    transcribeMixed,
    onTranscript: (text) => {
      onTranscript(text);
    },
    onProcessing: () => {
      onProcessing?.();
    },
    onError: (message, details) => {
      if (isNoSpeechError(message)) {
        onNoSpeech?.();
        return;
      }
      console.error('[AudioRecorder] Voice pipeline error:', message, details);
      if (/permission/i.test(message)) {
        alert('Could not access microphone. Please check your browser permissions.');
      }
      if (!isNoSpeechError(message)) {
        onTranscriptionError?.(message);
      }
    },
  });

  const toggle = useCallback(() => {
    if (disabled) return;
    if (isRecording) {
      stopVoice();
    } else if (!isBusy) {
      void startVoice();
    }
  }, [disabled, isBusy, isRecording, startVoice, stopVoice]);

  const start = useCallback(async (): Promise<boolean> => {
    if (disabled || isBusy) return isRecording;
    return startVoice();
  }, [disabled, isBusy, isRecording, startVoice]);

  const stop = useCallback(() => {
    if (!isRecording) return;
    stopVoice();
  }, [isRecording, stopVoice]);

  const cancel = useCallback(() => {
    cancelVoice();
  }, [cancelVoice]);

  useEffect(() => {
    if (autoStart && !disabled && !isBusy) {
      void startVoice();
    }
  }, [autoStart, disabled, isBusy, startVoice]);

  useEffect(() => {
    onListeningChange?.(isRecording);
  }, [isRecording, onListeningChange]);

  useImperativeHandle(
    ref,
    () => ({
      toggle,
      start,
      stop,
      cancel,
      warmUp,
      listening: isRecording,
      busy: isBusy,
      processing: isProcessing,
    }),
    [toggle, start, stop, cancel, warmUp, isRecording, isBusy, isProcessing]
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
      {isRecording ? 'Mic on' : isProcessing ? 'Transcribing…' : 'Mic off'}
      {error && !isNoSpeechError(error) && <span className="text-xs text-rose-400">(error)</span>}
    </button>
  );
});
