'use client';
import { useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useContextSignals } from './useContextSignals';
import { useTTS } from './useTTS';
import { classifyIntent, intentLabel } from '@/lib/intent-classifier';
import type { MoodObject } from '@/lib/groq';
import type { SpotifyTrack } from '@/lib/spotify';

export function useMoodFlow() {
  const {
    setListeningState,
    setCurrentMood,
    setPlaylistName,
    setQueue,
    setError,
    conversation,
    addConversationEntry,
  } = useAppStore();

  const { startListening, isSupported } = useSpeechRecognition();
  const { contextString, timeHint } = useContextSignals();
  const { speak, stopSpeaking } = useTTS();

  // ── Playback control (next / pause / play / previous / stop / volume) ────
  const handlePlaybackControl = useCallback(async (
    action: string,
    userInput: string,
  ) => {
    setListeningState('processing');

    // Echo user command in conversation
    addConversationEntry({
      id: crypto.randomUUID(),
      role: 'user',
      content: userInput,
      timestamp: Date.now(),
    });

    const { deviceId } = useAppStore.getState();

    try {
      // Map 'stop' → 'pause' for Spotify API (stop = pause for SDK player)
      const spotifyAction = action === 'stop' ? 'pause' : action;

      const res = await fetch('/api/spotify/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: spotifyAction, deviceId }),
      });

      const actionEmoji: Record<string, string> = {
        next: '⏭', pause: '⏸', play: '▶️', previous: '⏮', stop: '⏹',
      };

      if (res.ok) {
        const emoji = actionEmoji[action] ?? '✓';
        addConversationEntry({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `${emoji} Got it!`,
          timestamp: Date.now(),
        });
        // After next/previous, let Spotify update — stay in 'playing' state
        setListeningState(action === 'pause' || action === 'stop' ? 'idle' : 'playing');
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Playback control failed (${res.status})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Playback control failed');
      setListeningState('idle');
    }
  }, [setListeningState, setError, addConversationEntry]);

  // ── Volume control ─────────────────────────────────────────────────────────
  const handleVolume = useCallback(async (level: 'up' | 'down' | number, userInput: string) => {
    addConversationEntry({
      id: crypto.randomUUID(), role: 'user', content: userInput, timestamp: Date.now(),
    });

    const { volume, deviceId } = useAppStore.getState();
    let newVolume: number;
    if (level === 'up')        newVolume = Math.min(volume + 15, 100);
    else if (level === 'down') newVolume = Math.max(volume - 15, 0);
    else                       newVolume = level;

    await fetch('/api/spotify/playback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'volume', volume: newVolume, deviceId }),
    });

    addConversationEntry({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `🔊 Volume set to ${newVolume}%`,
      timestamp: Date.now(),
    });
  }, [addConversationEntry]);

  // ── Handle specific song request ────────────────────────────────────────────────
  const handleSpecificSong = useCallback(async (query: string, userInput: string) => {
    setListeningState('processing');
    addConversationEntry({
      id: crypto.randomUUID(), role: 'user', content: userInput, timestamp: Date.now(),
    });

    try {
      // Direct Spotify search — no Groq needed
      const res = await fetch(`/api/spotify/search-track?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Track search failed');

      const { track }: { track: SpotifyTrack | null } = await res.json();
      if (!track) {
        addConversationEntry({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `🔍 Couldn’t find “${query}” on Spotify. Try a different name?`,
          timestamp: Date.now(),
        });
        setListeningState('idle');
        return;
      }

      // Play just this one track
      setQueue([track]);
      const { deviceId } = useAppStore.getState();
      const playRes = await fetch('/api/spotify/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'queue',
          deviceId: deviceId ?? undefined,
          trackUris: [track.uri],
        }),
      });

      if (!playRes.ok) {
        const err = await playRes.json().catch(() => ({}));
        throw new Error(err.error ?? 'Playback failed');
      }

      addConversationEntry({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `▶️ Now playing **${track.name}** by ${track.artists.map(a => a.name).join(', ')}`,
        timestamp: Date.now(),
        tracks: [track],
      });
      speak(`Now playing ${track.name} by ${track.artists.map(a => a.name).join(', ')}`);
      setListeningState('playing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not play that song');
      setListeningState('idle');
    }
  }, [setListeningState, setError, setQueue, addConversationEntry]);

  // ── Full mood pipeline (search + play) ────────────────────────────────────
  const runPipeline = useCallback(async (userInput: string) => {
    try {
      setListeningState('processing');

      addConversationEntry({
        id: crypto.randomUUID(),
        role: 'user',
        content: userInput,
        timestamp: Date.now(),
      });

      const history = conversation.slice(-6).map(e => ({
        role: e.role,
        content: e.content,
      }));

      // 1. Extract mood with Groq — includes time/weather/device/emotion context
      const contextPrefix = [contextString, timeHint].filter(Boolean).join(' ');
      const moodRes = await fetch('/api/ai/mood-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: userInput, history, contextPrefix }),
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
        if (deviceId) {
          await fetch('/api/spotify/playback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'transfer', deviceId }),
          }).catch(() => null);
        }

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
        }
      }

      // 4. Add AI reply
      const aiMessage = `Playing **${playlistName}** — ${mood.follow_up_context}`;
      addConversationEntry({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: aiMessage,
        timestamp: Date.now(),
        mood,
        tracks: tracks.slice(0, 5),
      });

      // Speak the playlist name via TTS
      speak(`Playing ${playlistName}`);

      setListeningState('playing');
    } catch (err) {
      console.error('[MoodFlow]', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setListeningState('idle');
    }
  }, [
    conversation, contextString, timeHint,
    setListeningState, setCurrentMood, setPlaylistName,
    setQueue, setError, addConversationEntry,
  ]);

  // ── More like this ─────────────────────────────────────────────────────────
  const handleMoreLikeThis = useCallback(async (userInput: string) => {
    const { currentTrack, currentMood } = useAppStore.getState();
    if (!currentTrack && !currentMood) {
      addConversationEntry({
        id: crypto.randomUUID(), role: 'assistant',
        content: 'Nothing is playing yet — tell me a mood first!',
        timestamp: Date.now(),
      });
      return;
    }
    // Re-run pipeline with context hinting at the current track
    const hint = currentTrack
      ? `More songs similar to "${currentTrack.name}" by ${currentTrack.artists[0]?.name ?? ''}. Same vibe and energy.`
      : `More songs like the current playlist: ${currentMood?.query_string}.`;
    await runPipeline(hint);
  }, [addConversationEntry, runPipeline]);

  // ── Vibe explain ───────────────────────────────────────────────────────────
  const handleVibeExplain = useCallback((userInput: string) => {
    const { currentMood, currentTrack, playlistName } = useAppStore.getState();
    addConversationEntry({
      id: crypto.randomUUID(), role: 'user', content: userInput, timestamp: Date.now(),
    });
    if (!currentMood) {
      addConversationEntry({
        id: crypto.randomUUID(), role: 'assistant',
        content: '🎵 No playlist active yet. Tell me a mood and I’ll explain the vibe!',
        timestamp: Date.now(),
      });
      return;
    }
    const explanation =
      `🎵 **${playlistName}**\n` +
      `**Mood:** ${currentMood.mood} | **Energy:** ${Math.round(currentMood.energy * 100)}% | **Tempo:** ${currentMood.tempo}\n` +
      `**Genres:** ${currentMood.genres.join(', ')}\n` +
      `${currentMood.follow_up_context}`;
    addConversationEntry({
      id: crypto.randomUUID(), role: 'assistant', content: explanation, timestamp: Date.now(),
    });
    speak(currentMood.follow_up_context);
  }, [addConversationEntry, speak]);

  // ── Main entry point — classify intent then route ─────────────────────────
  const startVoiceSession = useCallback(async () => {
    const { listeningState } = useAppStore.getState();
    if (listeningState === 'listening' || listeningState === 'processing') return;

    stopSpeaking(); // Cancel any active TTS before listening
    setError(null);
    try {
      const transcript = await startListening();
      const text = transcript.trim();
      if (!text) { setListeningState('idle'); return; }

      const intent = classifyIntent(text);
      console.log('[MoodFlow] Intent:', intentLabel(intent), '←', text);

      switch (intent.type) {
        case 'playback_control':
          await handlePlaybackControl(intent.action, text);
          break;

        case 'volume':
          await handleVolume(intent.level, text);
          break;

        case 'specific_song':
          await handleSpecificSong(intent.query, text);
          break;

        case 'more_like_this':
          await handleMoreLikeThis(text);
          break;

        case 'vibe_explain':
          handleVibeExplain(text);
          break;

        case 'mood_change':
          await runPipeline(`Change the mood. ${intent.hint}`);
          break;

        case 'mood_request':
        default:
          await runPipeline(text);
          break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not hear you';
      if (msg.includes('aborted') || msg.includes('no-speech')) {
        setListeningState('idle');
      } else {
        setError(msg);
        setListeningState('idle');
      }
    }
  }, [startListening, runPipeline, handlePlaybackControl, handleVolume, handleSpecificSong,
      handleMoreLikeThis, handleVibeExplain, stopSpeaking, setError, setListeningState]);

  return { startVoiceSession, runPipeline, isSupported };
}
