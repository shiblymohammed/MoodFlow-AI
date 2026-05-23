'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

export type FaceEmotion =
  | 'happy' | 'sad' | 'angry' | 'fearful'
  | 'disgusted' | 'surprised' | 'neutral';

export interface FaceDetectionResult {
  dominant: FaceEmotion;
  confidence: number;
  expressions: Record<FaceEmotion, number>;
}

const MODEL_URL = '/models';

/** Maps face-api emotions → MoodFlow mood query strings */
export const FACE_MOOD_MAP: Record<FaceEmotion, string> = {
  happy:     'euphoric upbeat happy songs',
  sad:       'melancholic sad emotional songs',
  angry:     'aggressive intense high energy music',
  fearful:   'calming soothing anxiety relief music',
  disgusted: 'dark moody alternative music',
  surprised: 'energetic surprise party music',
  neutral:   'ambient chill background music',
};

export const FACE_EMOJI: Record<FaceEmotion, string> = {
  happy: '😄', sad: '😢', angry: '😠',
  fearful: '😨', disgusted: '🤢', surprised: '😲', neutral: '😐',
};

/**
 * Loads face-api.js models dynamically (client-only).
 * Uses tiny_face_detector + face_expression for minimal bundle size (~500KB).
 */
export function useFaceDetection() {
  const videoRef     = useRef<HTMLVideoElement | null>(null);
  const canvasRef    = useRef<HTMLCanvasElement | null>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const faceapiRef   = useRef<typeof import('@vladmandic/face-api') | null>(null);
  const modelsLoaded = useRef(false);

  const [isActive, setIsActive]         = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [result, setResult]             = useState<FaceDetectionResult | null>(null);
  const [error, setError]               = useState<string | null>(null);

  /** Dynamically load face-api + models (only once) */
  const loadModels = useCallback(async () => {
    if (modelsLoaded.current) return;
    const faceapi = await import('@vladmandic/face-api');
    faceapiRef.current = faceapi;

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded.current = true;
  }, []);

  /** Start camera + detection loop */
  const start = useCallback(async () => {
    if (isActive) return;
    setIsLoading(true);
    setError(null);
    try {
      await loadModels();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsActive(true);
      setIsLoading(false);

      // Run detection every 2 seconds
      intervalRef.current = setInterval(async () => {
        const faceapi = faceapiRef.current;
        const video   = videoRef.current;
        if (!faceapi || !video) return;

        try {
          const detection = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

          if (detection) {
            const exprs = detection.expressions as unknown as Record<string, number>;
            // Find dominant emotion
            const dominant = Object.entries(exprs).reduce((a, b) =>
              b[1] > a[1] ? b : a
            );
            setResult({
              dominant: dominant[0] as FaceEmotion,
              confidence: Math.round(dominant[1] * 100),
              expressions: exprs as unknown as Record<FaceEmotion, number>,
            });
          }
        } catch { /* ignore frame errors */ }
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera access denied');
      setIsLoading(false);
    }
  }, [isActive, loadModels]);

  /** Stop camera + clear loop */
  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsActive(false);
    setResult(null);
  }, []);

  // Auto-stop on unmount
  useEffect(() => () => { stop(); }, [stop]);

  return { videoRef, canvasRef, isActive, isLoading, result, error, start, stop };
}
