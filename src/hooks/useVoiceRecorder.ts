'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { transcribeAudio } from '@/lib/transcribeApi';
import { encodeBlobTo16kMonoWav } from '@/lib/audioEncode';

type RecorderStatus = 'idle' | 'recording' | 'processing' | 'error';

export interface UseVoiceRecorderOptions {
  /** Stop automatically after sustained silence. */
  autoStopOnSilence?: boolean;
  /** Silence duration required to auto-stop. Use 5000+ so user can finish speaking. */
  silenceMs?: number;
  /** Small delay before stopping to avoid cutting off trailing phonemes. */
  stopDelayMs?: number;
  /** Minimum time to record before silence can trigger stop. */
  minRecordMs?: number;
  /** Only allow silence to stop after at least this much speech (ms). Prevents stopping on initial pause. */
  minSpeechMs?: number;
  /** Minimum clip length before sending to STT (blocks brief noise clips). */
  minTranscribeMs?: number;
  /** Minimum detected speech before sending to STT (blocks VAD false positives). */
  minSpeechMsForTranscribe?: number;
  /** Do not lower VAD sensitivity after long silence (interview rooms). */
  disableAdaptiveVad?: boolean;
  /** Hard stop after this duration (safety). */
  maxRecordMs?: number;
  /** Auto-stop if no VAD speech detected within this time after recording starts. */
  noSpeechIdleMs?: number;
  /** Called when recording stops due to noSpeechIdleMs with no speech detected. */
  onIdleTimeout?: () => void;
  onTranscript?: (text: string) => void;
  /** Called for any fatal error (permission, conversion, backend). */
  onError?: (message: string, details?: unknown) => void;
  /** Called when recording stops and upload/transcription begins. */
  onProcessing?: (info: { hadSpeech: boolean; speechMs: number }) => void;
  /** Interview language for STT (ISO 639-1: ur, ar, en). */
  transcribeLanguage?: string;
  /** Allow Arabic+English / Urdu+English code-switching on the server. */
  transcribeMixed?: boolean;
}

export interface UseVoiceRecorderReturn {
  status: RecorderStatus;
  isRecording: boolean;
  isProcessing: boolean;
  isBusy: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  /** Acquire mic permission and keep a warm stream for faster later starts. */
  warmUp: () => Promise<boolean>;
  start: () => Promise<boolean>;
  /** Stop and transcribe the current clip. */
  stop: () => void;
  /** Stop recording without transcribing (manual mute). */
  cancel: () => void;
}

function pickBestRecorderMimeType(): string | undefined {
  // Prefer webm/opus; backend ffmpeg normalizes any supported container.
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn {
  const {
    autoStopOnSilence = true,
    silenceMs = 1300,
    stopDelayMs = 250,
    minRecordMs = 900,
    minSpeechMs = 0,
    minTranscribeMs = 1200,
    minSpeechMsForTranscribe = 2000,
    disableAdaptiveVad = false,
    maxRecordMs = 15000,
    noSpeechIdleMs,
    onTranscript,
    onError,
    onProcessing,
    onIdleTimeout,
    transcribeLanguage,
    transcribeMixed,
  } = options;

  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const warmStreamRef = useRef<MediaStream | null>(null);
  const skipTranscribeRef = useRef(false);
  const chunksRef = useRef<BlobPart[]>([]);
  const vadAudioCtxRef = useRef<AudioContext | null>(null);

  const startedAtRef = useRef<number>(0);
  const vadIntervalRef = useRef<number | null>(null);
  const silenceSinceRef = useRef<number | null>(null);
  const maxStopTimeoutRef = useRef<number | null>(null);
  const pendingStopTimeoutRef = useRef<number | null>(null);
  const speechSeenRef = useRef<boolean>(false);
  const speechTotalMsRef = useRef<number>(0);
  const noiseFloorRef = useRef<number>(0.008);
  const calibrateUntilRef = useRef<number>(0);
  const noSpeechWatchdogRef = useRef<number | null>(null);
  const idleNoSpeechTimeoutRef = useRef<number | null>(null);
  const VAD_INTERVAL_MS = 160;

  const clearVad = useCallback(() => {
    if (vadIntervalRef.current) {
      window.clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    silenceSinceRef.current = null;
    speechSeenRef.current = false;
    speechTotalMsRef.current = 0;
    noiseFloorRef.current = 0.008;
    calibrateUntilRef.current = 0;
    if (pendingStopTimeoutRef.current) {
      window.clearTimeout(pendingStopTimeoutRef.current);
      pendingStopTimeoutRef.current = null;
    }
    if (noSpeechWatchdogRef.current) {
      window.clearTimeout(noSpeechWatchdogRef.current);
      noSpeechWatchdogRef.current = null;
    }
    if (idleNoSpeechTimeoutRef.current) {
      window.clearTimeout(idleNoSpeechTimeoutRef.current);
      idleNoSpeechTimeoutRef.current = null;
    }
  }, []);

  const clearMaxStop = useCallback(() => {
    if (maxStopTimeoutRef.current) {
      window.clearTimeout(maxStopTimeoutRef.current);
      maxStopTimeoutRef.current = null;
    }
  }, []);

  const audioConstraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
  };

  const releaseWarmStream = useCallback(() => {
    warmStreamRef.current?.getTracks().forEach((t) => t.stop());
    warmStreamRef.current = null;
  }, []);

  const cleanupRecorderOnly = useCallback(() => {
    clearVad();
    clearMaxStop();
    const vadCtx = vadAudioCtxRef.current;
    vadAudioCtxRef.current = null;
    if (vadCtx) {
      try {
        void vadCtx.close().catch(() => {});
      } catch {
        // ignore
      }
    }
    recorderRef.current = null;
    streamRef.current = null;
  }, [clearMaxStop, clearVad]);

  const cleanupStream = useCallback(() => {
    cleanupRecorderOnly();
    releaseWarmStream();
  }, [cleanupRecorderOnly, releaseWarmStream]);

  const acquireStream = useCallback(async (): Promise<MediaStream> => {
    if (warmStreamRef.current?.active) {
      streamRef.current = warmStreamRef.current;
      return warmStreamRef.current;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    warmStreamRef.current = stream;
    streamRef.current = stream;
    return stream;
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      await acquireStream();
      return true;
    } catch (e) {
      const msg = 'Microphone permission denied or unavailable';
      setStatus('error');
      setError(msg);
      onError?.(msg, e);
      return false;
    }
  }, [acquireStream, onError]);

  const warmUp = useCallback(async (): Promise<boolean> => {
    try {
      await acquireStream();
      setStatus('idle');
      setError(null);
      return true;
    } catch (e) {
      return false;
    }
  }, [acquireStream]);

  const stop = useCallback(() => {
    skipTranscribeRef.current = false;
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.state !== 'inactive') {
      try {
        rec.requestData();
      } catch {
        // ignore
      }
      rec.stop();
    }
  }, []);

  const cancel = useCallback(() => {
    skipTranscribeRef.current = true;
    const rec = recorderRef.current;
    if (!rec || rec.state === 'inactive') {
      skipTranscribeRef.current = false;
      setStatus('idle');
      return;
    }
    try {
      rec.requestData();
    } catch {
      // ignore
    }
    rec.stop();
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (recorderRef.current?.state === 'recording' || recorderRef.current?.state === 'paused') {
      console.log('[useVoiceRecorder] Already recording — skip duplicate start');
      return true;
    }
    if (processingRef.current) {
      console.log('[useVoiceRecorder] Still processing previous clip — skip start');
      return false;
    }

    setError(null);
    setStatus('idle');

    console.log('[useVoiceRecorder] Recording start requested');

    let stream: MediaStream;
    try {
      stream = await acquireStream();
    } catch (e) {
      const msg = 'Microphone permission denied or unavailable';
      setStatus('error');
      setError(msg);
      onError?.(msg, e);
      return false;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    startedAtRef.current = Date.now();
    silenceSinceRef.current = null;
    speechSeenRef.current = false;
    noiseFloorRef.current = 0.008;
    calibrateUntilRef.current = Date.now() + 1000;

    const mimeType = pickBestRecorderMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onerror = (e) => {
      const msg = 'Recording failed';
      console.error('[useVoiceRecorder] MediaRecorder error', e);
      setStatus('error');
      setError(msg);
      onError?.(msg, e);
      cleanupStream();
    };

    recorder.onstart = () => {
      setStatus('recording');
      console.log('[useVoiceRecorder] Recording started', { mimeType: recorder.mimeType });
      noSpeechWatchdogRef.current = window.setTimeout(() => {
        if (!speechSeenRef.current && recorderRef.current?.state === 'recording') {
          console.warn('[useVoiceRecorder] No speech detected yet — lowering VAD sensitivity');
          noiseFloorRef.current = Math.max(0.0015, noiseFloorRef.current * 0.55);
        }
      }, disableAdaptiveVad ? 15000 : 8000);

      if (noSpeechIdleMs && noSpeechIdleMs > 0) {
        idleNoSpeechTimeoutRef.current = window.setTimeout(() => {
          idleNoSpeechTimeoutRef.current = null;
          if (!speechSeenRef.current && recorderRef.current?.state === 'recording') {
            console.log('[useVoiceRecorder] No-speech idle timeout — stopping clip', {
              idleMs: noSpeechIdleMs,
            });
            onIdleTimeout?.();
            stop();
          }
        }, noSpeechIdleMs);
      }
    };

    recorder.onstop = async () => {
      clearVad();
      clearMaxStop();

      if (skipTranscribeRef.current) {
        skipTranscribeRef.current = false;
        chunksRef.current = [];
        processingRef.current = false;
        setStatus('idle');
        cleanupRecorderOnly();
        return;
      }

      processingRef.current = true;
      setStatus('processing');
      const hadSpeech = speechSeenRef.current && speechTotalMsRef.current >= minSpeechMsForTranscribe;
      onProcessing?.({ hadSpeech, speechMs: speechTotalMsRef.current });
      console.log('[useVoiceRecorder] Recording stopped, processing audio', { hadSpeech, speechMs: speechTotalMsRef.current });

      const rawBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      console.log('[useVoiceRecorder] Raw blob size:', rawBlob.size);

      const recordedMs = Date.now() - startedAtRef.current;
      const speechMs = speechTotalMsRef.current;

      // Auto-interview mode: never transcribe without real VAD speech (blocks TTS speaker echo).
      if (autoStopOnSilence) {
        if (!speechSeenRef.current || speechMs < minSpeechMsForTranscribe) {
          const msg = 'No audio detected (no speech)';
          processingRef.current = false;
          setStatus('error');
          setError(msg);
          onError?.(msg);
          cleanupRecorderOnly();
          return;
        }
      } else {
        const substantialClip = rawBlob.size >= 48000 || recordedMs >= 2000;
        if ((!speechSeenRef.current || speechMs < minSpeechMsForTranscribe) && !substantialClip) {
          const msg = 'No audio detected (no speech)';
          processingRef.current = false;
          setStatus('error');
          setError(msg);
          onError?.(msg);
          cleanupRecorderOnly();
          return;
        }
      }

      if (recordedMs < minTranscribeMs && speechMs < minSpeechMsForTranscribe) {
        const msg = 'No audio detected (recording too short)';
        processingRef.current = false;
        setStatus('error');
        setError(msg);
        onError?.(msg);
        cleanupRecorderOnly();
        return;
      }

      if (!rawBlob.size) {
        const msg = 'No audio detected (empty recording)';
        processingRef.current = false;
        setStatus('error');
        setError(msg);
        onError?.(msg);
        cleanupRecorderOnly();
        return;
      }

      try {
        let uploadBlob: Blob = rawBlob;
        let uploadName = 'recording.webm';
        try {
          uploadBlob = await encodeBlobTo16kMonoWav(rawBlob);
          uploadName = 'recording.wav';
          console.log('[useVoiceRecorder] Encoded WAV size:', uploadBlob.size);
        } catch (encodeErr) {
          console.warn('[useVoiceRecorder] WAV encode failed, sending original', encodeErr);
          uploadName =
            recorder.mimeType?.includes('ogg') ? 'recording.ogg'
            : recorder.mimeType?.includes('mp4') ? 'recording.mp4'
            : recorder.mimeType?.includes('wav') ? 'recording.wav'
            : 'recording.webm';
        }

        const { transcript } = await transcribeAudio(uploadBlob, uploadName, {
          language: transcribeLanguage,
          mixed: transcribeMixed,
        });
        const text = (transcript || '').trim();
        console.log('[useVoiceRecorder] Transcript:', text);

        if (!text) {
          const msg = 'Empty transcript returned';
          processingRef.current = false;
          setStatus('error');
          setError(msg);
          onError?.(msg);
          cleanupRecorderOnly();
          return;
        }

        processingRef.current = false;
        setStatus('idle');
        onTranscript?.(text);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Transcription failed';
        console.error('[useVoiceRecorder] Transcription pipeline error', e);
        processingRef.current = false;
        setStatus('error');
        setError(msg);
        onError?.(msg, e);
      } finally {
        cleanupRecorderOnly();
      }
    };

    if (autoStopOnSilence) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        vadAudioCtxRef.current = audioCtx;
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume().catch(() => undefined);
        }
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);

        vadIntervalRef.current = window.setInterval(() => {
          analyser.getByteTimeDomainData(data);
          // Compute normalized RMS roughly around 128 midpoint.
          let sum = 0;
          let peak = 0;
          for (let i = 0; i < data.length; i += 1) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
            const av = Math.abs(v);
            if (av > peak) peak = av;
          }
          const rms = Math.sqrt(sum / data.length);

          const now = Date.now();
          const recordedMs = now - startedAtRef.current;
          const calibrating = now < calibrateUntilRef.current;
          if (calibrating) {
            // Exponential moving average for a stable baseline noise floor.
            const next = Math.max(0.0015, Math.min(0.05, rms));
            noiseFloorRef.current = noiseFloorRef.current * 0.85 + next * 0.15;
            return;
          }

          // Dynamic threshold: scale from noise floor, with sane bounds.
          const floor = Math.max(0.002, Math.min(0.05, noiseFloorRef.current));
          const thresholdRms = Math.max(0.0028, floor * 1.75 + 0.0008);
          const thresholdPeak = Math.max(0.018, thresholdRms * 2.6);
          const isSpeech = rms > thresholdRms || peak > thresholdPeak;
          // Count as silence when quiet so recording stops soon after user finishes speaking
          const isSilent = rms < thresholdRms * 0.7 && peak < thresholdPeak * 0.7;

          if (recordedMs < minRecordMs) return;

          if (isSpeech) {
            speechSeenRef.current = true;
            speechTotalMsRef.current += VAD_INTERVAL_MS;
            silenceSinceRef.current = null;
            if (idleNoSpeechTimeoutRef.current) {
              window.clearTimeout(idleNoSpeechTimeoutRef.current);
              idleNoSpeechTimeoutRef.current = null;
            }
            if (pendingStopTimeoutRef.current) {
              window.clearTimeout(pendingStopTimeoutRef.current);
              pendingStopTimeoutRef.current = null;
            }
            return;
          }

          // Only end on silence after we've actually observed speech and (optionally) enough speech time.
          if (!speechSeenRef.current) return;
          if (minSpeechMs > 0 && speechTotalMsRef.current < minSpeechMs) return;

          if (isSilent) {
            if (silenceSinceRef.current == null) silenceSinceRef.current = now;
            const silentFor = now - silenceSinceRef.current;
            if (silentFor >= silenceMs && recorderRef.current?.state === 'recording') {
              if (!pendingStopTimeoutRef.current) {
                console.log('[useVoiceRecorder] Auto-stopping on silence', {
                  silentFor,
                  rms,
                  peak,
                  thresholdRms,
                  thresholdPeak,
                });
                pendingStopTimeoutRef.current = window.setTimeout(() => {
                  pendingStopTimeoutRef.current = null;
                  if (recorderRef.current?.state === 'recording') stop();
                }, stopDelayMs);
              }
            }
          } else {
            silenceSinceRef.current = null;
            if (pendingStopTimeoutRef.current) {
              window.clearTimeout(pendingStopTimeoutRef.current);
              pendingStopTimeoutRef.current = null;
            }
          }
        }, VAD_INTERVAL_MS);
      } catch (e) {
        console.warn('[useVoiceRecorder] VAD setup failed; continuing without silence auto-stop', e);
      }
    }

    // Safety max duration stop — only transcribe if real speech was captured.
    maxStopTimeoutRef.current = window.setTimeout(() => {
      if (recorderRef.current?.state === 'recording') {
        if (!speechSeenRef.current) {
          console.log('[useVoiceRecorder] Max duration with no speech — cancel without transcribe');
          skipTranscribeRef.current = true;
        } else {
          console.log('[useVoiceRecorder] Auto-stopping on max duration');
        }
        stop();
      }
    }, maxRecordMs);

    recorder.start(250);
    return true;
  }, [
    autoStopOnSilence,
    acquireStream,
    cancel,
    cleanupRecorderOnly,
    clearMaxStop,
    clearVad,
    maxRecordMs,
    minRecordMs,
    minSpeechMs,
    minTranscribeMs,
    minSpeechMsForTranscribe,
    disableAdaptiveVad,
    noSpeechIdleMs,
    onIdleTimeout,
    onError,
    onProcessing,
    onTranscript,
    silenceMs,
    stopDelayMs,
    stop,
  ]);

  useEffect(() => {
    return () => {
      skipTranscribeRef.current = true;
      try {
        stop();
      } catch {
        // ignore
      }
      cleanupStream();
    };
  }, [cleanupStream, stop]);

  const isRecording = status === 'recording';
  const isProcessing = status === 'processing';

  return {
    status,
    isRecording,
    isProcessing,
    isBusy: isRecording || isProcessing,
    error,
    requestPermission,
    warmUp,
    start,
    stop,
    cancel,
  };
}

