'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { transcribeAudio } from '@/lib/transcribeApi';

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
  /** Hard stop after this duration (safety). */
  maxRecordMs?: number;
  /** Called when transcript is returned. */
  onTranscript?: (text: string) => void;
  /** Called for any fatal error (permission, conversion, backend). */
  onError?: (message: string, details?: unknown) => void;
}

export interface UseVoiceRecorderReturn {
  status: RecorderStatus;
  isRecording: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  start: () => Promise<void>;
  stop: () => void;
}

function pickBestRecorderMimeType(): string | undefined {
  // We will convert to WAV ourselves; this is just the container we record in.
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

async function encodeWavAsync(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  try {
    const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

    const targetRate = 16000;
    const length = Math.ceil(decoded.duration * targetRate);
    const offline = new OfflineAudioContext(1, length, targetRate);

    const source = offline.createBufferSource();
    source.buffer = decoded;

    // Mixdown to mono (average)
    const splitter = offline.createChannelSplitter(decoded.numberOfChannels);
    const gain = offline.createGain();
    gain.gain.value = decoded.numberOfChannels > 0 ? 1 / decoded.numberOfChannels : 1;
    const merger = offline.createChannelMerger(1);

    source.connect(splitter);
    for (let ch = 0; ch < decoded.numberOfChannels; ch += 1) {
      splitter.connect(gain, ch);
    }
    gain.connect(merger, 0, 0);
    merger.connect(offline.destination);

    source.start(0);
    const rendered = await offline.startRendering();

    const pcm = rendered.getChannelData(0);
    const wavBuffer = pcmToWavBuffer(pcm, rendered.sampleRate);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  } finally {
    try {
      await audioCtx.close().catch(() => {});
    } catch {
      // ignore
    }
  }
}

function pcmToWavBuffer(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample * 1;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');

  // fmt
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample

  // data
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // PCM samples (16-bit little endian)
  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn {
  const {
    autoStopOnSilence = true,
    silenceMs = 1300,
    stopDelayMs = 250,
    minRecordMs = 900,
    minSpeechMs = 0,
    maxRecordMs = 15000,
    onTranscript,
    onError,
  } = options;

  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
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
  }, []);

  const clearMaxStop = useCallback(() => {
    if (maxStopTimeoutRef.current) {
      window.clearTimeout(maxStopTimeoutRef.current);
      maxStopTimeoutRef.current = null;
    }
  }, []);

  const cleanupStream = useCallback(() => {
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
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;
    recorderRef.current = null;
  }, [clearMaxStop, clearVad]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch (e) {
      const msg = 'Microphone permission denied or unavailable';
      setStatus('error');
      setError(msg);
      onError?.(msg, e);
      return false;
    }
  }, [onError]);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.state !== 'inactive') {
      try {
        // Flush last chunk before stop.
        rec.requestData();
      } catch {
        // ignore
      }
      rec.stop();
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStatus('idle');

    console.log('[useVoiceRecorder] Recording start requested');

    let stream: MediaStream;
    try {
      // Explicit permission request + capture with best browser defaults.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
    } catch (e) {
      const msg = 'Microphone permission denied or unavailable';
      setStatus('error');
      setError(msg);
      onError?.(msg, e);
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    startedAtRef.current = Date.now();
    silenceSinceRef.current = null;
    speechSeenRef.current = false;
    noiseFloorRef.current = 0.008;
    calibrateUntilRef.current = Date.now() + 500;

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
    };

    recorder.onstop = async () => {
      setStatus('processing');
      clearVad();
      clearMaxStop();
      console.log('[useVoiceRecorder] Recording stopped, processing audio');

      const rawBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      console.log('[useVoiceRecorder] Raw blob size:', rawBlob.size);

      if (!rawBlob.size) {
        const msg = 'No audio detected (empty recording)';
        setStatus('error');
        setError(msg);
        onError?.(msg);
        cleanupStream();
        return;
      }

      try {
        const wavBlob = await encodeWavAsync(rawBlob);
        console.log('[useVoiceRecorder] WAV blob size:', wavBlob.size);

        if (!wavBlob.size) {
          const msg = 'No audio detected (WAV conversion produced empty file)';
          setStatus('error');
          setError(msg);
          onError?.(msg);
          cleanupStream();
          return;
        }

        const { transcript } = await transcribeAudio(wavBlob);
        const text = (transcript || '').trim();
        console.log('[useVoiceRecorder] Transcript:', text);

        if (!text) {
          const msg = 'Empty transcript returned';
          setStatus('error');
          setError(msg);
          onError?.(msg);
          cleanupStream();
          return;
        }

        setStatus('idle');
        onTranscript?.(text);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Transcription failed';
        console.error('[useVoiceRecorder] Transcription pipeline error', e);
        setStatus('error');
        setError(msg);
        onError?.(msg, e);
      } finally {
        cleanupStream();
      }
    };

    if (autoStopOnSilence) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        vadAudioCtxRef.current = audioCtx;
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
          const floor = Math.max(0.0035, Math.min(0.05, noiseFloorRef.current));
          const thresholdRms = Math.max(0.0045, floor * 3.0 + 0.0015);
          const thresholdPeak = Math.max(0.03, thresholdRms * 3.5);
          const isSpeech = rms > thresholdRms * 1.15 || peak > thresholdPeak;
          // Count as silence when quiet so recording stops soon after user finishes speaking
          const isSilent = rms < thresholdRms * 0.7 && peak < thresholdPeak * 0.7;

          if (recordedMs < minRecordMs) return;

          if (isSpeech) {
            speechSeenRef.current = true;
            speechTotalMsRef.current += VAD_INTERVAL_MS;
            silenceSinceRef.current = null;
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

    // Safety max duration stop.
    maxStopTimeoutRef.current = window.setTimeout(() => {
      if (recorderRef.current?.state === 'recording') {
        console.log('[useVoiceRecorder] Auto-stopping on max duration');
        stop();
      }
    }, maxRecordMs);

    recorder.start(250);
  }, [
    autoStopOnSilence,
    cleanupStream,
    clearMaxStop,
    clearVad,
    maxRecordMs,
    minRecordMs,
    minSpeechMs,
    onError,
    onTranscript,
    silenceMs,
    stopDelayMs,
    stop,
  ]);

  useEffect(() => {
    return () => {
      try {
        stop();
      } catch {
        // ignore
      }
      cleanupStream();
    };
  }, [cleanupStream, stop]);

  return {
    status,
    isRecording: status === 'recording',
    error,
    requestPermission,
    start,
    stop,
  };
}

