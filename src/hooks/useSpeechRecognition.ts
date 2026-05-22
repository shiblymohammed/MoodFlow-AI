'use client';
import { useCallback, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';



export function useSpeechRecognition() {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { setTranscript, setListeningState } = useAppStore();

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!isSupported) {
        reject(new Error('Speech recognition not supported in this browser.'));
        return;
      }

      const SpeechRecognitionAPI =
        window.SpeechRecognition ?? window.webkitSpeechRecognition;

      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognitionRef.current = recognition;
      setListeningState('listening');

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const last = event.results[event.results.length - 1];
        const transcript = last[0].transcript;
        setTranscript(transcript);
        if (last.isFinal) {
          resolve(transcript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setListeningState('idle');
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      recognition.onend = () => {
        if (recognitionRef.current === recognition) {
          setListeningState('processing');
        }
      };

      recognition.start();
    });
  }, [isSupported, setTranscript, setListeningState]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  return { startListening, stopListening, isSupported };
}
