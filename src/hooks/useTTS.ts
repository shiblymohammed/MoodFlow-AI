'use client';
import { useCallback, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

/**
 * Browser SpeechSynthesis TTS hook.
 * Uses ml-IN voice for Malayalam, en-US for English.
 * Cancels current speech on stopSpeaking() (called before each voice session).
 */
export function useTTS() {
  const isSpeakingRef = useRef(false);

  const speak = useCallback((text: string) => {
    const { ttsEnabled, language } = useAppStore.getState();
    if (!ttsEnabled) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    isSpeakingRef.current = true;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang    = language === 'ml' ? 'ml-IN' : 'en-US';
    utterance.rate    = 0.92;
    utterance.pitch   = 1.0;
    utterance.volume  = 0.85;

    utterance.onend = () => { isSpeakingRef.current = false; };
    utterance.onerror = () => { isSpeakingRef.current = false; };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false;
    }
  }, []);

  return { speak, stopSpeaking, isSpeaking: isSpeakingRef };
}
