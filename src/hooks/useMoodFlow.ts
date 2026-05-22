'use client';
import { useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useSpeechRecognition } from './useSpeechRecognition';
import type { MoodObject } from '@/lib/groq';
import type { SpotifyTrack } from '@/lib/spotify';

export function useMoodFlow() {
  const {
    accessToken,
    setListeningState,
    setCurrentMood,
    setPlaylistName,
    setQueue,
    setError,
    conversation,
    addConversationEntry,
  } = useAppStore();

  const { startListening, isSupported } = useSpeechRecognition();

  const runPipeline = useCallback(async (userInput: string) => {
    try {
      setListeningState('processing');

      // Add user message to conversation
      addConversationEntry({
        id: crypto.randomUUID(),
        role: 'user',
        content: userInput,
        timestamp: Date.now(),
      });

      // Build conversation history for context
      const history = conversation.slice(-6).map(e => ({
        role: e.role,
        content: e.content,
      }));

      // 1. Extract mood with Groq
      const moodRes = await fetch('/api/ai/mood-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: userInput, history }),
      });
      if (!moodRes.ok) throw new Error('Mood analysis failed');
      const { mood }: { mood: MoodObject } = await moodRes.json();
      setCurrentMood(mood);

      // 2. Search Spotify
      const searchRes = await fetch('/api/spotify/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood }),
      });
      if (!searchRes.ok) {
        const errData = await searchRes.json().catch(() => ({}));
        throw new Error(`Spotify search failed: ${errData.error ?? searchRes.status}`);
      }
      const { tracks, playlistName }: { tracks: SpotifyTrack[]; playlistName: string } =
        await searchRes.json();
      console.log('[MoodFlow] tracks received:', tracks.length, tracks.map(t => t.name).slice(0, 3));
      setQueue(tracks);
      setPlaylistName(playlistName);

      // 3. Queue & Play
      const { deviceId } = useAppStore.getState();
      console.log('[MoodFlow] deviceId:', deviceId, '| tracks.length:', tracks.length);

      if (tracks.length > 0) {
        // Transfer playback to the web player first (ensures our SDK device is active)
        if (deviceId) {
          await fetch('/api/spotify/playback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'transfer', deviceId }),
          }).catch(() => null); // non-fatal
        }

        // Small delay so the transfer settles before queueing
        await new Promise(r => setTimeout(r, 400));

        const playRes = await fetch('/api/spotify/playback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'queue',
            deviceId: deviceId ?? undefined,
            trackUris: tracks.map(t => t.uri),
          }),
        });

        if (!playRes.ok) {
          const errData = await playRes.json().catch(() => ({}));
          const msg = errData.error ?? `Playback failed (${playRes.status})`;
          console.error('[MoodFlow] Playback error:', msg, errData);
          setError(`🎵 Playback error: ${msg}`);
          // Don't throw — let conversation update still happen
        }
      }

      // 4. Add AI reply to conversation
      const aiMessage = `Playing **${playlistName}** — ${mood.follow_up_context}`;
      addConversationEntry({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: aiMessage,
        timestamp: Date.now(),
        mood,
        tracks: tracks.slice(0, 5),
      });

      setListeningState('playing');
    } catch (err) {
      console.error('[MoodFlow]', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setListeningState('idle');
    }
  }, [
    accessToken, conversation,
    setListeningState, setCurrentMood, setPlaylistName,
    setQueue, setError, addConversationEntry,
  ]);

  const startVoiceSession = useCallback(async () => {
    // Prevent double-trigger
    const { listeningState } = useAppStore.getState();
    if (listeningState === 'listening' || listeningState === 'processing') return;

    setError(null);
    try {
      const transcript = await startListening();
      if (transcript.trim()) {
        await runPipeline(transcript.trim());
      } else {
        setListeningState('idle');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not hear you';
      // "aborted" is non-fatal — user just needs to try again
      if (msg.includes('aborted') || msg.includes('no-speech')) {
        setListeningState('idle');
      } else {
        setError(msg);
        setListeningState('idle');
      }
    }
  }, [startListening, runPipeline, setError, setListeningState]);

  return { startVoiceSession, runPipeline, isSupported };
}
