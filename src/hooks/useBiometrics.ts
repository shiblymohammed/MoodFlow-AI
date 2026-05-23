'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';

export type BiometricState = 'idle' | 'connecting' | 'connected' | 'unsupported' | 'error';

export interface BiometricData {
  bpm: number;
  mood: string;
  moodQuery: string;
  emoji: string;
}

/** Maps heart rate BPM → mood suggestion */
function bpmToMood(bpm: number): Omit<BiometricData, 'bpm'> {
  if (bpm < 60)       return { mood: 'Resting',  moodQuery: 'calm peaceful ambient sleep music',          emoji: '😴' };
  if (bpm < 75)       return { mood: 'Calm',     moodQuery: 'chill lofi relaxed focus background music',  emoji: '😌' };
  if (bpm < 90)       return { mood: 'Normal',   moodQuery: 'feel good upbeat pop indie songs',            emoji: '🙂' };
  if (bpm < 110)      return { mood: 'Active',   moodQuery: 'energetic upbeat motivational workout music', emoji: '😤' };
  if (bpm < 130)      return { mood: 'Pumped',   moodQuery: 'high energy gym beast mode intense music',    emoji: '💪' };
  return               { mood: 'Max',     moodQuery: 'ultra high energy aggressive hype workout',    emoji: '🔥' };
}

/**
 * Web Bluetooth heart rate monitor hook.
 * Works in Chrome on Android/desktop with a paired BLE heart rate device.
 * Gracefully degrades when Bluetooth is unavailable.
 */
export function useBiometrics(onAutoMood?: (query: string) => void) {
  const [state, setState]   = useState<BiometricState>('idle');
  const [data, setData]     = useState<BiometricData | null>(null);
  const [prevBpm, setPrevBpm] = useState<number | null>(null);
  const deviceRef           = useRef<BluetoothDevice | null>(null);
  const charRef             = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;

  const handleHRMeasurement = useCallback((event: Event) => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value) return;

    // Byte 0: flags. Bit 0 = 1 → UINT16 format, 0 → UINT8
    const flags = value.getUint8(0);
    const bpm   = flags & 0x01 ? value.getUint16(1, true) : value.getUint8(1);

    const moodInfo = bpmToMood(bpm);
    setData({ bpm, ...moodInfo });

    // Auto-suggest new mood if BPM shifts category (±20 bpm from last)
    if (onAutoMood && prevBpm !== null && Math.abs(bpm - prevBpm) >= 20) {
      onAutoMood(moodInfo.moodQuery);
    }
    setPrevBpm(bpm);
  }, [onAutoMood, prevBpm]);

  const connect = useCallback(async () => {
    if (!isSupported) { setState('unsupported'); return; }
    setState('connecting');

    try {
      const device = await (navigator as Navigator & { bluetooth: Bluetooth }).bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
      });
      deviceRef.current = device;

      device.addEventListener('gattserverdisconnected', () => {
        setState('idle');
        setData(null);
        charRef.current = null;
      });

      const server  = await device.gatt!.connect();
      const service = await server.getPrimaryService('heart_rate');
      const char    = await service.getCharacteristic('heart_rate_measurement');
      charRef.current = char;

      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', handleHRMeasurement);

      setState('connected');
    } catch (err) {
      console.warn('[Biometrics]', err);
      setState(err instanceof Error && err.name === 'NotFoundError' ? 'idle' : 'error');
    }
  }, [isSupported, handleHRMeasurement]);

  const disconnect = useCallback(async () => {
    charRef.current?.removeEventListener('characteristicvaluechanged', handleHRMeasurement);
    deviceRef.current?.gatt?.disconnect();
    setState('idle');
    setData(null);
  }, [handleHRMeasurement]);

  // Cleanup on unmount
  useEffect(() => () => { disconnect(); }, [disconnect]);

  return { state, data, isSupported, connect, disconnect };
}
