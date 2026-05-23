import { create } from 'zustand';
import type { SpotifyTrack } from '@/lib/spotify';
import type { MoodObject } from '@/lib/groq';

export interface SpotifyAudioFeatures {
  id: string;
  tempo: number;           // BPM
  valence: number;         // 0–1 happiness
  energy: number;          // 0–1
  danceability: number;    // 0–1
  acousticness: number;    // 0–1
  instrumentalness: number;
  speechiness: number;
  loudness: number;        // dB
  key: number;             // 0–11 (C=0)
  mode: number;            // 0=minor, 1=major
  time_signature: number;
  duration_ms: number;
}

export type ListeningState = 'idle' | 'wake_word' | 'listening' | 'processing' | 'playing';

export interface ConversationEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  mood?: MoodObject;
  tracks?: SpotifyTrack[];
}

export interface PlayedEntry {
  id: string;
  track: SpotifyTrack;
  playedAt: number;           // Date.now()
  mood: MoodObject | null;    // mood active when this track played
  playlistName: string;
}

export interface MoodEntry {
  id: string;
  mood: MoodObject;
  playlistName: string;
  detectedAt: number;         // Date.now()
  query: string;              // user input that triggered it
}

export interface AppState {
  // Auth
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;

  // Playback
  deviceId: string | null;
  setDeviceId: (id: string | null) => void;
  currentTrack: SpotifyTrack | null;
  setCurrentTrack: (track: SpotifyTrack | null) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  volume: number;
  setVolume: (vol: number) => void;
  queue: SpotifyTrack[];
  setQueue: (tracks: SpotifyTrack[]) => void;

  // Voice UI
  listeningState: ListeningState;
  setListeningState: (state: ListeningState) => void;
  transcript: string;
  setTranscript: (text: string) => void;
  amplitude: number;
  setAmplitude: (amp: number) => void;

  // AI / Mood
  currentMood: MoodObject | null;
  setCurrentMood: (mood: MoodObject | null) => void;
  playlistName: string;
  setPlaylistName: (name: string) => void;
  detectedEmotion: { emotion: string; confidence: number; pitch_hz: number; energy_rms: number } | null;
  setDetectedEmotion: (e: { emotion: string; confidence: number; pitch_hz: number; energy_rms: number } | null) => void;
  playbackPositionMs: number;
  setPlaybackPositionMs: (ms: number) => void;

  // Conversation
  conversation: ConversationEntry[];
  addConversationEntry: (entry: ConversationEntry) => void;
  clearConversation: () => void;

  // Error
  error: string | null;
  setError: (err: string | null) => void;

  // Language
  language: 'en' | 'ml';
  setLanguage: (lang: 'en' | 'ml') => void;

  // Settings
  wakeWordThreshold: number;
  setWakeWordThreshold: (v: number) => void;
  ttsEnabled: boolean;
  setTtsEnabled: (v: boolean) => void;

  // Player modes
  shuffle: boolean;
  setShuffle: (v: boolean) => void;
  repeatMode: 'off' | 'track' | 'context';
  setRepeatMode: (v: 'off' | 'track' | 'context') => void;

  // Audio intelligence
  audioFeatures: SpotifyAudioFeatures | null;
  setAudioFeatures: (f: SpotifyAudioFeatures | null) => void;
  dominantColor: string | null;
  setDominantColor: (c: string | null) => void;

  // History
  songHistory: PlayedEntry[];
  addToSongHistory: (entry: PlayedEntry) => void;
  clearSongHistory: () => void;
  moodHistory: MoodEntry[];
  addToMoodHistory: (entry: MoodEntry) => void;
  clearMoodHistory: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  accessToken: null,
  setAccessToken: (token) => set({ accessToken: token }),

  // Playback
  deviceId: null,
  setDeviceId: (id) => set({ deviceId: id }),
  currentTrack: null,
  setCurrentTrack: (track) => set({ currentTrack: track }),
  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  volume: 70,
  setVolume: (vol) => set({ volume: vol }),
  queue: [],
  setQueue: (tracks) => set({ queue: tracks }),

  // Voice UI
  listeningState: 'idle',
  setListeningState: (state) => set({ listeningState: state }),
  transcript: '',
  setTranscript: (text) => set({ transcript: text }),
  amplitude: 0,
  setAmplitude: (amp) => set({ amplitude: amp }),

  // AI / Mood
  currentMood: null,
  setCurrentMood: (mood) => set({ currentMood: mood }),
  playlistName: '',
  setPlaylistName: (name) => set({ playlistName: name }),
  detectedEmotion: null,
  setDetectedEmotion: (e) => set({ detectedEmotion: e }),
  playbackPositionMs: 0,
  setPlaybackPositionMs: (ms) => set({ playbackPositionMs: ms }),

  // Conversation
  conversation: [],
  addConversationEntry: (entry) =>
    set((state) => ({
      conversation: [...state.conversation, entry],
    })),
  clearConversation: () => set({ conversation: [] }),

  // Error
  error: null,
  setError: (err) => set({ error: err }),

  // Language
  language: 'en',
  setLanguage: (lang) => set({ language: lang }),

  // Settings
  wakeWordThreshold: 0.5,
  setWakeWordThreshold: (v) => set({ wakeWordThreshold: v }),
  ttsEnabled: true,
  setTtsEnabled: (v) => set({ ttsEnabled: v }),

  // Player modes
  shuffle: false,
  setShuffle: (v) => set({ shuffle: v }),
  repeatMode: 'off',
  setRepeatMode: (v) => set({ repeatMode: v }),

  // Audio intelligence
  audioFeatures: null,
  setAudioFeatures: (f) => set({ audioFeatures: f }),
  dominantColor: null,
  setDominantColor: (c) => set({ dominantColor: c }),

  // History
  songHistory: [],
  addToSongHistory: (entry) =>
    set((state) => ({ songHistory: [entry, ...state.songHistory].slice(0, 100) })),
  clearSongHistory: () => set({ songHistory: [] }),
  moodHistory: [],
  addToMoodHistory: (entry) =>
    set((state) => ({ moodHistory: [entry, ...state.moodHistory].slice(0, 50) })),
  clearMoodHistory: () => set({ moodHistory: [] }),
}));
