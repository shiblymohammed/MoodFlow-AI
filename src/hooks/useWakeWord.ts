'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

// Local dev → Python on your PC.  Production → VPS over SSL.
const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? 'ws://127.0.0.1:8765';

const RECONNECT_DELAY_MS = 3000;
// PCM chunk size sent to VPS (matches openWakeWord's expected frame size)
const CHUNK_SAMPLES = 2048;   // must be power-of-2 for createScriptProcessor (≈128ms @ 16kHz)
const SAMPLE_RATE   = 16000;

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
 * Connects to the wakeword WebSocket server.
 *
 * LOCAL DEV (ws://127.0.0.1:8765):
 *   Python captures mic via pyaudio — no audio streaming needed.
 *
 * PRODUCTION (wss://ws.yourdomain.com):
 *   Browser captures mic via getUserMedia, streams raw PCM Int16 chunks
 *   to the VPS, which runs openWakeWord on the received audio.
 */
export function useWakeWord(onDetected: (emotion?: EmotionFeatures) => void) {
  const wsRef           = useRef<WebSocket | null>(null);
  const reconnectRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef       = useRef(true);
  const onDetectedRef   = useRef(onDetected);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef    = useRef<ScriptProcessorNode | null>(null);
  const streamRef       = useRef<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const { setListeningState, wakeWordThreshold } = useAppStore();

  // Keep callback ref in sync
  useEffect(() => { onDetectedRef.current = onDetected; });

  // Send new threshold whenever it changes
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SET_THRESHOLD', value: wakeWordThreshold }));
    }
  }, [wakeWordThreshold]);

  const sendCommand = useCallback((type: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type }));
    }
  }, []);

  const pauseMic  = useCallback(() => sendCommand('PAUSE_MIC'),  [sendCommand]);
  const resumeMic = useCallback(() => sendCommand('RESUME_MIC'), [sendCommand]);

  // ── Audio streaming (production VPS mode only) ──────────────────────────
  const stopAudioStream = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startAudioStream = useCallback(async (ws: WebSocket) => {
    // Only stream audio in production (VPS has no mic of its own)
    if (window.location.protocol !== 'https:') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: SAMPLE_RATE, channelCount: 1, echoCancellation: true },
      });
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioContextRef.current = ctx;

      const source    = ctx.createMediaStreamSource(stream);
      // ScriptProcessor is deprecated but still the most compatible way
      // to get raw PCM chunks without an AudioWorklet module file
      // Buffer size MUST be a power of 2 (256–16384); 2048 ≈ 128ms @ 16kHz
      const processor = ctx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const float32 = e.inputBuffer.getChannelData(0);
        // Convert Float32 → Int16 PCM (what openWakeWord expects)
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
        }
        ws.send(int16.buffer);
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      console.log('[WakeWord] 🎤 Audio streaming started → VPS');
    } catch (err) {
      console.warn('[WakeWord] Mic access denied — wake word disabled:', err);
    }
  }, []);

  // ── WebSocket connection ────────────────────────────────────────────────
  const connectRef = useRef<(() => void) | undefined>(undefined);
  connectRef.current = () => {
    if (!activeRef.current) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WakeWord] Connected →', WS_URL);
        setIsConnected(true);
        setListeningState('wake_word');
        // In production: stream browser mic to VPS
        startAudioStream(ws);
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as WakeWordEvent;
          if (data.type === 'WAKE_WORD_DETECTED') {
            console.log(`[WakeWord] 🔔 Detected! model=${data.model} score=${data.score} emotion=${data.emotion?.emotion ?? 'n/a'}`);
            onDetectedRef.current(data.emotion);
          }
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        wsRef.current = null;
        setIsConnected(false);
        stopAudioStream();
        console.log('[WakeWord] Disconnected — retrying in 3s…');
        if (activeRef.current) {
          reconnectRef.current = setTimeout(() => connectRef.current?.(), RECONNECT_DELAY_MS);
        }
      };

      ws.onerror = () => ws.close();
    } catch {
      if (activeRef.current) {
        reconnectRef.current = setTimeout(() => connectRef.current?.(), RECONNECT_DELAY_MS);
      }
    }
  };

  useEffect(() => {
    activeRef.current = true;
    connectRef.current?.();
    return () => {
      activeRef.current = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      stopAudioStream();
      wsRef.current?.close();
    };
  }, [stopAudioStream]);

  return { isConnected, pauseMic, resumeMic };
}
