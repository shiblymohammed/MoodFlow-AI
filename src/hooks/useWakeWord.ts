'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';

const WS_URL = 'ws://127.0.0.1:8765';
const RECONNECT_DELAY_MS = 3000;

interface EmotionFeatures {
  emotion: string;
  confidence: number;
  pitch_hz: number;
  energy_rms: number;
}

interface WakeWordEvent {
  type: 'WAKE_WORD_DETECTED';
  model: string;
  score: number;
  timestamp: number;
  emotion?: EmotionFeatures;
}

/**
 * Connects to the Python OpenWakeWord WebSocket sidecar.
 * Uses a stable ref for the onDetected callback to avoid reconnection loops.
 */
export function useWakeWord(onDetected: (emotion?: EmotionFeatures) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(true);
  // Store callback in ref so connect() never needs to re-run when it changes
  const onDetectedRef = useRef(onDetected);
  const { setListeningState } = useAppStore();

  // Keep ref in sync without triggering re-renders
  useEffect(() => {
    onDetectedRef.current = onDetected;
  });

  const sendCommand = useCallback((type: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type }));
    }
  }, []);

  const pauseMic = useCallback(() => sendCommand('PAUSE_MIC'), [sendCommand]);
  const resumeMic = useCallback(() => sendCommand('RESUME_MIC'), [sendCommand]);

  // connect is stable — no deps that change
  const connectRef = useRef<(() => void) | undefined>(undefined);
  connectRef.current = () => {
    if (!activeRef.current) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WakeWord] Connected to Python sidecar');
        setListeningState('wake_word');
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as WakeWordEvent;
          if (data.type === 'WAKE_WORD_DETECTED') {
            console.log(`[WakeWord] Detected! model=${data.model} score=${data.score} emotion=${data.emotion?.emotion}`);
            onDetectedRef.current(data.emotion);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        console.log('[WakeWord] Disconnected — retrying in 3s…');
        if (activeRef.current) {
          reconnectTimerRef.current = setTimeout(() => connectRef.current?.(), RECONNECT_DELAY_MS);
        }
      };

      ws.onerror = () => ws.close();
    } catch {
      if (activeRef.current) {
        reconnectTimerRef.current = setTimeout(() => connectRef.current?.(), RECONNECT_DELAY_MS);
      }
    }
  };

  // Only run once on mount
  useEffect(() => {
    activeRef.current = true;
    connectRef.current?.();

    return () => {
      activeRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, []); // empty deps — connect once, never re-run

  const isConnected = wsRef.current?.readyState === WebSocket.OPEN;
  return { isConnected, pauseMic, resumeMic };
}
