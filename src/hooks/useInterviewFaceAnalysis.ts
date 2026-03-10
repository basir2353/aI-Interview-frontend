'use client';

import {
  FaceLandmarker,
  FilesetResolver,
  GestureRecognizer,
  type FaceLandmarkerResult,
  type GestureRecognizerResult,
} from '@mediapipe/tasks-vision';
import { useCallback, useEffect, useRef, useState } from 'react';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm';
const FACE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const GESTURE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

/** MediaPipe face mesh lip indices (upper/lower lip, mouth corners) */
const MOUTH_UPPER_LIP = 13;
const MOUTH_LOWER_LIP = 14;
const MOUTH_LEFT = 61;
const MOUTH_RIGHT = 291;

export type EmotionLabel = 'neutral' | 'smiling' | 'concentrating' | 'surprised' | 'speaking' | 'thinking';

export interface FaceAnalysisState {
  faceDetected: boolean;
  /** 0–1, from landmarks or blendshape */
  lipOpenness: number;
  /** Derived from blendshapes or landmarks */
  emotion: EmotionLabel;
  /** Open_Palm or similar = wave / hello */
  waveDetected: boolean;
  /** Raw gesture name if any */
  gestureName: string | null;
  /** Blendshape scores for debugging */
  blendshapeScores: Record<string, number>;
}

const DEFAULT_STATE: FaceAnalysisState = {
  faceDetected: false,
  lipOpenness: 0,
  emotion: 'neutral',
  waveDetected: false,
  gestureName: null,
  blendshapeScores: {},
};

function distance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function emotionFromBlendshapes(scores: Record<string, number>): EmotionLabel {
  const smile = scores['mouthSmile'] ?? 0;
  const mouthOpen = scores['mouthOpen'] ?? 0;
  const browInnerUp = scores['browInnerUp'] ?? 0;
  const eyeWide = scores['eyeWide'] ?? 0;
  const browDown = scores['browDown_L'] ?? 0;

  if (mouthOpen > 0.25) return 'speaking';
  if (smile > 0.4) return 'smiling';
  if (browInnerUp > 0.3 && eyeWide > 0.2) return 'surprised';
  if (browDown > 0.2) return 'concentrating';
  if (browInnerUp > 0.15) return 'thinking';
  return 'neutral';
}

export interface UseInterviewFaceAnalysisOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  /** Called when a wave (hello) is detected */
  onWaveDetected?: () => void;
  /** Analysis interval ms */
  intervalMs?: number;
}

export function useInterviewFaceAnalysis({
  videoRef,
  enabled,
  onWaveDetected,
  intervalMs = 120,
}: UseInterviewFaceAnalysisOptions) {
  const [state, setState] = useState<FaceAnalysisState>(DEFAULT_STATE);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const loadedRef = useRef(false);
  const lastWaveAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const onWaveDetectedStable = useRef(onWaveDetected);
  onWaveDetectedStable.current = onWaveDetected;

  // Load models once
  useEffect(() => {
    if (!enabled || loadedRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
        if (cancelled) return;

        const [face, gesture] = await Promise.all([
          FaceLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: FACE_MODEL },
            runningMode: 'VIDEO',
            numFaces: 1,
            outputFaceBlendshapes: true,
          }),
          GestureRecognizer.createFromOptions(vision, {
            baseOptions: { modelAssetPath: GESTURE_MODEL },
            runningMode: 'VIDEO',
            numHands: 2,
          }),
        ]);
        if (cancelled) return;
        faceLandmarkerRef.current = face;
        gestureRecognizerRef.current = gesture;
        loadedRef.current = true;
        setModelsLoaded(true);
      } catch (e) {
        console.warn('[useInterviewFaceAnalysis] Failed to load models:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Analysis loop – runs when models are loaded so detection actually starts
  useEffect(() => {
    if (!enabled || !modelsLoaded || !videoRef.current) return;

    const video = videoRef.current;
    const face = faceLandmarkerRef.current;
    const gesture = gestureRecognizerRef.current;
    if (!face || !gesture) return;

    const tick = () => {
      if (video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const ts = performance.now();

      try {
        let faceResult: FaceLandmarkerResult | null = null;
        let gestureResult: GestureRecognizerResult | null = null;
        try {
          faceResult = face.detectForVideo(video, ts);
          gestureResult = gesture.recognizeForVideo(video, ts);
        } catch {
          // ignore single-frame errors
        }

        const blendshapeScores: Record<string, number> = {};
        let faceDetected = false;
        let lipOpenness = 0;
        let emotion: EmotionLabel = 'neutral';

        if (faceResult?.faceLandmarks?.length) {
          faceDetected = true;
          const landmarks = faceResult.faceLandmarks[0];
          if (landmarks?.length) {
            const upper = landmarks[MOUTH_UPPER_LIP];
            const lower = landmarks[MOUTH_LOWER_LIP];
            if (upper && lower) {
              const d = distance(upper, lower);
              lipOpenness = Math.min(1, d * 8);
            }
          }
          if (faceResult.faceBlendshapes?.length) {
            for (const c of faceResult.faceBlendshapes) {
              for (const cat of c.categories) {
                blendshapeScores[cat.categoryName] = cat.score;
              }
            }
            emotion = emotionFromBlendshapes(blendshapeScores);
            const mouthOpen = blendshapeScores['mouthOpen'];
            if (mouthOpen != null) lipOpenness = Math.max(lipOpenness, mouthOpen);
          }
        }

        let waveDetected = false;
        let gestureName: string | null = null;
        if (gestureResult?.gestures?.length) {
          for (const handGestures of gestureResult.gestures) {
            const top = handGestures.find((g) => g.score > 0.5);
            if (top) {
              gestureName = top.categoryName;
              if (top.categoryName === 'Open_Palm' || top.categoryName === 'ILoveYou') {
                waveDetected = true;
              }
            }
          }
        }

        if (waveDetected && Date.now() - lastWaveAtRef.current > 2000) {
          lastWaveAtRef.current = Date.now();
          onWaveDetectedStable.current?.();
        }

        setState({
          faceDetected,
          lipOpenness,
          emotion,
          waveDetected,
          gestureName,
          blendshapeScores,
        });
      } catch (_) {
        // ignore
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [enabled, modelsLoaded, intervalMs, videoRef]);

  // Reset when disabled
  useEffect(() => {
    if (!enabled) setState(DEFAULT_STATE);
  }, [enabled]);

  return state;
}
